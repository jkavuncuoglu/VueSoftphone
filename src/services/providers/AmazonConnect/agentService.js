let agentInstance = null; // Stores the current agent instance
let callbacks = {}; // Callbacks for various agent events
let agentConfig = {}; // Stores agent configuration

export default {
    /**
     * Initialize the agent service.
     * @param {Object} options - Callbacks for agent events (e.g., state change, mute toggle, etc.).
     * @returns {Promise} Resolves when the agent is initialized.
     */
    initializeAgent(options = {}) {
        callbacks = options;

        if (!window.connect) {
            return Promise.reject(new Error("Amazon Connect Streams API not loaded."));
        }

        return new Promise((resolve) => {
            window.connect.agent(agent => {
                agentInstance = agent;
                callbacks.onAgentAvailable?.(agent);
                this._setupAgentEventListeners(agent);
                resolve(agent);
            });
        });
    },

    /**
     * Get the current agent instance.
     * @returns {Object|null} The current agent instance or null if not available.
     */
    getAgentInstance() {
        return agentInstance;
    },

    /**
     * Get the current state of the agent.
     * @returns {string|null} Agent's state (e.g., "Available", "Busy") or null if no agent exists.
     */
    getAgentState() {
        return agentInstance ? agentInstance.getState().name : null;
    },

    /**
     * Get all available agent states.
     * @returns {Promise<Array>} Resolves with an array of available agent states.
     */
    getAvailableAgentStates() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            const states = agentInstance.getAgentStates();
            return Promise.resolve(states.map(state => ({
                name: state.name,
                type: state.type,
                isRoutable: state.type === 'routable'
            })));
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent states: ${error}`));
        }
    },

    /**
     * Set the agent's status (e.g., Available, Offline).
     * @param {string} status - The desired agent status.
     * @returns {Promise} Resolves when the status is successfully set.
     */
    setAgentStatus(status) {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available to set status."));
        }

        return new Promise((resolve, reject) => {
            const routableState = agentInstance.getAgentStates().find(state => state.name === status);

            if (!routableState) {
                return reject(new Error(`Invalid agent status: ${status}`));
            }

            agentInstance.setState(routableState, {
                success: () => {
                    callbacks.onStatusSet?.(status);
                    resolve(status);
                },
                failure: err => reject(new Error(`Failed to set agent status: ${err}`))
            });
        });
    },

    /**
     * Get the agent's current routing state.
     * @returns {Promise<Object>} Resolves with the agent's routing state.
     */
    getRoutingState() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            const state = agentInstance.getState();
            return Promise.resolve({
                name: state.name,
                type: state.type,
                isRoutable: state.type === 'routable',
                startTimestamp: state.startTimestamp
            });
        } catch (error) {
            return Promise.reject(new Error(`Failed to get routing state: ${error}`));
        }
    },

    /**
     * Set the agent's routing state.
     * @param {string} stateName - The name of the routing state to set.
     * @returns {Promise} Resolves when the routing state is successfully set.
     */
    setRoutingState(stateName) {
        return this.setAgentStatus(stateName);
    },

    /**
     * Get the agent's configuration.
     * @returns {Promise<Object>} Resolves with the agent's configuration.
     */
    getAgentConfiguration() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            const config = agentInstance.getConfiguration();
            // Store the configuration for later use
            agentConfig = config;
            
            return Promise.resolve({
                name: config.name,
                username: config.username,
                userId: config.userId,
                softphoneEnabled: config.softphoneEnabled,
                softphoneAutoAccept: config.softphoneAutoAccept,
                extension: config.extension,
                routingProfile: config.routingProfile,
                agentPreferences: config.agentPreferences
            });
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent configuration: ${error}`));
        }
    },

    /**
     * Update the agent's configuration.
     * @param {Object} configUpdates - The configuration updates to apply.
     * @returns {Promise<Object>} Resolves with the updated configuration.
     */
    updateAgentConfiguration(configUpdates) {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        return new Promise((resolve, reject) => {
            try {
                // This is a mock implementation since Amazon Connect doesn't directly
                // support updating all agent configuration through the Streams API
                agentConfig = { ...agentConfig, ...configUpdates };
                
                // For demonstration, we'll update what we can
                if (configUpdates.softphoneAutoAccept !== undefined) {
                    agentInstance.setSoftphoneAutoAccept(configUpdates.softphoneAutoAccept);
                }
                
                resolve(agentConfig);
            } catch (error) {
                reject(new Error(`Failed to update agent configuration: ${error}`));
            }
        });
    },

    /**
     * Get agent statistics.
     * @returns {Promise<Object>} Resolves with the agent's statistics.
     */
    getAgentStatistics() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Amazon Connect doesn't directly expose agent statistics through the Streams API
                // This is a mock implementation that would be replaced with actual API calls
                const mockStats = {
                    contactsHandled: 0,
                    averageHandleTime: 0,
                    onContactTime: 0,
                    agentIdleTime: 0,
                    occupancy: 0
                };
                
                // In a real implementation, you would make an API call to get the statistics
                resolve(mockStats);
            } catch (error) {
                reject(new Error(`Failed to get agent statistics: ${error}`));
            }
        });
    },

    /**
     * Get a snapshot of the agent's current state and contacts.
     * @returns {Promise<Object>} Resolves with the agent snapshot.
     */
    getAgentSnapshot() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            const snapshot = {
                state: this.getAgentState(),
                contacts: agentInstance.getContacts(),
                isMuted: agentInstance.isMuted(),
                configuration: agentConfig
            };
            
            return Promise.resolve(snapshot);
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent snapshot: ${error}`));
        }
    },

    /**
     * Get the agent's current contacts.
     * @returns {Promise<Array>} Resolves with an array of the agent's contacts.
     */
    getAgentContacts() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            const contacts = agentInstance.getContacts();
            return Promise.resolve(contacts.map(contact => ({
                contactId: contact.getContactId(),
                state: contact.getState(),
                type: contact.getType(),
                isInbound: contact.isInbound(),
                isConnected: contact.isConnected(),
                connections: contact.getConnections().map(conn => ({
                    connectionId: conn.getConnectionId(),
                    state: conn.getState(),
                    type: conn.getType()
                }))
            })));
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent contacts: ${error}`));
        }
    },

    /**
     * Get the logs from the Amazon Connect CCP.
     * @returns {Array} Array of log entries.
     */
    getCcpLogs() {
        if (!window.connect) {
            return [];
        }

        try {
            return window.connect
                .getLog()
                ._rolledLogs
                .concat(window.connect.getLog()._logs);
        } catch (error) {
            return [];
        }
    },

    /**
     * Mute the agent's microphone.
     * @returns {Promise} Resolves when the microphone is successfully muted.
     */
    mute() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available to mute."));
        }

        return new Promise((resolve, reject) => {
            try {
                agentInstance.mute();
                callbacks.onMuteChange?.(true);
                resolve(true);
            } catch (error) {
                reject(new Error(`Failed to mute microphone: ${error}`));
            }
        });
    },

    /**
     * Unmute the agent's microphone.
     * @returns {Promise} Resolves when the microphone is successfully unmuted.
     */
    unmute() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available to unmute."));
        }

        return new Promise((resolve, reject) => {
            try {
                agentInstance.unmute();
                callbacks.onMuteChange?.(false);
                resolve(true);
            } catch (error) {
                reject(new Error(`Failed to unmute microphone: ${error}`));
            }
        });
    },

    /**
     * Log out the agent from Amazon Connect.
     * @returns {Promise} Resolves when the agent is successfully logged out.
     */
    logout() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available to log out."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Amazon Connect doesn't directly expose a logout method through the Streams API
                // This is a workaround that sets the agent to an offline state
                const offlineState = agentInstance.getAgentStates().find(state => 
                    state.type === 'offline' || state.name.toLowerCase().includes('offline'));
                
                if (!offlineState) {
                    return reject(new Error("Could not find offline state for agent."));
                }
                
                agentInstance.setState(offlineState, {
                    success: () => {
                        callbacks.onLogout?.();
                        resolve(true);
                    },
                    failure: err => reject(new Error(`Failed to log out agent: ${err}`))
                });
            } catch (error) {
                reject(new Error(`Error during agent logout: ${error}`));
            }
        });
    },

    /**
     * Get the agent's permissions.
     * @returns {Promise<Object>} Resolves with the agent's permissions.
     */
    getAgentPermissions() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available."));
        }

        try {
            // Amazon Connect doesn't directly expose agent permissions through the Streams API
            // This is a mock implementation that would be replaced with actual API calls
            const permissions = {
                canAccessReports: true,
                canAccessRecordings: true,
                canTransferCalls: true,
                canCreateConferences: true,
                canAccessCustomerProfiles: true
            };
            
            return Promise.resolve(permissions);
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent permissions: ${error}`));
        }
    },

    /**
     * Sets up event listeners for the agent instance.
     * @param {Object} agent - The agent instance.
     * @private
     */
    _setupAgentEventListeners(agent) {
        agent.onStateChange(state => {
            callbacks.onStateChange?.(state.newState);
        });

        agent.onMuteToggle(() => {
            const isMuted = agent.isMuted();
            callbacks.onMuteChange?.(isMuted);
        });

        agent.onRefresh(agent => {
            callbacks.onRefresh?.(agent);
        });

        agent.onSoftphoneError(error => {
            callbacks.onSoftphoneError?.(error);
        });

        agent.onAfterCallWork(contact => {
            callbacks.onAfterCallWork?.(contact);
        });

        agent.onContactPending(contact => {
            callbacks.onContactPending?.(contact);
        });
    },

    /**
     * Validates if an agent instance exists.
     * @param {string} [action] - Optional action name for contextual error logging.
     * @returns {boolean} True if the agent instance exists, otherwise false.
     * @private
     */
    _validateAgentInstance(action) {
        if (!agentInstance) {
            return false;
        }
        return true;
    }
};