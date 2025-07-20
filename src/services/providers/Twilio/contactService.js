import agentService from "./agentService";

let contactInstance = null; // Stores the current contact/call instance
let callbacks = {}; // Callbacks for handling contact events
let pendingTransfers = []; // Tracks pending transfers for warm transfer management
let activeConnection = null; // Active Twilio Voice connection

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

        if (!window.Twilio || !window.Twilio.Device) {
            return Promise.reject(new Error("Twilio Voice SDK not loaded."));
        }

        // Set up Twilio Device event listeners
        this._setupTwilioDeviceListeners();
        
        return Promise.resolve();
    },

    /**
     * Sets up event listeners for Twilio Device.
     * @private
     */
    _setupTwilioDeviceListeners() {
        const device = window.Twilio.Device;
        
        // Incoming call
        device.on('incoming', connection => {
            contactInstance = connection;
            
            // Set up connection event listeners
            this._setupConnectionEventListeners(connection);
            
            // Notify of incoming call
            callbacks.onIncomingCall?.(connection);
        });
        
        // Ready event
        device.on('ready', () => {
            console.log('Twilio Device is ready for calls');
        });
        
        // Error event
        device.on('error', error => {
            callbacks.onError?.(error);
        });
    },

    /**
     * Sets up event listeners for a Twilio connection.
     * @param {Object} connection - The Twilio connection.
     * @private
     */
    _setupConnectionEventListeners(connection) {
        // Connection accepted
        connection.on('accept', () => {
            callbacks.onConnected?.(connection);
            callbacks.onCallAccepted?.(connection);
        });
        
        // Connection is ringing/connecting
        connection.on('ringing', () => {
            callbacks.onConnecting?.(connection);
        });
        
        // Connection disconnected
        connection.on('disconnect', () => {
            callbacks.onCallEnded?.(connection);
            contactInstance = null;
        });
        
        // Connection rejected/canceled
        connection.on('cancel', () => {
            callbacks.onMissed?.(connection);
            contactInstance = null;
        });
        
        // Connection error
        connection.on('error', error => {
            callbacks.onError?.(error, connection);
        });
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
            try {
                contactInstance.accept();
                resolve(true);
            } catch (error) {
                reject(new Error(`Failed to accept call: ${error}`));
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
            try {
                contactInstance.reject();
                contactInstance = null;
                resolve(true);
            } catch (error) {
                reject(new Error(`Failed to decline call: ${error}`));
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
            // Disconnect the call
            contactInstance.disconnect();
            
            // Enter After Call Work mode
            await this._enterAfterCallWorkMode();
            
            contactInstance = null;
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
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available."));
        }

        return new Promise((resolve, reject) => {
            try {
                // In Twilio, we need to use the Conference API to hold a call
                // This is a mock implementation
                contactInstance.sendDigits('*1'); // Assuming *1 is the hold code
                resolve("Call successfully put on hold.");
            } catch (error) {
                reject(new Error(`Failed to put call on hold: ${error}`));
            }
        });
    },

    /**
     * Resume the current active contact from the hold state.
     * @return {Promise} Resolves if the resume call is successful, rejects otherwise.
     */
    resumeCall() {
        if (!this._validateContactInstance()) {
            return Promise.reject(new Error("No contact instance available."));
        }

        return new Promise((resolve, reject) => {
            try {
                // In Twilio, we need to use the Conference API to resume a call
                // This is a mock implementation
                contactInstance.sendDigits('*2'); // Assuming *2 is the resume code
                resolve("Call successfully resumed.");
            } catch (error) {
                reject(new Error(`Failed to resume call: ${error}`));
            }
        });
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
            return Promise.reject(new Error("No contact instance available."));
        }

        return new Promise((resolve, reject) => {
            try {
                // In Twilio, we would typically store this in a task attribute
                // For this implementation, we'll store it in the connection
                const attributes = {
                    dispositionCode: dispositionId,
                    dispositionNotes: notes,
                    dispositionTimestamp: new Date().toISOString()
                };
                
                // Store the disposition in the connection's custom parameters
                contactInstance.customParameters = {
                    ...contactInstance.customParameters,
                    ...attributes
                };
                
                resolve(true);
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
            return Promise.reject(new Error("No contact instance available."));
        }

        return this._enterAfterCallWorkMode();
    },

    /**
     * Completes After Call Work and sets the agent back to the available state.
     * @param {string} [dispositionId] - Optional disposition code to set before completing ACW.
     * @param {string} [notes] - Optional notes to add with the disposition.
     * @returns {Promise} Resolves when ACW is completed.
     */
    completeAfterCallWork(dispositionId = null, notes = '') {
        return new Promise(async (resolve, reject) => {
            try {
                // Set disposition code if provided
                if (dispositionId) {
                    await this.setDispositionCode(dispositionId, notes);
                }
                
                // Set agent back to available
                await this._exitAfterCallWorkMode();
                
                resolve(true);
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
        const agentInstance = agentService.getAgentInstance();
        if (!agentInstance) {
            return -1;
        }
        
        // Check if agent is in ACW state
        const state = agentService.getAgentState();
        if (state !== 'AfterCallWork') {
            return -1;
        }
        
        // In Twilio, ACW time would be managed by your application
        // This is a mock implementation
        const acwStartTime = agentInstance.attributes.acwStartTime || Date.now();
        const acwMaxTime = agentInstance.attributes.acwMaxTime || 300; // 5 minutes default
        
        const elapsedTime = (Date.now() - acwStartTime) / 1000; // Convert to seconds
        return Math.max(0, acwMaxTime - elapsedTime);
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
                // In Twilio, we use SIP Refer for cold transfers
                // This is a simplified implementation
                contactInstance.sendDigits(`*8${phoneNumber}#`); // Assuming *8 is the transfer code
                
                // Disconnect after transfer is initiated
                setTimeout(() => {
                    contactInstance.disconnect();
                    contactInstance = null;
                }, 1000);
                
                resolve(true);
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
                // In Twilio, we would use the Conference API for warm transfers
                // This is a simplified implementation
                
                // Create a conference
                const conferenceId = `conf-${Date.now()}`;
                
                // Add the transfer target to the conference
                // In a real implementation, this would be an API call to Twilio
                const connectionId = `conn-${Date.now()}`;
                
                // Track the pending transfer
                pendingTransfers.push({
                    connectionId,
                    phoneNumber,
                    conferenceId,
                    timestamp: Date.now()
                });
                
                resolve(connectionId);
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
                // In Twilio, we would use TaskRouter to transfer to a queue
                // This is a simplified implementation
                contactInstance.sendDigits(`*7${queueId}#`); // Assuming *7 is the queue transfer code
                
                // Disconnect after transfer is initiated
                setTimeout(() => {
                    contactInstance.disconnect();
                    contactInstance = null;
                }, 1000);
                
                resolve(true);
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
                // In Twilio, we would use TaskRouter and the Conference API for warm queue transfers
                // This is a simplified implementation
                
                // Create a conference
                const conferenceId = `conf-${Date.now()}`;
                
                // Add the queue to the conference
                // In a real implementation, this would be an API call to Twilio
                const connectionId = `conn-${Date.now()}`;
                
                // Track the pending transfer
                pendingTransfers.push({
                    connectionId,
                    queueId,
                    conferenceId,
                    timestamp: Date.now()
                });
                
                resolve(connectionId);
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
                // In Twilio, we would use the Conference API to complete the transfer
                // This is a simplified implementation
                
                // Find the transfer to complete
                let transferToComplete;
                
                if (connectionId) {
                    transferToComplete = pendingTransfers.find(t => t.connectionId === connectionId);
                    
                    if (!transferToComplete) {
                        return reject(new Error(`Connection with ID ${connectionId} not found.`));
                    }
                    
                    // Remove from pending transfers
                    pendingTransfers = pendingTransfers.filter(t => t.connectionId !== connectionId);
                } else {
                    // Get the most recent transfer
                    transferToComplete = pendingTransfers[pendingTransfers.length - 1];
                    
                    // Clear pending transfers
                    pendingTransfers = [];
                }
                
                // Disconnect the agent
                contactInstance.disconnect();
                contactInstance = null;
                
                resolve(true);
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
                // In Twilio, we would use the Conference API to add a participant
                // This is a simplified implementation
                
                // Create a conference if one doesn't exist
                let conferenceId = contactInstance.parameters.get('conferenceId');
                
                if (!conferenceId) {
                    conferenceId = `conf-${Date.now()}`;
                    contactInstance.parameters.set('conferenceId', conferenceId);
                }
                
                // Add the participant to the conference
                // In a real implementation, this would be an API call to Twilio
                const connectionId = `conn-${Date.now()}`;
                
                // Track the conference participant
                pendingTransfers.push({
                    connectionId,
                    phoneNumber,
                    conferenceId,
                    isConference: true,
                    timestamp: Date.now()
                });
                
                resolve(connectionId);
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
                // In Twilio, connections are automatically merged in a conference
                // This is a simplified implementation
                
                // Check if we have enough participants
                if (pendingTransfers.length < 1) {
                    return reject(new Error("Not enough connections to merge into a conference."));
                }
                
                // Mark all pending transfers as part of a conference
                pendingTransfers = pendingTransfers.map(transfer => ({
                    ...transfer,
                    isConference: true
                }));
                
                resolve(true);
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
                // Find the connection to remove
                const connectionToRemove = pendingTransfers.find(t => t.connectionId === connectionId);
                
                if (!connectionToRemove) {
                    return reject(new Error(`Connection with ID ${connectionId} not found.`));
                }
                
                // In Twilio, we would use the Conference API to remove a participant
                // This is a simplified implementation
                
                // Remove from pending transfers
                pendingTransfers = pendingTransfers.filter(t => t.connectionId !== connectionId);
                
                resolve(true);
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
            // In Twilio, we would get the conference participants
            // This is a simplified implementation
            
            const connections = [
                // Agent connection
                {
                    connectionId: `agent-${contactInstance.parameters.get('CallSid')}`,
                    type: 'agent',
                    state: { type: 'connected' },
                    endpoint: { address: agentService.getAgentInstance()?.attributes.extension }
                },
                // Customer connection
                {
                    connectionId: `customer-${contactInstance.parameters.get('CallSid')}`,
                    type: 'customer',
                    state: { type: 'connected' },
                    endpoint: { address: contactInstance.parameters.get('From') }
                }
            ];
            
            // Add any conference participants
            pendingTransfers.forEach(transfer => {
                if (transfer.isConference) {
                    connections.push({
                        connectionId: transfer.connectionId,
                        type: 'participant',
                        state: { type: 'connected' },
                        endpoint: { address: transfer.phoneNumber }
                    });
                }
            });
            
            return Promise.resolve(connections);
        } catch (error) {
            return Promise.reject(new Error(`Error getting active connections: ${error}`));
        }
    },

    /**
     * Validates if a contact instance exists.
     * @returns {boolean} True if a valid contact instance exists, false otherwise.
     * @private
     */
    _validateContactInstance() {
        return !!contactInstance;
    },

    /**
     * Enters After Call Work mode.
     * @returns {Promise} Resolves when ACW mode is entered.
     * @private
     */
    _enterAfterCallWorkMode() {
        return new Promise((resolve, reject) => {
            try {
                const agentInstance = agentService.getAgentInstance();
                if (!agentInstance) {
                    return reject(new Error("Agent instance not found."));
                }
                
                // In Twilio, we would update the worker's activity to an ACW state
                // This is a simplified implementation
                
                // Store ACW start time
                agentInstance.attributes.acwStartTime = Date.now();
                
                // Find or create an ACW activity
                const activities = agentInstance.workspace?.activities || {};
                const acwActivity = Object.values(activities).find(a => 
                    a.friendlyName === 'AfterCallWork' || 
                    a.friendlyName === 'Wrap Up'
                );
                
                if (acwActivity) {
                    // Update the worker's activity to ACW
                    agentInstance.updateActivity(acwActivity.sid, {
                        success: () => resolve(true),
                        error: err => reject(new Error(`Failed to enter After Call Work: ${err}`))
                    });
                } else {
                    // If no ACW activity exists, just resolve
                    resolve(true);
                }
            } catch (error) {
                reject(new Error(`Error entering After Call Work: ${error}`));
            }
        });
    },

    /**
     * Exits After Call Work mode and sets agent to available.
     * @returns {Promise} Resolves when the agent is set to available.
     * @private
     */
    _exitAfterCallWorkMode() {
        return new Promise((resolve, reject) => {
            try {
                const agentInstance = agentService.getAgentInstance();
                if (!agentInstance) {
                    return reject(new Error("Agent instance not found."));
                }
                
                // Find the available activity
                const activities = agentInstance.workspace?.activities || {};
                const availableActivity = Object.values(activities).find(a => 
                    a.friendlyName === 'Available'
                );
                
                if (!availableActivity) {
                    return reject(new Error("Available activity not found."));
                }
                
                // Update the worker's activity to Available
                agentInstance.updateActivity(availableActivity.sid, {
                    success: () => {
                        // Clear ACW start time
                        delete agentInstance.attributes.acwStartTime;
                        resolve(true);
                    },
                    error: err => reject(new Error(`Failed to exit After Call Work: ${err}`))
                });
            } catch (error) {
                reject(new Error(`Error exiting After Call Work: ${error}`));
            }
        });
    }
};