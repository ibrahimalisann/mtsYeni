const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { logActivity, getClientIp } = require('../utils/logger');

// GET /api/rooms - Get all rooms (protected)
router.get('/', verifyToken, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/rooms/active - Get only active rooms (protected)
router.get('/active', verifyToken, async (req, res) => {
    try {
        const rooms = await Room.find({ isActive: true }).sort({ name: 1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/rooms/occupancy - Get room occupancy for date range (protected)
router.get('/occupancy', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Başlangıç ve bitiş tarihleri gerekli.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get all active rooms
        const rooms = await Room.find({ isActive: true }).sort({ name: 1 });

        // Get reservations overlapping with date range (excluding cancelled and pending)
        // Must be confirmed or active to count towards occupancy
        const reservations = await Reservation.find({
            status: { $in: ['confirmed', 'active'] },
            checkInDate: { $lt: end },
            checkOutDate: { $gt: start }
        }).populate('guest');

        // Calculate occupancy for each room
        const occupancy = rooms.map(room => {
            // Find reservations assigned to this room (check both new and legacy format)
            const roomReservations = reservations.filter(res => {
                // Check new format: roomAssignments
                if (res.roomAssignments && res.roomAssignments.length > 0) {
                    return res.roomAssignments.some(a => a.roomName === room.name);
                }
                // Check legacy format: assignedRooms
                if (res.assignedRooms && res.assignedRooms.length > 0) {
                    return res.assignedRooms.includes(room.name);
                }
                return false;
            });

            // Calculate total occupied beds in this room
            let occupiedBeds = 0;
            roomReservations.forEach(res => {
                if (res.roomAssignments && res.roomAssignments.length > 0) {
                    // New format: use roomAssignments
                    const assignment = res.roomAssignments.find(a => a.roomName === room.name);
                    if (assignment) {
                        occupiedBeds += assignment.guestCount;
                    }
                } else if (res.assignedRooms && res.assignedRooms.length > 0) {
                    // Legacy: old format without guest count per room
                    // Distribute guests evenly across assigned rooms
                    const roomCount = res.assignedRooms.length;
                    occupiedBeds += Math.ceil(res.guestCount / roomCount);
                }
            });

            return {
                room: room,
                capacity: room.capacity,
                occupiedBeds: occupiedBeds,
                availableBeds: Math.max(0, room.capacity - occupiedBeds),
                occupancyPercent: Math.round((occupiedBeds / room.capacity) * 100),
                reservations: roomReservations.map(res => {
                    // Find guest count for this specific room
                    let guestsInThisRoom = 0;
                    if (res.roomAssignments && res.roomAssignments.length > 0) {
                        const assignment = res.roomAssignments.find(a => a.roomName === room.name);
                        guestsInThisRoom = assignment ? assignment.guestCount : 0;
                    } else if (res.assignedRooms && res.assignedRooms.length > 0) {
                        guestsInThisRoom = Math.ceil(res.guestCount / res.assignedRooms.length);
                    }

                    return {
                        _id: res._id,
                        guest: res.guest,
                        checkInDate: res.checkInDate,
                        checkOutDate: res.checkOutDate,
                        guestCount: res.guestCount,
                        guestsInThisRoom: guestsInThisRoom,
                        roomAssignments: res.roomAssignments,
                        status: res.status
                    };
                }),
                isOccupied: occupiedBeds > 0,
                isFull: occupiedBeds >= room.capacity,
                occupiedDates: roomReservations.map(res => ({
                    start: res.checkInDate,
                    end: res.checkOutDate
                }))
            };
        });

        res.json(occupancy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/rooms/:id - Get single room (protected)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Oda bulunamadı' });
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/rooms - Create new room (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { name, capacity, description, isActive } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Oda adı gereklidir.' });
    }

    // Check if room name already exists
    const existingRoom = await Room.findOne({ name: name.trim() });
    if (existingRoom) {
        return res.status(400).json({ message: 'Bu isimde bir oda zaten mevcut.' });
    }

    const room = new Room({
        name: name.trim(),
        capacity: capacity || 1,
        description: description || '',
        isActive: isActive !== undefined ? isActive : true
    });

    try {
        const newRoom = await room.save();

        await logActivity({
            user: req.user,
            action: 'room_created',
            description: `Yeni oda oluşturuldu: ${newRoom.name} (${newRoom.capacity} yatak)`,
            entity: {
                type: 'room',
                id: newRoom._id,
                name: newRoom.name
            },
            details: {
                capacity: newRoom.capacity,
                description: newRoom.description
            },
            ipAddress: getClientIp(req)
        });

        res.status(201).json(newRoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/rooms/:id - Update room (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, capacity, description, isActive } = req.body;
        const updateData = {};

        if (name !== undefined) {
            // Check if new name already exists (excluding current room)
            const existingRoom = await Room.findOne({
                name: name.trim(),
                _id: { $ne: req.params.id }
            });
            if (existingRoom) {
                return res.status(400).json({ message: 'Bu isimde bir oda zaten mevcut.' });
            }
            updateData.name = name.trim();
        }
        if (capacity !== undefined) updateData.capacity = capacity;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedRoom) {
            return res.status(404).json({ message: 'Oda bulunamadı' });
        }

        await logActivity({
            user: req.user,
            action: 'room_updated',
            description: `Oda güncellendi: ${updatedRoom.name}`,
            entity: {
                type: 'room',
                id: updatedRoom._id,
                name: updatedRoom.name
            },
            details: { changes: updateData },
            ipAddress: getClientIp(req)
        });

        res.json(updatedRoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/rooms/:id - Delete room (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Oda bulunamadı' });
        }

        const roomName = room.name;
        await Room.findByIdAndDelete(req.params.id);

        await logActivity({
            user: req.user,
            action: 'room_deleted',
            description: `Oda silindi: ${roomName}`,
            entity: {
                type: 'room',
                id: room._id,
                name: roomName
            },
            details: { capacity: room.capacity },
            ipAddress: getClientIp(req)
        });

        res.json({ message: 'Oda başarıyla silindi', room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
