/**
 * Utility functions for handling calls.
 */

/**
 * Formats a raw phone number into a more readable format (e.g., (123) 456-7890).
 * @param {string} phoneNumber - The raw phone number (e.g., "+11234567890").
 * @returns {string} The formatted phone number.
 */
export function formatPhoneNumber(phoneNumber) {
    const cleaned = ("" + phoneNumber).replace(/\D/g, "");
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phoneNumber; // Return the raw number if formatting fails
}

/**
 * Validates if a given phone number is in E.164 format.
 * @param {string} phoneNumber - The phone number to validate.
 * @returns {boolean} Returns true if the phone number is valid, false otherwise.
 */
export function isValidPhoneNumber(phoneNumber) {
    const e164Regex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return e164Regex.test(phoneNumber);
}

/**
 * Normalizes a phone number to E.164 format.
 * @param {string} phoneNumber - The phone number to normalize (e.g., "123-456-7890").
 * @param {string} countryCode - The country code to prepend if the phone number is missing one (e.g., "+1").
 * @returns {string} The normalized E.164 phone number.
 */
export function normalizeToE164(phoneNumber, countryCode = "+1") {
    const cleaned = ("" + phoneNumber).replace(/\D/g, "");
    if (cleaned.startsWith("1")) {
        return `+${cleaned}`; // Already has the country code
    }
    return `${countryCode}${cleaned}`;
}

/**
 * Format duration in seconds to a human-readable format (hh:mm:ss).
 * @param {number} seconds - Total seconds to format.
 * @returns {string} Formatted duration string.
 */

export function formatDuration(seconds) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
}


export default {
    normalizeToE164,
    formatDuration,
};