const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
// TODO: Replace with actual connection string from env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mts_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const guestRoutes = require('./routes/guests');
const reservationRoutes = require('./routes/reservations');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const presetRoutes = require('./routes/presets');
const settingsRoutes = require('./routes/settings');

app.use('/api/guests', guestRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/presets', presetRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.send('Guest Tracking System API is running');
});

// Start Server - Listen on all network interfaces for external access
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Network access: http://0.0.0.0:${PORT}`);
});
