const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const vehiclesPublicRoutes = require('./routes/vehicles.public.routes');
const vehiclesPrivateRoutes = require('./routes/vehicles.private.routes');
const qnaRoutes = require('./routes/qna.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  res.status(200).json({ status: 'ok', uptime });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/vehicles', vehiclesPublicRoutes);
app.use('/api/vehicles', vehiclesPrivateRoutes);
app.use('/api', qnaRoutes);

module.exports = app;