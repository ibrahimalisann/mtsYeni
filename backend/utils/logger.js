const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity
 * @param {Object} params
 * @param {Object} params.user - User object with userId, email, name
 * @param {string} params.action - Action type (from enum)
 * @param {string} params.description - Human-readable description
 * @param {Object} params.entity - Entity affected (type, id, name)
 * @param {Object} params.details - Additional details
 * @param {string} params.ipAddress - IP address
 */
const logActivity = async ({
    user,
    action,
    description,
    entity = {},
    details = {},
    ipAddress = null
}) => {
    try {
        const log = new ActivityLog({
            user: {
                userId: user?.id || user?._id,
                email: user?.email || 'Sistem',
                name: user?.name || user?.email
            },
            action,
            description,
            entity,
            details,
            ipAddress
        });
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - logging should not break main functionality
        return null;
    }
};

/**
 * Helper to get client IP from request
 */
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        null;
};

/**
 * Format date for display in Turkish
 */
const formatDateTR = (date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

module.exports = {
    logActivity,
    getClientIp,
    formatDateTR
};
