/**
 * NEXORA Backend Server
 * Institutional Platform for E.G.S. Pillay Engineering College
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { dbManager } = require('./database/database');

const authRoutes = require('./routes/auth.routes');
const competitionsRoutes = require('./routes/competitions.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const evaluationsRoutes = require('./routes/evaluations.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const adminRoutes = require('./routes/admin.routes');

// Connect & initialize persistent database
dbManager.init();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Configured for flexible frontend scripts & font imports
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'x-user-role', 'x-user-id', 'x-user-email']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static assets
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint (includes persistent database & MongoDB Atlas status)
app.get('/api/health', (req, res) => {
  const dbStatus = dbManager.getStatus();
  res.json({
    status: 'ONLINE',
    service: 'NEXORA Engineering Competition Engine',
    institution: 'E.G.S. Pillay Engineering College, Nagapattinam',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: 'CONNECTED',
      engine: dbStatus.engine,
      totalRecords: dbStatus.totalRecords,
      storageDirectory: dbStatus.storageDirectory,
      mongoAtlas: dbStatus.mongoAtlas
    }
  });
});

// Database status & metrics endpoint
app.get('/api/database/status', (req, res) => {
  const status = dbManager.getStatus();
  res.json({
    success: true,
    database: status
  });
});

// Fallback for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Catch-all route to serve 404.html for web requests
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicPath, '404.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server if not running in test mode or Vercel serverless environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    const dbStatus = dbManager.getStatus();
    console.log(`=======================================================`);
    console.log(`⚡ NEXORA Platform Backend is active on port ${PORT}`);
    console.log(`🏛️  E.G.S. Pillay Engineering College, Nagapattinam`);
    console.log(`🌐 Local Web: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`💾 Storage:  CONNECTED (${dbStatus.storageDirectory})`);
    console.log(`🍃 MongoDB:  ${dbStatus.mongoAtlas.connected ? 'CONNECTED (' + dbStatus.mongoAtlas.cluster + ')' : (dbStatus.mongoAtlas.configured ? 'CONNECTING...' : 'NOT_CONFIGURED (Running with local persistent store)')}`);
    console.log(`🔑 Organizer Dev Key: ${process.env.ORGANIZER_ACCESS_KEY || 'NEXORA-ORGANIZER-2026'}`);
    console.log(`🔑 Admin Dev Key:     ${process.env.ADMIN_ACCESS_KEY || 'NEXORA-ADMIN-2026'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
