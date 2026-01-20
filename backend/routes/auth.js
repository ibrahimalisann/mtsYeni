const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Register (for initial setup or admin creating users)
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            username,
            password: hashedPassword,
            role: role || 'user'
        });

        await user.save();

        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu',
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Generate token
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token bulunamadı' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'Geçersiz token' });
    }
});

module.exports = router;
