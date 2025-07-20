import agentService from "./agentService";

let contactInstance = null; // Stores the current contact instance
let callbacks = {}; // Callbacks for handling contact events

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
     */
    acceptContact() {
        if (!contactInstance) {
            alert("No contact instance available to accept.");
            return;
        }

        const connection = contactInstance.getInitialConnection();
        if (connection?.getType() === window.connect.ConnectionType.INBOUND) {
            connection.accept({
                success: () => {},
                failure: err => {},
            });
        }
    },

    /**
     * Decline or reject an incoming call.
     */
    declineContact() {
        if (!contactInstance) {
            alert("No contact instance available to decline.");
            return;
        }

        const connection = contactInstance.getInitialConnection();
        if (connection?.getType() === window.connect.ConnectionType.INBOUND) {
            connection.destroy({
                success: () => {},
                failure: err => {},
            });
        }
    },

    /**
     * Close (end) the active contact.
     */
    async endContact() {
        if (!this._validateContactInstance()) return;

        await this._destroyAgentConnection(contactInstance);

        await this._completeContactAndExitACW(contactInstance);
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
     * Handles asynchronous call actions (e.g., hold, resume).
     * @param {string} action - The action to perform (e.g., hold, resume).
     * @param {string} expectedStatus - The expected connection status to proceed.
     * @param {string} successMsg - Message to log on success.
     * @param {string} errorMsg - Message to log on failure.
     */
    _handleCallAction(action, expectedStatus, successMsg, errorMsg) {
        return new Promise((resolve, reject) => {
            if (!this._validateContactInstance()) {
                reject("No contact instance available.");
                return;
            }

            const connection = contactInstance.getAgentConnection();
            if (connection?.getStatus().type === expectedStatus) {
                connection[action]({
                    success: () => {
                        resolve(successMsg);
                    },
                    failure: err => {
                        reject(err);
                    },
                });
            } else {
                reject(`No connection to ${action} or the connection is not in the expected state.`);
            }
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

    _destroyAgentConnection(contactInstance) {
        const agentConnection = contactInstance.getAgentConnection();
        if (agentConnection) {
            agentConnection.destroy({
                success: () => {},
                failure: err => {},
            });
        }
    },

    _completeContactAndExitACW(contactInstance) {
        const contactStatus = contactInstance.getStatus();

        contactInstance.complete({
            success: () => {},
            failure: err => {},
        });

        this._exitAfterCallWork();
    },

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
};