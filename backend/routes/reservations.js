const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET all reservations (protected - requires login)
router.get('/', verifyToken, async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('guest');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET check-availability
router.get('/check-availability', async (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;
        if (!checkIn || !checkOut) {
            return res.status(400).json({ message: 'Tarih parametreleri eksik.' });
        }

        const start = new Date(checkIn);
        const end = new Date(checkOut);

        // Find overlapping reservations
        // (ResStart < ReqEnd) AND (ResEnd > ReqStart)
        const reservations = await Reservation.find({
            status: { $ne: 'cancelled' },
            checkInDate: { $lt: end },
            checkOutDate: { $gt: start }
        });

        // Calculate used capacity
        const totalGuests = reservations.reduce((sum, r) => sum + r.guestCount, 0);
        const MAX_CAPACITY = 9;
        const available = Math.max(0, MAX_CAPACITY - totalGuests);

        res.json({
            available,
            totalGuests,
            isAvailable: available > 0,
            message: available > 0
                ? `Müsaitlik var. (${available} kişilik yer kaldı)`
                : `Müsaitlik yok. (Tamamen dolu)`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single reservation
router.get('/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        res.json(reservation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new reservation (public - no auth required)
router.post('/', async (req, res) => {
    // Expects guestId or guest object to create new?
    const { guestId, guestCount, checkInDate, checkOutDate, notes, additionalGuests, assignedRooms, registrar } = req.body;

    const reservation = new Reservation({
        guest: guestId,
        guestCount: guestCount || 1,
        checkInDate,
        checkOutDate,
        notes,
        additionalGuests,
        assignedRooms: assignedRooms || [],
        registrar,
        status: 'pending' // Default to pending (Müsaitlik Var)
    });

    try {
        const newReservation = await reservation.save();
        res.status(201).json(newReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update reservation (protected - admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { assignedRooms, status, notes, guestCount, checkInDate, checkOutDate, additionalGuests, registrar, rejectionReason } = req.body;
        const updateData = {};

        if (assignedRooms !== undefined) updateData.assignedRooms = assignedRooms;
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (guestCount !== undefined) updateData.guestCount = guestCount;
        if (checkInDate !== undefined) updateData.checkInDate = checkInDate;
        if (checkOutDate !== undefined) updateData.checkOutDate = checkOutDate;
        if (additionalGuests !== undefined) updateData.additionalGuests = additionalGuests;
        if (registrar !== undefined) updateData.registrar = registrar;
        if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

        const updatedReservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('guest');

        if (!updatedReservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        res.json(updatedReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE reservation (protected - admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const deletedReservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!deletedReservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }
        res.json({ message: 'Rezervasyon başarıyla silindi', reservation: deletedReservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
