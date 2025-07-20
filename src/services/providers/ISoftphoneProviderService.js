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
 * @property {() => void} [onCallEnded] - Triggered when the call/contact ends.
 * @property {() => void} [onLoginRequired] - Triggered when the agent must login to the softphone UI.
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
     */
    transferCall(number) {
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