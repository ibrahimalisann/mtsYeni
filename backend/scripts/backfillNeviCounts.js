const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mts-mongo:27017/mts_db';

async function main() {
    // Connect without deprecated driver options (handled by mongoose internally)
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', MONGO_URI);

    const cursor = Reservation.find({ $or: [ { neviCounts: { $exists: false } }, { neviCounts: null } ] }).cursor();
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const gc = parseInt(doc.guestCount) || 1;
        const final = { talebe: gc, hocaefendi: 0, ihvan: 0, muhibban: 0, diger: 0 };
        try {
            await Reservation.updateOne({ _id: doc._id }, { $set: { neviCounts: final } });
            console.log(`Updated ${doc._id}: guestCount=${gc} -> neviCounts talebe=${gc}`);
            updated++;
        } catch (err) {
            console.error('Failed to update', doc._id, err.message);
        }
    }

    console.log('Backfill completed. Total updated:', updated);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Backfill error:', err);
    process.exit(1);
});
