import agentService from "./agentService";

let contactInstance = null; // Stores the current contact instance
let callbacks = {}; // Callbacks for handling contact events
let pendingTransfers = []; // Tracks pending transfers for warm transfer management

/**
 * Available disposition codes for call outcomes.
 * @type {Array<Object>}
 */
const DISPOSITION_CODES = [
    { id: 'resolved', label: 'Issue Resolved' },
    { id: 'callback', label: 'Callback Required' },
    { id: 'escalated', label: 'Escalated to Supervisor' },
    { id: 'voicemail', label: 'Left Voicemail' },
    { id: 'wrong_number', label: 'Wrong Number' },
    { id: 'no_answer', label: 'No Answer' },
    { id: 'technical_issue', label: 'Technical Issue' },
    { id: 'follow_up', label: 'Follow-up Required' }
];

export default {
    /**
     * Initialize the contact service and set up event listeners.
     * @param {Object} options - Callbacks for contact events.
     */
    initializeContact(options = {}) {
        callbacks = options;

        if (!window.connect) {
            alert("Amazon Connect Streams API not loaded.");
            return;
        }

        window.connect.contact(contact => {
            contactInstance = contact;

            if (contact.getType() === window.connect.ContactType.INBOUND) {
                callbacks.onIncomingCall?.(contact);
            }

            this.setupContactEventListeners(contact);
        });
    },

    /**
     * Sets up event listeners for the provided contact instance.
     * @param {Object} contact - The contact instance to configure.
     */
    setupContactEventListeners(contact) {
        const eventHandlers = {
            onConnecting: "Contact is connecting.",
            onConnected: "Contact connected.",
            onAccepted: "Contact accepted.",
            onMissed: "Contact missed.",
            onEnded: "Contact ended.",
            onError: "Contact error:",
            onPending: "Contact is pending.",
            onDestroy: "Contact destroyed.",
            onRefresh: "Contact refreshed.",
        };

        Object.keys(eventHandlers).forEach(event => {
            const eventName = event.toLowerCase().replace(/^on/, "");
            contact[eventName]?.(() => {
                const logMessage = eventHandlers[event];
                callbacks[event]?.(contact);
            });
        });

        contact.onEnded?.(() => (contactInstance = null));
        contact.onDestroy?.(() => (contactInstance = null));
    },

    /**
     * Get the current contact instance.
     * @returns {Object|null} The current contact instance or null if unavailable.
     */
    getContactInstance() {
        return contactInstance;
    },

    /**
     * Accept an incoming call.
     * @returns {Promise} Resolves when the call is successfully accepted.
     */
    acceptContact() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available to accept."));
        }

        return new Promise((resolve, reject) => {
            const connection = contactInstance.getInitialConnection();
            if (connection?.getType() === window.connect.ConnectionType.INBOUND) {
                connection.accept({
                    success: () => resolve(true),
                    failure: (err) => reject(new Error(`Failed to accept call: ${err}`))
                });
            } else {
                reject(new Error("No inbound connection available to accept."));
            }
        });
    },

    /**
     * Decline or reject an incoming call.
     * @returns {Promise} Resolves when the call is successfully declined.
     */
    declineContact() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available to decline."));
        }

        return new Promise((resolve, reject) => {
            const connection = contactInstance.getInitialConnection();
            if (connection?.getType() === window.connect.ConnectionType.INBOUND) {
                connection.destroy({
                    success: () => resolve(true),
                    failure: (err) => reject(new Error(`Failed to decline call: ${err}`))
                });
            } else {
                reject(new Error("No inbound connection available to decline."));
            }
        });
    },

    /**
     * Close (end) the active contact.
     * @returns {Promise} Resolves when the contact is successfully ended.
     */
    async endContact() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available to end."));
        }

        try {
            await this._destroyAgentConnectionPromise(contactInstance);
            await this._completeContactAndExitACWPromise(contactInstance);
            return true;
        } catch (error) {
            throw new Error(`Failed to end contact: ${error}`);
        }
    },


    /**
     * Put the current active contact on hold.
     * @return {Promise} Resolves if the hold call is successful, rejects otherwise.
     */
    holdCall() {
        return this._handleCallAction("hold", "connected", "Call successfully put on hold.", "Failed to put call on hold.");
    },

    /**
     * Resume the current active contact from the hold state.
     * @return {Promise} Resolves if the resume call is successful, rejects otherwise.
     */
    resumeCall() {
        return this._handleCallAction("resume", "hold", "Call successfully resumed.", "Failed to resume the call.");
    },

    /**
     * Gets all available disposition codes.
     * @returns {Array<Object>} Array of disposition code objects.
     */
    getDispositionCodes() {
        return DISPOSITION_CODES;
    },

    /**
     * Sets a disposition code for the current contact.
     * @param {string} dispositionId - The ID of the disposition code.
     * @param {string} [notes] - Optional notes to add with the disposition.
     * @returns {Promise} Resolves when the disposition is successfully set.
     */
    setDispositionCode(dispositionId, notes = '') {
        if (!this._validateContactInstance()) {
            return Promise.reject("No contact instance available.");
        }

        return new Promise((resolve, reject) => {
            try {
                const attributes = {
                    dispositionCode: dispositionId,
                    dispositionNotes: notes,
                    dispositionTimestamp: new Date().toISOString()
                };

                contactInstance.updateAttributes(attributes, {
                    success: () => {
                        resolve(true);
                    },
                    failure: (error) => {
                        reject(new Error(`Failed to set disposition code: ${error}`));
                    },
                });
            } catch (error) {
                reject(new Error(`Error setting disposition code: ${error}`));
            }
        });
    },
    /**
     * Enters After Call Work (ACW) mode for the current contact.
     * @returns {Promise} Resolves when ACW mode is entered.
     */
    enterAfterCallWork() {
        if (!this._validateContactInstance()) {
            return Promise.reject("No contact instance available.");
        }

        return new Promise((resolve, reject) => {
            try {
                // First, destroy the agent connection to end the call
                this._destroyAgentConnection(contactInstance);

                // The contact will automatically enter ACW state
                resolve(true);
            } catch (error) {
                reject(new Error(`Error entering After Call Work: ${error}`));
            }
        });
    },

    /**
     * Completes After Call Work and sets the agent back to the available state.
     * @param {string} [dispositionId] - Optional disposition code to set before completing ACW.
     * @param {string} [notes] - Optional notes to add with the disposition.
     * @returns {Promise} Resolves when ACW is completed.
     */
    completeAfterCallWork(dispositionId = null, notes = '') {
        if (!this._validateContactInstance()) {
            return Promise.reject("No contact instance available.");
        }

        return new Promise(async (resolve, reject) => {
            try {
                // Set disposition code if provided
                if (dispositionId) {
                    await this.setDispositionCode(dispositionId, notes);
                }

                // Complete the contact
                contactInstance.complete({
                    success: () => {
                        // Exit ACW and set agent back to available
                        this._exitAfterCallWork();
                        resolve(true);
                    },
                    failure: (error) => {
                        reject(new Error(`Failed to complete After Call Work: ${error}`));
                    },
                });
            } catch (error) {
                reject(new Error(`Error completing After Call Work: ${error}`));
            }
        });
    },

    /**
     * Gets the remaining time in After Call Work mode.
     * @returns {number} Seconds remaining in ACW, or -1 if not in ACW.
     */
    getAfterCallWorkRemainingTime() {
        if (!this._validateContactInstance()) {
            return -1;
        }

        const contactState = contactInstance.getState();
        if (contactState.type !== 'afterCallWork') {
            return -1;
        }

        const maxStateTime = contactState.maxStateTime || 0;
        const stateStartTime = contactState.stateStartTime || Date.now();
        const elapsedTime = (Date.now() - stateStartTime) / 1000; // Convert to seconds

        return Math.max(0, maxStateTime - elapsedTime);
    },


    /**
     * Handles asynchronous call actions (e.g., hold, resume).
     * @param {string} action - The action to perform (e.g., hold, resume).
     * @param {string} expectedStatus - The expected connection status to proceed.
     * @param {string} successMsg - Message to return on success.
     * @param {string} errorMsg - Message to include in error on failure.
     * @returns {Promise} Resolves with success message or rejects with error.
     * @private
     */
    _handleCallAction(action, expectedStatus, successMsg, errorMsg) {
        return new Promise((resolve, reject) => {
            if (!this._validateContactInstance()) {
                return reject(new Error("No contact instance available."));
            }

            const connection = contactInstance.getAgentConnection();
            if (!connection) {
                return reject(new Error(`No agent connection available to ${action}.`));
            }

            const currentStatus = connection.getStatus()?.type;
            if (currentStatus !== expectedStatus) {
                return reject(new Error(
                    `Connection is in '${currentStatus}' state, but '${expectedStatus}' is required to ${action}.`
                ));
            }

            connection[action]({
                success: () => resolve(successMsg),
                failure: (err) => reject(new Error(`${errorMsg} Error: ${err}`))
            });
        });
    },

    /**
     * Validates if a contact instance exists.
     * @returns {boolean} True if a valid contact instance exists, false otherwise.
     */
    _validateContactInstance() {
        if (!contactInstance) {
            return false;
        }
        return true;
    },

    /**
     * Destroys the agent connection for a contact.
     * @param {Object} contactInstance - The contact instance.
     * @private
     */
    _destroyAgentConnection(contactInstance) {
        const agentConnection = contactInstance.getAgentConnection();
        if (agentConnection) {
            agentConnection.destroy({
                success: () => {},
                failure: err => {},
            });
        }
    },

    /**
     * Promise-based version of _destroyAgentConnection.
     * @param {Object} contactInstance - The contact instance.
     * @returns {Promise} Resolves when the agent connection is destroyed.
     * @private
     */
    _destroyAgentConnectionPromise(contactInstance) {
        return new Promise((resolve, reject) => {
            const agentConnection = contactInstance.getAgentConnection();
            if (agentConnection) {
                agentConnection.destroy({
                    success: () => resolve(true),
                    failure: (err) => reject(new Error(`Failed to destroy agent connection: ${err}`))
                });
            } else {
                resolve(true); // No agent connection to destroy
            }
        });
    },

    /**
     * Completes the contact and exits After Call Work.
     * @param {Object} contactInstance - The contact instance.
     * @private
     */
    _completeContactAndExitACW(contactInstance) {
        const contactStatus = contactInstance.getStatus();

        contactInstance.complete({
            success: () => {},
            failure: err => {},
        });

        this._exitAfterCallWork();
    },

    /**
     * Promise-based version of _completeContactAndExitACW.
     * @param {Object} contactInstance - The contact instance.
     * @returns {Promise} Resolves when the contact is completed and ACW is exited.
     * @private
     */
    _completeContactAndExitACWPromise(contactInstance) {
        return new Promise((resolve, reject) => {
            contactInstance.complete({
                success: () => {
                    try {
                        this._exitAfterCallWorkPromise()
                            .then(() => resolve(true))
                            .catch(err => reject(err));
                    } catch (error) {
                        reject(new Error(`Failed to exit ACW: ${error}`));
                    }
                },
                failure: (err) => reject(new Error(`Failed to complete contact: ${err}`))
            });
        });
    },

    /**
     * Exits After Call Work mode and sets agent to available.
     * @private
     */
    _exitAfterCallWork() {
        const agentInstance = agentService.getAgentInstance();
        if (!agentInstance) {
            alert("Agent instance not found while attempting to exit AfterCallWork.");
            return;
        }

        const availableState = agentInstance.getAgentStates().find(state => state.type === 'routable');

        agentInstance.setState(availableState, {
            success: () => {},
            failure: err => {},
        });
    },

    /**
     * Promise-based version of _exitAfterCallWork.
     * @returns {Promise} Resolves when the agent is set to available.
     * @private
     */
    _exitAfterCallWorkPromise() {
        return new Promise((resolve, reject) => {
            const agentInstance = agentService.getAgentInstance();
            if (!agentInstance) {
                return reject(new Error("Agent instance not found while attempting to exit AfterCallWork."));
            }

            const availableState = agentInstance.getAgentStates().find(state => state.type === 'routable');
            if (!availableState) {
                return reject(new Error("Available state not found for agent."));
            }

            agentInstance.setState(availableState, {
                success: () => resolve(true),
                failure: (err) => reject(new Error(`Failed to set agent state: ${err}`))
            });
        });
    },

    /**
     * Transfers the current call to a phone number (cold transfer).
     * @param {string} phoneNumber - The phone number to transfer the call to.
     * @returns {Promise} Resolves when the transfer is successful.
     */
    transferToPhoneNumber(phoneNumber) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);
                contactInstance.toggleActiveConnections(endpoint, {
                    success: () => resolve(true),
                    failure: (error) => reject(new Error(`Failed to transfer call: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error transferring call: ${error}`));
            }
        });
    },

    /**
     * Initiates a warm transfer to a phone number.
     * @param {string} phoneNumber - The phone number to transfer to.
     * @returns {Promise} Resolves with the connection ID when the warm transfer is initiated.
     */
    warmTransferToPhoneNumber(phoneNumber) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for warm transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);
                contactInstance.addConnection(endpoint, {
                    success: (connectionId) => {
                        // Track the pending transfer
                        pendingTransfers.push({
                            connectionId,
                            phoneNumber,
                            timestamp: Date.now()
                        });
                        resolve(connectionId);
                    },
                    failure: (error) => reject(new Error(`Failed to initiate warm transfer: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error initiating warm transfer: ${error}`));
            }
        });
    },

    /**
     * Transfers the current call to a queue (cold transfer).
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves when the queue transfer is successful.
     */
    transferToQueue(queueId) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for queue transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                const queueEndpoint = window.connect.Endpoint.byQueueId(queueId);
                contactInstance.toggleActiveConnections(queueEndpoint, {
                    success: () => resolve(true),
                    failure: (error) => reject(new Error(`Failed to transfer to queue: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error transferring to queue: ${error}`));
            }
        });
    },

    /**
     * Initiates a warm transfer to a queue.
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves with the connection ID when the warm queue transfer is initiated.
     */
    warmTransferToQueue(queueId) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for warm queue transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                const queueEndpoint = window.connect.Endpoint.byQueueId(queueId);
                contactInstance.addConnection(queueEndpoint, {
                    success: (connectionId) => {
                        // Track the pending transfer
                        pendingTransfers.push({
                            connectionId,
                            queueId,
                            timestamp: Date.now()
                        });
                        resolve(connectionId);
                    },
                    failure: (error) => reject(new Error(`Failed to initiate warm queue transfer: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error initiating warm queue transfer: ${error}`));
            }
        });
    },

    /**
     * Completes a warm transfer by disconnecting the agent.
     * @param {string} [connectionId] - Optional connection ID to complete specific transfer.
     * @returns {Promise} Resolves when the transfer is completed.
     */
    completeTransfer(connectionId) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available to complete transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                // If connectionId is provided, complete that specific transfer
                if (connectionId) {
                    const connections = contactInstance.getConnections();
                    const targetConnection = connections.find(conn => conn.getConnectionId() === connectionId);
                    
                    if (!targetConnection) {
                        return reject(new Error(`Connection with ID ${connectionId} not found.`));
                    }
                    
                    // Remove from pending transfers
                    pendingTransfers = pendingTransfers.filter(transfer => transfer.connectionId !== connectionId);
                    
                    // Disconnect the agent
                    const agentConnection = contactInstance.getAgentConnection();
                    if (agentConnection) {
                        agentConnection.destroy({
                            success: () => resolve(true),
                            failure: (error) => reject(new Error(`Failed to complete transfer: ${error}`))
                        });
                    } else {
                        resolve(true);
                    }
                } else {
                    // Complete the most recent transfer
                    const agentConnection = contactInstance.getAgentConnection();
                    if (agentConnection) {
                        agentConnection.destroy({
                            success: () => {
                                // Clear pending transfers
                                pendingTransfers = [];
                                resolve(true);
                            },
                            failure: (error) => reject(new Error(`Failed to complete transfer: ${error}`))
                        });
                    } else {
                        // Clear pending transfers
                        pendingTransfers = [];
                        resolve(true);
                    }
                }
            } catch (error) {
                reject(new Error(`Error completing transfer: ${error}`));
            }
        });
    },

    /**
     * Initiates a conference call by adding a third party to the current call.
     * @param {string} phoneNumber - The phone number to add to the conference.
     * @returns {Promise} Resolves with the connection ID when the conference is successfully initiated.
     */
    initiateConference(phoneNumber) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for conference."));
        }

        return new Promise((resolve, reject) => {
            try {
                const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);
                
                contactInstance.addConnection(endpoint, {
                    success: (connectionId) => {
                        // Track the conference participant
                        pendingTransfers.push({
                            connectionId,
                            phoneNumber,
                            isConference: true,
                            timestamp: Date.now()
                        });
                        resolve(connectionId);
                    },
                    failure: (error) => reject(new Error(`Failed to initiate conference: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error initiating conference: ${error}`));
            }
        });
    },

    /**
     * Merges all connections into a conference call.
     * @returns {Promise} Resolves when the conference is successfully merged.
     */
    mergeConnections() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available for merging connections."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Get all connections
                const connections = contactInstance.getConnections();
                if (connections.length < 3) {
                    return reject(new Error("Not enough connections to merge into a conference."));
                }
                
                // Merge all connections
                contactInstance.mergeConnections({
                    success: () => {
                        // Mark all pending transfers as part of a conference
                        pendingTransfers = pendingTransfers.map(transfer => ({
                            ...transfer,
                            isConference: true
                        }));
                        resolve(true);
                    },
                    failure: (error) => reject(new Error(`Failed to merge connections: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error merging connections: ${error}`));
            }
        });
    },

    /**
     * Removes a specific connection from the conference call.
     * @param {string} connectionId - The ID of the connection to remove.
     * @returns {Promise} Resolves when the connection is successfully removed.
     */
    removeFromConference(connectionId) {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No active contact available."));
        }

        return new Promise((resolve, reject) => {
            try {
                const connections = contactInstance.getConnections();
                const connectionToRemove = connections.find(conn => conn.getConnectionId() === connectionId);
                
                if (!connectionToRemove) {
                    return reject(new Error(`Connection with ID ${connectionId} not found.`));
                }
                
                connectionToRemove.destroy({
                    success: () => {
                        // Remove from pending transfers
                        pendingTransfers = pendingTransfers.filter(transfer => transfer.connectionId !== connectionId);
                        resolve(true);
                    },
                    failure: (error) => reject(new Error(`Failed to remove connection: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error removing connection: ${error}`));
            }
        });
    },

    /**
     * Gets all active connections in the current contact.
     * @returns {Promise<Array>} Resolves with an array of connection objects.
     */
    getActiveConnections() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No active contact available."));
        }

        try {
            const connections = contactInstance.getConnections();
            return Promise.resolve(connections.map(conn => ({
                connectionId: conn.getConnectionId(),
                type: conn.getType(),
                state: conn.getState(),
                endpoint: conn.getEndpoint(),
                isInitial: conn === contactInstance.getInitialConnection(),
                isAgent: conn === contactInstance.getAgentConnection()
            })));
        } catch (error) {
            return Promise.reject(new Error(`Error getting active connections: ${error}`));
        }
    },
};