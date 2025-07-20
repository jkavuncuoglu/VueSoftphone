let agentInstance = null; // Stores the current agent instance
let callbacks = {}; // Callbacks for various agent events
let agentConfig = {}; // Stores agent configuration
let workerInstance = null; // Twilio Worker instance
let workspaceInstance = null; // Twilio TaskRouter Workspace instance

export default {
    /**
     * Initialize the agent service.
     * @param {Object} options - Callbacks for agent events (e.g., state change, mute toggle, etc.).
     * @returns {Promise} Resolves when the agent is initialized.
     */
    initializeAgent(options = {}) {
        callbacks = options;

        if (!window.Twilio || !window.Twilio.TaskRouter) {
            return Promise.reject(new Error("Twilio TaskRouter SDK not loaded."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Initialize Twilio TaskRouter Worker
                const token = this._getTwilioToken(); // This would be provided by your backend
                
                // Create a new TaskRouter Worker
                workspaceInstance = new window.Twilio.TaskRouter.Workspace(token);
                workerInstance = new window.Twilio.TaskRouter.Worker(token);
                
                // Store the worker as our agent instance
                agentInstance = workerInstance;
                
                // Set up event listeners
                this._setupAgentEventListeners(workerInstance);
                
                // Notify that agent is available
                callbacks.onAgentAvailable?.(workerInstance);
                
                resolve(workerInstance);
            } catch (error) {
                reject(new Error(`Failed to initialize Twilio agent: ${error}`));
            }
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
        if (!agentInstance) return null;
        
        // Map Twilio activity name to a standardized state name
        const activityName = agentInstance.activityName;
        return this._mapTwilioActivityToState(activityName);
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
            // Get all activities from the workspace
            const activities = workspaceInstance.activities;
            
            return Promise.resolve(Object.values(activities).map(activity => ({
                name: activity.friendlyName,
                type: this._getActivityType(activity.friendlyName),
                isRoutable: this._isRoutableActivity(activity.friendlyName)
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
            try {
                // Find the activity that matches the requested status
                const activities = workspaceInstance.activities;
                const activity = Object.values(activities).find(a => 
                    a.friendlyName === status || 
                    this._mapTwilioActivityToState(a.friendlyName) === status
                );
                
                if (!activity) {
                    return reject(new Error(`Invalid agent status: ${status}`));
                }
                
                // Update the worker's activity
                agentInstance.updateActivity(activity.sid, {
                    success: () => {
                        callbacks.onStatusSet?.(status);
                        resolve(status);
                    },
                    error: err => reject(new Error(`Failed to set agent status: ${err}`))
                });
            } catch (error) {
                reject(new Error(`Error setting agent status: ${error}`));
            }
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
            const activity = agentInstance.activity;
            const state = {
                name: activity.friendlyName,
                type: this._getActivityType(activity.friendlyName),
                isRoutable: this._isRoutableActivity(activity.friendlyName),
                startTimestamp: new Date(activity.dateUpdated).getTime()
            };
            
            return Promise.resolve(state);
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
            // Get worker attributes
            const attributes = agentInstance.attributes || {};
            
            // Create a standardized configuration object
            const config = {
                name: agentInstance.friendlyName,
                username: attributes.username || agentInstance.friendlyName,
                userId: agentInstance.sid,
                softphoneEnabled: attributes.softphoneEnabled !== false,
                softphoneAutoAccept: attributes.softphoneAutoAccept === true,
                extension: attributes.extension || '',
                routingProfile: {
                    name: attributes.routingProfile || 'Default Profile',
                    skills: attributes.skills || []
                },
                agentPreferences: attributes.preferences || {}
            };
            
            // Store the configuration for later use
            agentConfig = config;
            
            return Promise.resolve(config);
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
                // Merge the updates with the current config
                agentConfig = { ...agentConfig, ...configUpdates };
                
                // Convert to Twilio worker attributes format
                const attributeUpdates = {};
                
                if (configUpdates.softphoneEnabled !== undefined) {
                    attributeUpdates.softphoneEnabled = configUpdates.softphoneEnabled;
                }
                
                if (configUpdates.softphoneAutoAccept !== undefined) {
                    attributeUpdates.softphoneAutoAccept = configUpdates.softphoneAutoAccept;
                }
                
                if (configUpdates.extension !== undefined) {
                    attributeUpdates.extension = configUpdates.extension;
                }
                
                if (configUpdates.routingProfile) {
                    attributeUpdates.routingProfile = configUpdates.routingProfile.name;
                    attributeUpdates.skills = configUpdates.routingProfile.skills;
                }
                
                if (configUpdates.agentPreferences) {
                    attributeUpdates.preferences = configUpdates.agentPreferences;
                }
                
                // Update worker attributes
                agentInstance.updateAttributes(attributeUpdates, {
                    success: () => resolve(agentConfig),
                    error: err => reject(new Error(`Failed to update agent configuration: ${err}`))
                });
            } catch (error) {
                reject(new Error(`Error updating agent configuration: ${error}`));
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
                // Get worker statistics from Twilio
                // This would typically be an API call to Twilio's Insights API
                // For this implementation, we'll return mock data
                const mockStats = {
                    contactsHandled: agentInstance.attributes.contactsHandled || 0,
                    averageHandleTime: agentInstance.attributes.averageHandleTime || 0,
                    onContactTime: agentInstance.attributes.onContactTime || 0,
                    agentIdleTime: agentInstance.attributes.agentIdleTime || 0,
                    occupancy: agentInstance.attributes.occupancy || 0
                };
                
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
            // Get current tasks (contacts)
            const tasks = agentInstance.tasks || {};
            
            const snapshot = {
                state: this.getAgentState(),
                contacts: Object.values(tasks),
                isMuted: agentInstance.attributes.isMuted || false,
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
            // Get current tasks (contacts)
            const tasks = agentInstance.tasks || {};
            
            // Convert Twilio tasks to a standardized format
            const contacts = Object.values(tasks).map(task => ({
                contactId: task.sid,
                state: task.status,
                type: task.taskChannelUniqueName,
                isInbound: task.attributes.direction === 'inbound',
                isConnected: task.status === 'assigned',
                connections: this._getConnectionsFromTask(task)
            }));
            
            return Promise.resolve(contacts);
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent contacts: ${error}`));
        }
    },

    /**
     * Get the logs from the Twilio client.
     * @returns {Array} Array of log entries.
     */
    getCcpLogs() {
        // Twilio doesn't have a built-in logging system like Amazon Connect
        // This is a placeholder that would be replaced with your own logging implementation
        return [];
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
                // Get the Twilio Voice SDK call
                const activeCall = this._getActiveCall();
                
                if (!activeCall) {
                    return reject(new Error("No active call to mute."));
                }
                
                // Mute the call
                activeCall.mute(true);
                
                // Update agent attributes
                agentInstance.attributes.isMuted = true;
                
                // Trigger callback
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
                // Get the Twilio Voice SDK call
                const activeCall = this._getActiveCall();
                
                if (!activeCall) {
                    return reject(new Error("No active call to unmute."));
                }
                
                // Unmute the call
                activeCall.mute(false);
                
                // Update agent attributes
                agentInstance.attributes.isMuted = false;
                
                // Trigger callback
                callbacks.onMuteChange?.(false);
                
                resolve(true);
            } catch (error) {
                reject(new Error(`Failed to unmute microphone: ${error}`));
            }
        });
    },

    /**
     * Log out the agent from Twilio.
     * @returns {Promise} Resolves when the agent is successfully logged out.
     */
    logout() {
        if (!this._validateAgentInstance()) {
            return Promise.reject(new Error("No agent instance available to log out."));
        }

        return new Promise((resolve, reject) => {
            try {
                // Find the offline activity
                const activities = workspaceInstance.activities;
                const offlineActivity = Object.values(activities).find(a => 
                    a.friendlyName.toLowerCase().includes('offline') || 
                    !this._isRoutableActivity(a.friendlyName)
                );
                
                if (!offlineActivity) {
                    return reject(new Error("Could not find offline state for agent."));
                }
                
                // Update the worker's activity to offline
                agentInstance.updateActivity(offlineActivity.sid, {
                    success: () => {
                        callbacks.onLogout?.();
                        resolve(true);
                    },
                    error: err => reject(new Error(`Failed to log out agent: ${err}`))
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
            // Get permissions from worker attributes
            const attributes = agentInstance.attributes || {};
            
            // Create a standardized permissions object
            const permissions = {
                canAccessReports: attributes.permissions?.canAccessReports || false,
                canAccessRecordings: attributes.permissions?.canAccessRecordings || false,
                canTransferCalls: attributes.permissions?.canTransferCalls || true,
                canCreateConferences: attributes.permissions?.canCreateConferences || true,
                canAccessCustomerProfiles: attributes.permissions?.canAccessCustomerProfiles || false
            };
            
            return Promise.resolve(permissions);
        } catch (error) {
            return Promise.reject(new Error(`Failed to get agent permissions: ${error}`));
        }
    },

    /**
     * Sets up event listeners for the agent instance.
     * @param {Object} worker - The Twilio worker instance.
     * @private
     */
    _setupAgentEventListeners(worker) {
        // Activity (state) change
        worker.on('activityUpdated', activity => {
            const newState = this._mapTwilioActivityToState(activity.name);
            callbacks.onStateChange?.(newState);
        });
        
        // Task (contact) events
        worker.on('reservationCreated', reservation => {
            callbacks.onContactPending?.(reservation.task);
        });
        
        worker.on('reservationAccepted', reservation => {
            // This is similar to after call work in Amazon Connect
            callbacks.onAfterCallWork?.(reservation.task);
        });
        
        // Error events
        worker.on('error', error => {
            callbacks.onSoftphoneError?.(error);
        });
        
        // Worker attributes updated
        worker.on('attributesUpdated', attributes => {
            // Check if mute state changed
            if (attributes.isMuted !== undefined && 
                attributes.isMuted !== worker.attributes.isMuted) {
                callbacks.onMuteChange?.(attributes.isMuted);
            }
            
            // General refresh callback
            callbacks.onRefresh?.(worker);
        });
    },

    /**
     * Maps a Twilio activity name to a standardized state name.
     * @param {string} activityName - The Twilio activity name.
     * @returns {string} The standardized state name.
     * @private
     */
    _mapTwilioActivityToState(activityName) {
        const activityMap = {
            'Available': 'Available',
            'Unavailable': 'Busy',
            'Offline': 'Offline',
            'Break': 'Break',
            'Lunch': 'Lunch',
            'Training': 'Training',
            'Meeting': 'Meeting'
        };
        
        return activityMap[activityName] || activityName;
    },

    /**
     * Determines if an activity is routable (can receive tasks).
     * @param {string} activityName - The activity name.
     * @returns {boolean} True if the activity is routable.
     * @private
     */
    _isRoutableActivity(activityName) {
        return activityName === 'Available';
    },

    /**
     * Gets the type of an activity.
     * @param {string} activityName - The activity name.
     * @returns {string} The activity type.
     * @private
     */
    _getActivityType(activityName) {
        if (this._isRoutableActivity(activityName)) {
            return 'routable';
        } else if (activityName === 'Offline') {
            return 'offline';
        } else {
            return 'not-routable';
        }
    },

    /**
     * Gets the active Twilio Voice SDK call.
     * @returns {Object|null} The active call or null if none exists.
     * @private
     */
    _getActiveCall() {
        if (!window.Twilio || !window.Twilio.Device) {
            return null;
        }
        
        return window.Twilio.Device.activeConnection();
    },

    /**
     * Gets connections from a Twilio task.
     * @param {Object} task - The Twilio task.
     * @returns {Array} Array of connection objects.
     * @private
     */
    _getConnectionsFromTask(task) {
        // This is a simplified implementation
        // In a real implementation, you would get the connections from the Twilio Voice SDK
        const connections = [];
        
        // Add the customer connection
        if (task.attributes.customer) {
            connections.push({
                connectionId: `customer-${task.sid}`,
                state: { type: 'connected' },
                type: 'customer',
                endpoint: { address: task.attributes.customer.phoneNumber }
            });
        }
        
        // Add the agent connection
        connections.push({
            connectionId: `agent-${task.sid}`,
            state: { type: 'connected' },
            type: 'agent',
            endpoint: { address: agentInstance.attributes.extension }
        });
        
        // Add any conference participants
        if (task.attributes.conference && task.attributes.conference.participants) {
            task.attributes.conference.participants.forEach(participant => {
                if (participant.type !== 'customer' && participant.type !== 'agent') {
                    connections.push({
                        connectionId: participant.callSid,
                        state: { type: 'connected' },
                        type: participant.type,
                        endpoint: { address: participant.phoneNumber }
                    });
                }
            });
        }
        
        return connections;
    },

    /**
     * Gets a Twilio token for authentication.
     * @returns {string} The Twilio token.
     * @private
     */
    _getTwilioToken() {
        // In a real implementation, this would be provided by your backend
        // For this example, we'll return a placeholder
        return 'twilio-token-placeholder';
    },

    /**
     * Validates if an agent instance exists.
     * @returns {boolean} True if the agent instance exists, otherwise false.
     * @private
     */
    _validateAgentInstance() {
        return !!agentInstance;
    }
};