/**
 * Interface documentation for a telephony service.
 * All provider-specific services (e.g., Amazon Connect, Twilio, 8x8)
 * should implement these methods.
 */

/**
 * @typedef {Object} TelephonyCallbacks
 * @property {(status: string) => void} [onStatusChange] - Triggered when agent status changes (e.g., Available, Busy).
 * @property {(muted: boolean) => void} [onMuteChange] - Triggered when the mute state changes.
 * @property {(contact: object) => void} [onIncomingCall] - Triggered when an inbound call arrives.
 * @property {(contact: object) => void} [onConnecting] - Triggered when a call is connecting.
 * @property {(contact: object) => void} [onConnected] - Triggered when a call is connected.
 * @property {(contact: object) => void} [onCallAccepted] - Triggered when a call is accepted.
 * @property {(contact: object) => void} [onMissed] - Triggered when a call is missed.
 * @property {(contact: object) => void} [onPending] - Triggered when a call is pending.
 * @property {(contact: object) => void} [onRefresh] - Triggered when a call is refreshed.
 * @property {(contact: object) => void} [onCallEnded] - Triggered when the call/contact ends.
 * @property {(error: any, contact: object) => void} [onError] - Triggered when an error occurs.
 * @property {() => void} [onLoginRequired] - Triggered when the agent must login to the softphone UI.
 * @property {() => void} [onLoginSuccess] - Triggered when login is successful.
 * @property {() => void} [onLogout] - Triggered when the agent logs out.
 */

/**
 * @interface ITelephonyService
 */
export default class ITelephonyService {
    /**
     * Initialize the telephony service and attach event listeners.
     * @param {TelephonyCallbacks} options
     */
    initialize(options) {
        throw new Error('Not implemented');
    }

    /**
     * Place an outbound call.
     * @param {string} phoneNumber - The phone number to dial.
     */
    placeCall(phoneNumber) {
        throw new Error('Not implemented');
    }

    /**
     * Hang up the active call.
     */
    hangUpCall() {
        throw new Error('Not implemented');
    }

    /**
     * Accept Incoming Call
     */
    acceptIncomingCall() {
        throw new Error('Not implemented');
    }

    /**
     * Decline Incoming Call
     */
    declineIncomingCall() {
        throw new Error('Not implemented');
    }

    /**
     * Transfer the active call to another number.
     * @param {string} number - The phone number to transfer to.
     * @param {boolean} [isWarmTransfer=false] - Whether to perform a warm transfer.
     */
    transferCall(number, isWarmTransfer) {
        throw new Error('Not implemented');
    }

    /**
     * End a transfer call.
     * @param {boolean} [isAgentDisconnect=false] - Whether to disconnect only the agent connection.
     */
    endTransferCall(isAgentDisconnect) {
        throw new Error('Not implemented');
    }

    /**
     * Put the current active call on hold.
     * @returns {Promise} Resolves if the hold call is successful, rejects otherwise.
     */
    holdCall() {
        throw new Error('Not implemented');
    }

    /**
     * Resume the current active call from the hold state.
     * @returns {Promise} Resolves if the resume call is successful, rejects otherwise.
     */
    resumeCall() {
        throw new Error('Not implemented');
    }

    /**
     * Mute the microphone.
     */
    mute() {
        throw new Error('Not implemented');
    }

    /**
     * Unmute the microphone.
     */
    unmute() {
        throw new Error('Not implemented');
    }

    /**
     * Re-open or trigger the login UI for the provider.
     */
    openLogin() {
        throw new Error('Not implemented');
    }
}