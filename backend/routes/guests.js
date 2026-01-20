const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');

// GET all guests
router.get('/', async (req, res) => {
    try {
        const guests = await Guest.find().sort({ createdAt: -1 });
        res.json(guests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new guest
router.post('/', async (req, res) => {
    const guest = new Guest({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        identityNumber: req.body.identityNumber,
        phone: req.body.phone,
        email: req.body.email
    });

    try {
        const newGuest = await guest.save();
        res.status(201).json(newGuest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET guest search by ID/Name (Optional helper)
router.get('/search', async (req, res) => {
    const { q } = req.query;
    try {
        const guests = await Guest.find({
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } },
                { identityNumber: { $regex: q, $options: 'i' } }
            ]
        });
        res.json(guests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
