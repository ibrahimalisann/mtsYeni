const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Helper to read settings
async function readSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading settings:', error);
        // Default settings if file missing
        return { maxCapacity: 9 };
    }
}

// Helper to write settings
async function writeSettings(data) {
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing settings:', error);
        return false;
    }
}

// GET /api/settings - Get current settings (public)
router.get('/', async (req, res) => {
    try {
        const settings = await readSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

// PUT /api/settings - Update settings (admin only)
router.put('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { maxCapacity } = req.body;

        if (maxCapacity === undefined || maxCapacity < 1) {
            return res.status(400).json({ message: 'Valid max capacity is required' });
        }

        const currentSettings = await readSettings();

        const newSettings = {
            ...currentSettings,
            maxCapacity: parseInt(maxCapacity),
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };

        const success = await writeSettings(newSettings);
        if (!success) {
            return res.status(500).json({ message: 'Error saving settings' });
        }

        res.json(newSettings);
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

module.exports = router;
