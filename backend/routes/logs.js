const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/logs - Get activity logs with pagination and filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            entityType,
            entityId,
            userId,
            startDate,
            endDate,
            search
        } = req.query;

        const query = {};

        // Filter by action type
        if (action) {
            query.action = action;
        }

        // Filter by entity type
        if (entityType) {
            query['entity.type'] = entityType;
        }

        // Filter by entity ID
        if (entityId) {
            query['entity.id'] = entityId;
        }

        // Filter by user
        if (userId) {
            query['user.userId'] = userId;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search in description
        if (search) {
            query.description = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ActivityLog.countDocuments(query)
        ]);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/logs/entity/:type/:id - Get logs for a specific entity
router.get('/entity/:type/:id', verifyToken, async (req, res) => {
    try {
        const { type, id } = req.params;

        const logs = await ActivityLog.find({
            'entity.type': type,
            'entity.id': id
        }).sort({ createdAt: -1 }).limit(100);

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/logs/actions - Get list of unique actions for filtering
router.get('/actions', verifyToken, async (req, res) => {
    try {
        const actions = await ActivityLog.distinct('action');
        res.json(actions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/logs/stats - Get log statistics
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayCount, totalCount, recentUsers] = await Promise.all([
            ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            ActivityLog.countDocuments(),
            ActivityLog.aggregate([
                { $group: { _id: '$user.email', count: { $sum: 1 }, lastActivity: { $max: '$createdAt' } } },
                { $sort: { lastActivity: -1 } },
                { $limit: 5 }
            ])
        ]);

        res.json({
            todayCount,
            totalCount,
            recentUsers
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
