let agentInstance = null; // Stores the current agent instance
let callbacks = {}; // Callbacks for various agent events

export default {
    /**
     * Initialize the agent service.
     * @param {Object} options - Callbacks for agent events (e.g., state change, mute toggle, etc.).
     */
    initializeAgent(options = {}) {
        callbacks = options;

        if (!window.connect) {
            return;
        }

        window.connect.agent(agent => {
            agentInstance = agent;

            callbacks.onAgentAvailable?.(agent);

            this._setupAgentEventListeners(agent);
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
     * Set the agent's status (e.g., Available, Offline).
     * @param {string} status - The desired agent status.
     */
    setAgentStatus(status) {
        if (!this._validateAgentInstance("set agent status")) return;

        const routableState = agentInstance.getAgentStates().find(state => state.name === status);

        if (routableState) {
            agentInstance.setState(routableState, {
                success: () => {
                    callbacks.onStatusSet?.(status);
                },
                failure: err => {},
            });
        }
    },

    getCcpLogs() {
        if (!window.connect) {
            return []
        }

        try {
            return window.connect
                .getLog()
                ._rolledLogs
                .concat(window.connect.getLog()._logs);
        } catch (error) {
            return []
        }
    },

    /**
     * Mute the agent's microphone.
     */
    mute() {
        if (!this._validateAgentInstance("mute the microphone")) return;

        agentInstance.mute();
        callbacks.onMuteChange?.(true);
    },

    /**
     * Unmute the agent's microphone.
     */
    unmute() {
        if (!this._validateAgentInstance("unmute the microphone")) return;

        agentInstance.unmute();
        callbacks.onMuteChange?.(false);
    },

    /**
     * Sets up event listeners for the agent instance.
     * @param {Object} agent - The agent instance.
     */
    _setupAgentEventListeners(agent) {
        agent.onStateChange(state => {
            callbacks.onStateChange?.(state.newState);
        });

        agent.onMuteToggle(() => {
            const isMuted = agent.isMuted();
            callbacks.onMuteChange?.(isMuted);
        });
    },

    /**
     * Validates if an agent instance exists and logs an error if not.
     * @param {string} action - The action name for contextual error logging.
     * @returns {boolean} True if the agent instance exists, otherwise false.
     */
    _validateAgentInstance(action) {
        if (!agentInstance) {
            return false;
        }
        return true;
    },
};