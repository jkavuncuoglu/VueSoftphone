import agentService from './agentService';
import contactService from './contactService';

let callbacks = {};

export default {
    /**
     * Initialize Twilio service with callbacks and configuration.
     * @param {Object} options - Callbacks for managing agent and contact events.
     */
    initialize(options = {}) {
        callbacks = options;

        if (!window.Twilio) {
            alert("Twilio SDK not loaded.");
            return Promise.reject(new Error("Twilio SDK not loaded."));
        }

        // Initialize Twilio Device
        this._initializeTwilioDevice();

        // Initialize agent and set up event listeners
        return agentService.initializeAgent({
            onAgentAvailable: (agentInstance) => {
                callbacks.onStatusChange?.(agentService.getAgentState());

                // Automatically close login modal after user is logged in
                callbacks.onLoginSuccess?.();
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
            onRefresh: (agent) => {
                // Handle agent refresh events
            },
            onSoftphoneError: (error) => {
                callbacks.onError?.(error);
            },
            onAfterCallWork: (task) => {
                // Handle after call work events
            },
            onContactPending: (task) => {
                callbacks.onPending?.(task);
            }
        }).then(() => {
            // Initialize contact and set up event listeners
            return contactService.initializeContact({
                onIncomingCall: (connection) => callbacks.onIncomingCall?.(connection),
                onConnecting: (connection) => callbacks.onConnecting?.(connection),
                onConnected: (connection) => callbacks.onConnected?.(connection),
                onAccepted: (connection) => callbacks.onCallAccepted?.(connection),
                onMissed: (connection) => callbacks.onMissed?.(connection),
                onPending: (connection) => callbacks.onPending?.(connection),
                onRefresh: (connection) => callbacks.onRefresh?.(connection),
                onCallEnded: (connection) => callbacks.onCallEnded?.(connection),
                onError: (error, connection) => callbacks.onError?.(error, connection)
            });
        });
    },

    /**
     * Initialize Twilio Device with token and options.
     * @private
     */
    _initializeTwilioDevice() {
        // Get token from backend
        const token = this._getTwilioToken();

        // Initialize Twilio Device
        window.Twilio.Device.setup(token, {
            debug: true,
            enableRingingState: true,
            warnings: true
        });
    },

    /**
     * Get Twilio token from backend.
     * @returns {string} Twilio token.
     * @private
     */
    _getTwilioToken() {
        // In a real implementation, this would be an API call to your backend
        // For this example, we'll return a placeholder
        return 'twilio-token-placeholder';
    },

    /**
     * Place an outbound call.
     * @param {string} phoneNumber - The phone number to call.
     * @returns {Promise} Resolves when the call is successfully placed.
     */
    placeCall(phoneNumber) {
        if (!window.Twilio || !window.Twilio.Device) {
            return Promise.reject(new Error("Twilio Device not initialized."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Make the call
                const connection = window.Twilio.Device.connect({
                    To: phoneNumber,
                    Direction: 'outbound'
                });
                
                // Store the connection
                contactService.getContactInstance = () => connection;
                
                // Set up connection event listeners
                contactService._setupConnectionEventListeners(connection);
                
                // Resolve when the call is connecting
                connection.on('accept', () => {
                    resolve(true);
                });
                
                // Reject if there's an error
                connection.on('error', (error) => {
                    reject(new Error(`Failed to place call: ${error.message}`));
                });
            } catch (error) {
                reject(new Error(`Error placing call: ${error.message}`));
            }
        });
    },

    /**
     * Hang up the current active call.
     * @returns {Promise} Resolves when the call is successfully ended.
     */
    hangUpCall() {
        return contactService.endContact();
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
        if (isWarmTransfer) {
            return contactService.warmTransferToPhoneNumber(number);
        } else {
            return contactService.transferToPhoneNumber(number);
        }
    },

    /**
     * End a transfer call.
     * @param {boolean} [isAgentDisconnect=false] - Whether to disconnect only the agent connection.
     * @returns {Promise} Resolves when the transfer call is ended.
     */
    endTransferCall(isAgentDisconnect = false) {
        // In Twilio, we don't need to handle agent-only disconnects separately
        // We just complete the transfer
        return contactService.completeTransfer();
    },

    /**
     * Transfers the current call to a specific queue.
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves when the queue transfer is successful.
     */
    transferToQueue(queueId) {
        return contactService.transferToQueue(queueId);
    },

    /**
     * Performs a warm transfer to a queue by first connecting to the queue
     * and then allowing the agent to speak with the queue before completing the transfer.
     * @param {string} queueId - The ID of the queue to transfer to.
     * @returns {Promise} Resolves when the warm queue transfer is initiated.
     */
    warmTransferToQueue(queueId) {
        return contactService.warmTransferToQueue(queueId);
    },

    /**
     * Gets a list of available queues for transfer.
     * @returns {Promise<Array>} Resolves with an array of available queues.
     */
    getAvailableQueues() {
        return new Promise((resolve, reject) => {
            try {
                // In a real implementation, this would be an API call to Twilio
                // For this example, we'll return mock data
                const mockQueues = [
                    { queueId: 'queue1', name: 'Sales Queue', availableAgents: 5 },
                    { queueId: 'queue2', name: 'Support Queue', availableAgents: 3 },
                    { queueId: 'queue3', name: 'Billing Queue', availableAgents: 2 }
                ];
                
                resolve(mockQueues);
            } catch (error) {
                reject(new Error(`Error getting available queues: ${error.message}`));
            }
        });
    },

    /**
     * Initiates a conference call by adding a third party to the current call.
     * @param {string} phoneNumber - The phone number to add to the conference.
     * @returns {Promise} Resolves when the conference is successfully initiated.
     */
    initiateConference(phoneNumber) {
        return contactService.initiateConference(phoneNumber);
    },

    /**
     * Merges all connections into a conference call.
     * @returns {Promise} Resolves when the conference is successfully merged.
     */
    mergeConnections() {
        return contactService.mergeConnections();
    },

    /**
     * Removes a specific connection from the conference call.
     * @param {string} connectionId - The ID of the connection to remove.
     * @returns {Promise} Resolves when the connection is successfully removed.
     */
    removeFromConference(connectionId) {
        return contactService.removeFromConference(connectionId);
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
                // In Twilio, we would get the call parameters
                const attributes = {};
                
                // Get all parameters from the connection
                contactInstance.parameters.forEach((value, key) => {
                    attributes[key] = value;
                });
                
                // Add custom parameters
                if (contactInstance.customParameters) {
                    Object.assign(attributes, contactInstance.customParameters);
                }
                
                resolve(attributes);
            } catch (error) {
                reject(new Error(`Error getting contact attributes: ${error.message}`));
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
                
                // Get the contact instance
                const contactInstance = contactService.getContactInstance();
                
                // Get the agent instance
                const agentInstance = agentService.getAgentInstance();
                
                // Combine contact attributes with record data
                const enrichedData = {
                    ...recordData,
                    contactId: contactInstance?.parameters.get('CallSid'),
                    agentId: agentInstance?.sid,
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
                reject(new Error(`Error creating CRM record: ${error.message}`));
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
                reject(new Error(`Error updating CRM record: ${error.message}`));
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
                reject(new Error(`Error searching customer by phone: ${error.message}`));
            }
        });
    },

    /**
     * Accept an incoming call.
     * @returns {Promise} Resolves when the call is successfully accepted.
     */
    acceptIncomingCall() {
        return contactService.acceptContact();
    },

    /**
     * Decline an incoming call.
     * @returns {Promise} Resolves when the call is successfully declined.
     */
    declineIncomingCall() {
        return contactService.declineContact();
    },

    /**
     * Mute the active call.
     * @returns {Promise} Resolves when the call is successfully muted.
     */
    muteConnection() {
        return agentService.mute();
    },

    /**
     * Unmute the active call.
     * @returns {Promise} Resolves when the call is successfully unmuted.
     */
    unmuteConnection() {
        return agentService.unmute();
    },

    /**
     * Open the Twilio login modal.
     * @returns {Promise} Resolves when the login modal is opened.
     */
    openLogin() {
        // In a real implementation, this would open a login UI
        // For this example, we'll just trigger the callback
        callbacks.onLoginRequired?.();
        return Promise.resolve();
    }
};