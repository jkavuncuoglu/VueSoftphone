import agentService from './agentService';
import contactService from './contactService';

let callbacks = {};

export default {
    /**
     * Initialize Amazon Connect service with callbacks and configuration.
     * @param {Object} options - Callbacks for managing agent and contact events.
     */
    initialize(options = {}) {
        callbacks = options;

        if (!window.connect) {
            alert("Amazon Connect Streams API not loaded.");
            return;
        }

        const container = document.getElementById('ccpContainer');
        const ccpUrl = `https://${process.env.MIX_AWS_CONNECT_URL}/connect/ccp-v2`

        window.connect.core.initCCP(container, {
            ccpUrl: ccpUrl,
            loginPopup: true,
            loginPopupAutoClose: true,
            region: 'us-east-1',
            softphone: { allowFramedSoftphone: true },
        });

        // Initialize agent and set up event listeners
        agentService.initializeAgent({
            onAgentAvailable: (agentInstance) => {
                callbacks.onStatusChange?.(agentService.getAgentState());

                // Automatically close login modal after user is logged in
                if (typeof callbacks.onLoginSuccess === 'function') {
                    callbacks.onLoginSuccess();
                }
            },
            onStateChange: (newState) => {
                callbacks.onStatusChange?.(newState);
            },
            onMuteChange: (isMuted) => {
                callbacks.onMuteChange?.(isMuted);
            },
            onLogout: () => {
                callbacks.onLogout?.();
            },
        });


        // Initialize contact and set up event listeners
        contactService.initializeContact({
            onIncomingCall: (contactInstance) => callbacks.onIncomingCall?.(contactInstance),
            onConnecting: (contact) => callbacks.onConnecting?.(contact),
            onConnected: (contact) => callbacks.onConnected?.(contact),
            onAccepted: (contact) => callbacks.onCallAccepted?.(contact),
            onMissed: (contact) => callbacks.onMissed?.(contact),
            onPending: (contact) => callbacks.onPending?.(contact),
            onRefresh: (contact) => callbacks.onRefresh?.(contact),
            onCallEnded: (contact) => callbacks.onCallEnded?.(contact),
            onError: (error, contact) => callbacks.onError?.(error, contact)
        });
    },

    /**
     * Place an outbound call.
     * @param {string} phoneNumber - The phone number to call.
     * @returns {Promise} Resolves when the call is successfully placed.
     */
    placeCall(phoneNumber) {
        const agentInstance = agentService.getAgentInstance();
        if (!agentInstance) {
            return Promise.reject(new Error("Agent is not ready."));
        }

        const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);
        
        return new Promise((resolve, reject) => {
            agentInstance.connect(endpoint, {
                success: () => {
                    // Monitor contact events
                    window.connect.contact((contact) => {
                        contact.onConnecting(() => callbacks.onConnecting?.(contact));
                        contact.onConnected(() => callbacks.onConnected?.(contact));
                        contact.onCallEnded(() => callbacks.onCallEnded?.(contact));
                    });
                    resolve(true);
                },
                failure: (err) => reject(new Error(`Failed to place call: ${err}`))
            });
        });
    },

    /**
     * Hang up the current active call.
     * @returns {Promise} Resolves when the call is successfully ended.
     */
    hangUpCall() {
        return Promise.resolve(contactService.endContact());
    },

    /**
     * Hold Call
     * @returns {Promise} Resolves if the hold call is successful, rejects otherwise.
     */
    holdCall() {
        return contactService.holdCall();
    },

    /**
     * Resume Call
     * @returns {Promise} Resolves if the resume call is successful, rejects otherwise.
     */
    resumeCall() {
        return contactService.resumeCall();
    },


    /**
     * Transfer the current call to another number.
     * @param {string} number - The phone number to transfer the call to.
     * @param {boolean} [isWarmTransfer=false] - Whether to perform a warm transfer.
     * @returns {Promise} Resolves when the transfer is successful.
     */
    transferCall(number, isWarmTransfer = false) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            throw new Error("No active contact available for transfer.");
        }

        const endpoint = window.connect.Endpoint.byPhoneNumber(number);
        
        return new Promise((resolve, reject) => {
            if (isWarmTransfer) {
                contactInstance.addConnection(endpoint, {
                    success: () => resolve(true),
                    failure: (error) => reject(new Error(`Failed to initiate warm transfer: ${error}`))
                });
            } else {
                contactInstance.toggleActiveConnections(endpoint, {
                    success: () => resolve(false),
                    failure: (error) => reject(new Error(`Failed to transfer call: ${error}`))
                });
            }
        });
    },

    /**
     * End a transfer call.
     * @param {boolean} [isAgentDisconnect=false] - Whether to disconnect only the agent connection.
     * @returns {Promise} Resolves when the transfer call is ended.
     */
    endTransferCall(isAgentDisconnect = false) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available to end."));
        }

        if (isAgentDisconnect) {
            // Disconnect the agent connection only
            const agentConnection = contactInstance.getAgentConnection();
            if (!agentConnection) {
                return Promise.resolve(); // No agent connection to disconnect
            }
            
            return new Promise((resolve, reject) => {
                agentConnection.destroy({
                    success: () => resolve(),
                    failure: (error) => reject(new Error(`Failed to disconnect agent: ${error}`))
                });
            });
        } else {
            // End the entire transfer call
            this.hangUpCall();
            return Promise.resolve();
        }
    },

    /**
     * Transfers the current call to a specific queue.
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves when the queue transfer is successful.
     */
    transferToQueue(queueId) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available for transfer."));
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
     * Performs a warm transfer to a queue by first connecting to the queue
     * and then allowing the agent to speak with the queue before completing the transfer.
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves when the warm queue transfer is initiated.
     */
    warmTransferToQueue(queueId) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available for transfer."));
        }

        return new Promise((resolve, reject) => {
            try {
                const queueEndpoint = window.connect.Endpoint.byQueueId(queueId);
                contactInstance.addConnection(queueEndpoint, {
                    success: () => resolve(true),
                    failure: (error) => reject(new Error(`Failed to initiate warm transfer to queue: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error initiating warm transfer to queue: ${error}`));
            }
        });
    },

    /**
     * Gets a list of available queues for transfer.
     * @returns {Promise<Array>} Resolves with an array of available queues.
     */
    getAvailableQueues() {
        return new Promise((resolve, reject) => {
            try {
                window.connect.core.getQueues({
                    success: (queues) => resolve(queues),
                    failure: (error) => reject(new Error(`Failed to get available queues: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error getting available queues: ${error}`));
            }
        });
    },

    /**
     * Initiates a conference call by adding a third party to the current call.
     * @param {string} phoneNumber - The phone number to add to the conference.
     * @returns {Promise} Resolves when the conference is successfully initiated.
     */
    initiateConference(phoneNumber) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available for conference."));
        }

        const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);

        return new Promise((resolve, reject) => {
            try {
                contactInstance.addConnection(endpoint, {
                    success: () => resolve(true),
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
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available for merging connections."));
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
                    success: () => resolve(true),
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
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
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
                    success: () => resolve(true),
                    failure: (error) => reject(new Error(`Failed to remove connection: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error removing connection: ${error}`));
            }
        });
    },

    /**
     * Gets contact attributes that can be used for CRM integration.
     * @returns {Promise<Object>} Resolves with contact attributes.
     */
    getContactAttributes() {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            return Promise.reject(new Error("No active contact available."));
        }

        return new Promise((resolve, reject) => {
            try {
                contactInstance.getAttributes({
                    success: (attributes) => resolve(attributes),
                    failure: (error) => reject(new Error(`Failed to get contact attributes: ${error}`))
                });
            } catch (error) {
                reject(new Error(`Error getting contact attributes: ${error}`));
            }
        });
    },

    /**
     * Creates a CRM record with contact information.
     * @param {Object} crmSystem - The CRM system configuration object.
     * @param {Object} recordData - The data to create the CRM record with.
     * @returns {Promise<Object>} Resolves with the created CRM record.
     */
    createCrmRecord(crmSystem, recordData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get contact attributes to enrich the CRM record
                const contactAttributes = await this.getContactAttributes().catch(() => ({}));

                // Combine contact attributes with record data
                const enrichedData = {
                    ...recordData,
                    contactId: contactService.getContactInstance()?.getContactId(),
                    agentId: agentService.getAgentInstance()?.getAgentId(),
                    timestamp: new Date().toISOString(),
                    contactAttributes
                };

                // This would be replaced with actual API call to the CRM system
                resolve({
                    success: true,
                    recordId: `crm-${Date.now()}`,
                    data: enrichedData
                });
            } catch (error) {
                reject(new Error(`Error creating CRM record: ${error}`));
            }
        });
    },

    /**
     * Updates a CRM record with contact information.
     * @param {Object} crmSystem - The CRM system configuration object.
     * @param {string} recordId - The ID of the record to update.
     * @param {Object} updateData - The data to update the CRM record with.
     * @returns {Promise<Object>} Resolves with the updated CRM record.
     */
    updateCrmRecord(crmSystem, recordId, updateData) {
        return new Promise((resolve, reject) => {
            try {
                // This would be replaced with actual API call to the CRM system
                resolve({
                    success: true,
                    recordId,
                    data: updateData,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                reject(new Error(`Error updating CRM record: ${error}`));
            }
        });
    },

    /**
     * Searches for a customer in the CRM based on phone number.
     * @param {Object} crmSystem - The CRM system configuration object.
     * @param {string} phoneNumber - The phone number to search for.
     * @returns {Promise<Array>} Resolves with matching customer records.
     */
    searchCustomerByPhone(crmSystem, phoneNumber) {
        return new Promise((resolve, reject) => {
            try {
                // This would be replaced with actual API call to the CRM system
                resolve({
                    success: true,
                    results: [
                        {
                            id: `customer-${Date.now()}`,
                            phoneNumber,
                            name: 'Sample Customer',
                            email: 'customer@example.com',
                            lastContact: new Date().toISOString()
                        }
                    ]
                });
            } catch (error) {
                reject(new Error(`Error searching customer by phone: ${error}`));
            }
        });
    },

    /**
     * Accept an incoming call.
     * @returns {Promise} Resolves when the call is successfully accepted.
     */
    acceptIncomingCall() {
        return Promise.resolve(contactService.acceptContact());
    },

    /**
     * Decline an incoming call.
     * @returns {Promise} Resolves when the call is successfully declined.
     */
    declineIncomingCall() {
        return Promise.resolve(contactService.declineContact());
    },

    /**
     * Mute the active call.
     * @returns {Promise} Resolves when the call is successfully muted.
     */
    muteConnection() {
        return Promise.resolve(agentService.mute());
    },

    /**
     * Unmute the active call.
     * @returns {Promise} Resolves when the call is successfully unmuted.
     */
    unmuteConnection() {
        return Promise.resolve(agentService.unmute());
    },

    /**
     * Open the Amazon Connect CCP login modal.
     * @returns {Promise} Resolves when the login modal is opened.
     */
    openLogin() {
        const container = document.getElementById('ccpContainer');
        container?.click(); // Trigger iframe login if needed
        callbacks.onLoginRequired?.();
        return Promise.resolve();
    }
};