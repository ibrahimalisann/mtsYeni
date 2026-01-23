const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const PRESETS_FILE = path.join(__dirname, '../data/presets.json');

// Helper to read presets
async function readPresets() {
    try {
        const data = await fs.readFile(PRESETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading presets:', error);
        return { presets: [] };
    }
}

// Helper to write presets
async function writePresets(data) {
    try {
        await fs.writeFile(PRESETS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing presets:', error);
        return false;
    }
}

// GET /api/presets - Get all presets (public)
router.get('/', async (req, res) => {
    try {
        const data = await readPresets();
        res.json(data.presets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching presets' });
    }
});

// GET /api/presets/:id - Get single preset (public)
router.get('/:id', async (req, res) => {
    try {
        const data = await readPresets();
        const preset = data.presets.find(p => p.id === req.params.id);
        if (!preset) {
            return res.status(404).json({ message: 'Preset not found' });
        }
        res.json(preset);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching preset' });
    }
});

// POST /api/presets - Create new preset (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id, label, data: presetData } = req.body;

        if (!id || !label || !presetData) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const fileData = await readPresets();

        // Check if ID already exists
        if (fileData.presets.some(p => p.id === id)) {
            return res.status(400).json({ message: 'Preset with this ID already exists' });
        }

        const newPreset = { id, label, data: presetData };
        fileData.presets.push(newPreset);

        const success = await writePresets(fileData);
        if (!success) {
            return res.status(500).json({ message: 'Error saving preset' });
        }

        res.status(201).json(newPreset);
    } catch (error) {
        res.status(500).json({ message: 'Error creating preset' });
    }
});

// PUT /api/presets/:id - Update preset (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { label, data: presetData } = req.body;

        const fileData = await readPresets();
        const index = fileData.presets.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ message: 'Preset not found' });
        }

        fileData.presets[index] = {
            id: req.params.id,
            label: label || fileData.presets[index].label,
            data: presetData || fileData.presets[index].data
        };

        const success = await writePresets(fileData);
        if (!success) {
            return res.status(500).json({ message: 'Error updating preset' });
        }

        res.json(fileData.presets[index]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating preset' });
    }
});

// DELETE /api/presets/:id - Delete preset (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const fileData = await readPresets();
        const index = fileData.presets.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ message: 'Preset not found' });
        }

        fileData.presets.splice(index, 1);

        const success = await writePresets(fileData);
        if (!success) {
            return res.status(500).json({ message: 'Error deleting preset' });
        }

        res.json({ message: 'Preset deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting preset' });
    }
});

module.exports = router;
