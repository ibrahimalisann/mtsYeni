const axios = require('axios');
const { logActivity } = require('./logger');

const WA_TOOLBOX_URL = 'https://api.watoolbox.com/webhooks/2KY2MDY3A';

/**
 * Clean phone number to format required by WA Toolbox (e.g., 905551234567)
 * Removes spaces, dashes, parentheses and + sign.
 * @param {string} phone 
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    return phone.replace(/[^0-9]/g, '');
};

/**
 * Send WhatsApp text message via WA Toolbox
 * @param {string} phone - Recipient phone number
 * @param {string} message - Text content
 */
const sendWhatsAppMessage = async (phone, message) => {
    try {
        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
            console.warn('WhatsApp sending failed: Invalid phone number', phone);
            return false;
        }

        const payload = {
            action: 'send-message',
            type: 'text',
            phone: formattedPhone,
            content: message
        };

        const response = await axios.post(WA_TOOLBOX_URL, payload);

        console.log(`WhatsApp sent to ${formattedPhone}:`, response.data);
        return true;
    } catch (error) {
        console.error('WhatsApp sending failed:', error.message);
        // Log deep error details if available
        if (error.response) {
            console.error('WA API Error Response:', error.response.data);
        }
        return false;
    }
};

module.exports = {
    sendWhatsAppMessage
};
