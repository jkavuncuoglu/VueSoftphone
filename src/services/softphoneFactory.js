import amazonConnectService from './providers/AmazonConnect/amazonConnectService';
import twilioService from './providers/Twilio/twilioService';
// import eightByEightService from './eightByEightService';

/**
 * Returns a telephony service instance based on provider name.
 *
 * @param {string} provider - The name of the telephony provider.
 * @returns {Object} - Telephony service instance implementing ITelephonyService.
 */
export function getSoftphoneService(provider = 'amazon-connect') {
    switch (provider) {
        case 'amazon-connect':
            return amazonConnectService;
        case 'twilio':
            return twilioService;
        // case '8x8':
        //   return eightByEightService;
        default:
            throw new Error(`Unknown telephony provider: ${provider}`);
    }
}