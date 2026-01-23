const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Who performed the action
    user: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String, required: true },
        name: { type: String }
    },
    // What action was performed
    action: {
        type: String,
        enum: [
            'reservation_created',
            'reservation_updated',
            'reservation_confirmed',
            'reservation_rejected',
            'reservation_cancelled',
            'reservation_activated',
            'reservation_completed',
            'reservation_deleted',
            'room_assigned',
            'room_created',
            'room_updated',
            'room_deleted',
            'guest_created',
            'guest_updated',
            'guest_deleted',
            'user_login',
            'user_logout',
            'settings_updated',
            'other'
        ],
        required: true
    },
    // Human-readable description
    description: { type: String, required: true },
    // What entity was affected
    entity: {
        type: { type: String }, // 'reservation', 'room', 'guest', 'user', 'settings'
        id: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String } // Human-readable name for the entity
    },
    // Additional details (JSON)
    details: { type: mongoose.Schema.Types.Mixed },
    // IP address (optional)
    ipAddress: { type: String },
    // Timestamp
    createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ 'entity.type': 1, 'entity.id': 1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
