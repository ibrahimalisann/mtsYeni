const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Calculate total capacity from active rooms
        const rooms = await Room.find({ isActive: true });
        const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

        // Active reservations (currently staying)
        const activeReservations = await Reservation.find({
            status: 'active'
        }).populate('guest');

        // Calculate occupied beds
        let occupiedBeds = 0;
        activeReservations.forEach(res => {
            occupiedBeds += res.guestCount || 1;
        });

        // Arrivals Today (CheckIn matches today)
        const arrivalsToday = await Reservation.find({
            checkInDate: { $gte: today, $lt: tomorrow },
            status: { $in: ['confirmed', 'upcoming'] }
        }).populate('guest');

        // Departures Today
        const departuresToday = await Reservation.find({
            checkOutDate: { $gte: today, $lt: tomorrow },
            status: 'active'
        }).populate('guest');

        // Upcoming arrivals - next 7 days
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const upcomingWeek = await Reservation.find({
            checkInDate: { $gte: tomorrow, $lt: nextWeek },
            status: { $in: ['confirmed', 'upcoming'] }
        }).populate('guest').sort({ checkInDate: 1 });

        // Upcoming arrivals - next 30 days
        const next30Days = new Date(today);
        next30Days.setDate(next30Days.getDate() + 30);

        const upcoming30Days = await Reservation.find({
            checkInDate: { $gte: nextWeek, $lt: next30Days },
            status: { $in: ['confirmed', 'upcoming'] }
        }).populate('guest').sort({ checkInDate: 1 });

        // Pending reservations (awaiting approval)
        const pendingReservations = await Reservation.find({
            status: 'pending'
        }).populate('guest').sort({ createdAt: -1 });

        // Confirmed/active reservations without full room assignments
        const confirmedReservations = await Reservation.find({
            status: { $in: ['confirmed', 'active'] },
            checkOutDate: { $gte: today }
        }).populate('guest');

        // Filter to find unassigned ones
        const unassignedReservations = confirmedReservations.filter(r => {
            if (!r.roomAssignments || r.roomAssignments.length === 0) {
                // No room assignments at all
                return !(r.assignedRooms && r.assignedRooms.length > 0);
            }
            // Has roomAssignments - check if all guests are assigned
            const totalAssigned = r.roomAssignments.reduce((sum, a) => sum + a.guestCount, 0);
            return totalAssigned < r.guestCount;
        });

        res.json({
            occupancy: occupiedBeds,
            totalCapacity: totalCapacity,
            arrivals: arrivalsToday.length,
            arrivalsData: arrivalsToday.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                status: r.status,
                assignedRooms: r.assignedRooms,
                roomAssignments: r.roomAssignments
            })),
            departures: departuresToday.length,
            departuresData: departuresToday.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                status: r.status,
                assignedRooms: r.assignedRooms,
                roomAssignments: r.roomAssignments
            })),
            upcomingWeek: upcomingWeek.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                status: r.status,
                assignedRooms: r.assignedRooms,
                roomAssignments: r.roomAssignments,
                additionalGuests: r.additionalGuests
            })),
            upcoming30Days: upcoming30Days.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                status: r.status,
                assignedRooms: r.assignedRooms,
                roomAssignments: r.roomAssignments,
                additionalGuests: r.additionalGuests
            })),
            // New: Pending reservations awaiting approval
            pendingCount: pendingReservations.length,
            pendingReservations: pendingReservations.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                createdAt: r.createdAt
            })),
            // New: Reservations needing room assignment
            unassignedCount: unassignedReservations.length,
            unassignedReservations: unassignedReservations.map(r => ({
                _id: r._id,
                guest: r.guest,
                guestCount: r.guestCount,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate,
                registrar: r.registrar,
                status: r.status,
                assignedRooms: r.assignedRooms,
                roomAssignments: r.roomAssignments
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
