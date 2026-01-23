const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { logActivity, getClientIp, formatDateTR } = require('../utils/logger');

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
        status: 'pending'
    });

    try {
        const newReservation = await reservation.save();
        const populatedRes = await Reservation.findById(newReservation._id).populate('guest');

        // Log the activity
        const guestName = populatedRes.guest
            ? `${populatedRes.guest.firstName} ${populatedRes.guest.lastName}`
            : 'Bilinmeyen Misafir';

        await logActivity({
            user: { email: registrar?.email || 'Form', name: registrar?.firstName ? `${registrar.firstName} ${registrar.lastName}` : 'Web Form' },
            action: 'reservation_created',
            description: `Yeni rezervasyon oluşturuldu: ${guestName} (${guestCount || 1} kişi) - ${formatDateTR(checkInDate)} / ${formatDateTR(checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: newReservation._id,
                name: guestName
            },
            details: {
                guestCount: guestCount || 1,
                checkInDate,
                checkOutDate,
                registrar
            },
            ipAddress: getClientIp(req)
        });

        res.status(201).json(populatedRes);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update reservation (protected - admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { assignedRooms, roomAssignments, status, notes, guestCount, checkInDate, checkOutDate, additionalGuests, registrar, rejectionReason } = req.body;

        // Get previous state for comparison
        const previousReservation = await Reservation.findById(req.params.id).populate('guest');
        if (!previousReservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const previousStatus = previousReservation.status;
        const guestName = previousReservation.guest
            ? `${previousReservation.guest.firstName} ${previousReservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        const updateData = {};
        if (assignedRooms !== undefined) updateData.assignedRooms = assignedRooms;
        if (roomAssignments !== undefined) updateData.roomAssignments = roomAssignments;
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

        // Determine action type and log
        let action = 'reservation_updated';
        let description = `Rezervasyon güncellendi: ${guestName}`;

        if (status && status !== previousStatus) {
            switch (status) {
                case 'confirmed':
                    action = 'reservation_confirmed';
                    description = `Rezervasyon onaylandı: ${guestName} (${previousReservation.guestCount} kişi) - ${formatDateTR(previousReservation.checkInDate)} / ${formatDateTR(previousReservation.checkOutDate)}`;
                    break;
                case 'cancelled':
                    action = 'reservation_cancelled';
                    description = `Rezervasyon iptal edildi: ${guestName}${rejectionReason ? ` - Sebep: ${rejectionReason}` : ''}`;
                    break;
                case 'active':
                    action = 'reservation_activated';
                    description = `Rezervasyon aktif edildi (giriş yapıldı): ${guestName}`;
                    break;
                case 'completed':
                    action = 'reservation_completed';
                    description = `Rezervasyon tamamlandı (çıkış yapıldı): ${guestName}`;
                    break;
                case 'pending':
                    if (previousStatus === 'confirmed') {
                        action = 'reservation_rejected';
                        description = `Rezervasyon reddedildi: ${guestName}${rejectionReason ? ` - Sebep: ${rejectionReason}` : ''}`;
                    }
                    break;
            }
        }

        // Check if room assignment changed
        if (roomAssignments !== undefined) {
            const roomNames = roomAssignments.map(r => `${r.roomName} (${r.guestCount})`).join(', ');
            action = 'room_assigned';
            description = `Oda ataması yapıldı: ${guestName} → ${roomNames || 'Odalar kaldırıldı'}`;
        }

        await logActivity({
            user: req.user,
            action,
            description,
            entity: {
                type: 'reservation',
                id: previousReservation._id,
                name: guestName
            },
            details: {
                previousStatus,
                newStatus: status,
                changes: updateData
            },
            ipAddress: getClientIp(req)
        });

        res.json(updatedReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE reservation (protected - admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const guestName = reservation.guest
            ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        await Reservation.findByIdAndDelete(req.params.id);

        await logActivity({
            user: req.user,
            action: 'reservation_deleted',
            description: `Rezervasyon silindi: ${guestName} (${reservation.guestCount} kişi) - ${formatDateTR(reservation.checkInDate)} / ${formatDateTR(reservation.checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: reservation._id,
                name: guestName
            },
            details: {
                guestCount: reservation.guestCount,
                checkInDate: reservation.checkInDate,
                checkOutDate: reservation.checkOutDate,
                status: reservation.status
            },
            ipAddress: getClientIp(req)
        });

        res.json({ message: 'Rezervasyon başarıyla silindi', reservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
