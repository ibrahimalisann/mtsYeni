const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

router.get('/', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Active reservations (Occupied Rooms)
        const activeCount = await Reservation.countDocuments({
            status: 'active'
        });

        // Arrivals Today (CheckIn matches today)
        // We need to match date range or strict equality depending on storage.
        // Assuming UTC vs Local issues, range is safer.
        const arrivalsCount = await Reservation.countDocuments({
            checkInDate: { $gte: today, $lt: tomorrow },
            status: 'upcoming'
        });

        // Departures Today
        const departuresCount = await Reservation.countDocuments({
            checkOutDate: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        res.json({
            occupancy: activeCount,
            arrivals: arrivalsCount,
            departures: departuresCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
