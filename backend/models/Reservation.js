const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
    assignedRooms: [{ type: String }], // Array of room names e.g., ['Ferah', 'Kısıklı'] (legacy)
    roomAssignments: [{
        roomName: { type: String, required: true },
        guestCount: { type: Number, required: true, min: 1 }
    }], // New: Guest count per room, e.g., [{roomName: 'Ferah', guestCount: 2}]
    guestCount: { type: Number, required: true, default: 1 }, // Added guest count
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    additionalGuests: [{
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        nevi: { type: String }
    }],
    registrar: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        country: { type: String },
        city: { type: String }
    },
    notes: { type: String },
    rejectionReason: { type: String }, // Reason for rejection/cancellation
    ek1FilePath: { type: String }, // Path to Ek-1 file
    isArchived: { type: Boolean, default: false }, // Archive status
    archivedAt: { type: Date }, // Archive timestamp
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);
