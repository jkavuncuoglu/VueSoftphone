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
     */
    placeCall(phoneNumber) {
        const agentInstance = agentService.getAgentInstance();
        if (!agentInstance) {
            alert("Agent is not ready.");
            return;
        }

        const endpoint = window.connect.Endpoint.byPhoneNumber(phoneNumber);
        agentInstance.connect(endpoint, {
            success: () => {
                return true;
            },
            failure: (err) => {
                throw new Error(err)
            }
        });

        // Monitor contact events
        window.connect.contact((contact) => {
            contact.onConnecting(() => {
                callbacks.onConnecting?.(contact);
            });

            contact.onConnected(() => {
                callbacks.onConnected?.(contact);
            });

            contact.onCallEnded(() => {
                callbacks.onCallEnded?.(contact);
            });
        });
    },

    /**
     * Hang up the current active call.
     */
    hangUpCall() {
        contactService.endContact()
    },

    /**
     * Hold Call
     */
    holdCall() {
        return contactService.holdCall()
            .then((response) => {
                return response;
            })
            .catch((errorMessage) => {
                throw new Error(errorMessage);
            });
    },

    /**
     * Resume Call
     */
    resumeCall() {
        return contactService.resumeCall()
            .then((response) => {
                return response;
            })
            .catch((errorMessage) => {
                throw new Error(errorMessage);
            });
    },


    /**
     * Transfer the current call to another number.
     * @param {string} number - The phone number to transfer the call to.
     * @param isWarmTransfer
     */
    transferCall(number, isWarmTransfer = false) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            throw new Error("No active contact available for transfer.");
        }

        const endpoint = window.connect.Endpoint.byPhoneNumber(number);

        try {
            if (isWarmTransfer) {

                return contactInstance.addConnection(endpoint, {
                    success: () => {
                        return true
                    },
                    failure: (error) => {
                        throw new Error(error);
                    },
                });
            } else {
                return contactInstance.toggleActiveConnections(endpoint, {
                    success: () => {
                        return false;
                    },
                    failure: (error) => {
                        throw new Error(error);
                    },
                });
            }
        } catch (error) {
            throw new Error(error);
        }
    },

    endTransferCall(isAgentDisconnect = false) {
        const contactInstance = contactService.getContactInstance();
        if (!contactInstance) {
            throw new Error("No active contact available to end.");
        }

        try {
            if (isAgentDisconnect) {
                // Disconnect the agent connection only
                const agentConnection = contactInstance.getAgentConnection();
                if (agentConnection) {
                    agentConnection.destroy({
                        success: () => {},
                        failure: (error) => {}
                    });
                }
            } else {
                // End the entire transfer call
                this.hangUpCall()
            }
        } catch (error) {
            throw new Error(error);
        }
    },

    /**
     * Accept an incoming call.
     */
    acceptIncomingCall() {
        contactService.acceptContact();
    },

    /**
     * Decline an incoming call.
     */
    declineIncomingCall() {
        contactService.declineContact();
    },

    /**
     * Mute the active call.
     */
    muteConnection() {
        agentService.mute();
    },

    /**
     * Unmute the active call.
     */
    unmuteConnection() {
        agentService.unmute();
    },

    /**
     * Open the Amazon Connect CCP login modal.
     */
    openLogin() {
        const container = document.getElementById('ccpContainer');
        container?.click(); // Trigger iframe login if needed
        callbacks.onLoginRequired?.();
    }
};