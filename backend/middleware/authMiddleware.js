const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Token gerekli' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, username, role }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
    }
    next();
};

module.exports = { verifyToken, requireAdmin, JWT_SECRET };
