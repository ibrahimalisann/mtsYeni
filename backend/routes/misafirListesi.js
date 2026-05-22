const express = require('express');
const Guest = require('../models/Guest');
const AcceptanceProgram = require('../models/AcceptanceProgram');
const MusafirhaneVisit = require('../models/MusafirhaneVisit');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

function toTimestamp(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
}

router.get('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [yatiliGuests, acceptanceRecords, musafirhaneRecords] = await Promise.all([
            Guest.find().sort({ createdAt: -1 }).lean(),
            AcceptanceProgram.find().sort({ createdAt: -1 }).lean(),
            MusafirhaneVisit.find().sort({ createdAt: -1 }).lean()
        ]);

        const yatiliRows = yatiliGuests.map((guest) => ({
            id: `yatili-${guest._id}`,
            adSoyad: `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
            telefonNumarasi: guest.phone || '',
            kayitSekli: 'Yatili',
            createdAt: guest.createdAt || null
        }));

        const acceptanceRows = acceptanceRecords.map((record) => ({
            id: `kabul-${record._id || record.id}`,
            adSoyad: String(record.adiSoyadi || record.soyadi || '').trim(),
            telefonNumarasi: record.telefon || '',
            kayitSekli: 'Kabul Programi',
            createdAt: record.createdAt || null
        }));

        const musafirhaneRows = musafirhaneRecords.map((record) => ({
            id: `musafirhane-${record._id || record.id}`,
            adSoyad: String(record.adiSoyadi || '').trim(),
            telefonNumarasi: record.telefonNumarasi || '',
            kayitSekli: 'Musafirhane Ziyareti',
            createdAt: record.createdAt || null
        }));

        const rows = [...yatiliRows, ...acceptanceRows, ...musafirhaneRows]
            .filter((item) => item.adSoyad || item.telefonNumarasi)
            .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

        res.json(rows);
    } catch (error) {
        console.error('Error fetching guest list:', error);
        res.status(500).json({ message: 'Misafir listesi alinmadi.' });
    }
});

module.exports = router;
