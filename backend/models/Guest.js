const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    identityNumber: { type: String }, // Made optional
    phone: { type: String, required: true },
    email: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Guest', guestSchema);
