const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const Guest = require('../models/Guest');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const ACCEPTANCE_FILE = path.join(__dirname, '../data/acceptanceProgram.json');
const MUSAFIRHANE_FILE = path.join(__dirname, '../data/musafirhaneVisit.json');

async function readJsonRecords(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.records) ? parsed.records : [];
    } catch {
        return [];
    }
}

function toTimestamp(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
}

router.get('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [yatiliGuests, acceptanceRecords, musafirhaneRecords] = await Promise.all([
            Guest.find().sort({ createdAt: -1 }).lean(),
            readJsonRecords(ACCEPTANCE_FILE),
            readJsonRecords(MUSAFIRHANE_FILE)
        ]);

        const yatiliRows = yatiliGuests.map((guest) => ({
            id: `yatili-${guest._id}`,
            adSoyad: `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
            telefonNumarasi: guest.phone || '',
            kayitSekli: 'Yatili',
            createdAt: guest.createdAt || null
        }));

        const acceptanceRows = acceptanceRecords.map((record, index) => ({
            id: `kabul-${record.id || index}`,
            adSoyad: String(record.adiSoyadi || record.soyadi || '').trim(),
            telefonNumarasi: record.telefon || '',
            kayitSekli: 'Kabul Programi',
            createdAt: record.createdAt || null
        }));

        const musafirhaneRows = musafirhaneRecords.map((record, index) => ({
            id: `musafirhane-${record.id || index}`,
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
        res.status(500).json({ message: 'Misafir listesi alinmadi.' });
    }
});

module.exports = router;
