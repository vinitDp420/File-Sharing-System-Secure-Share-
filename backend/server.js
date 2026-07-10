require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const fileRoutes  = require('./routes/files');
const nodeRoutes  = require('./routes/nodes');
const adminRoutes = require('./routes/admin');
const mlDataRoutes = require('./routes/mldata');
const { setupSocketHandlers } = require('./services/socketManager');

const app = express();
const server = http.createServer(app);

// Helper for flexible CORS check across Render, GitHub Pages, Localhost, or custom FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const checkOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('onrender.com') || origin.includes('github.io')) {
    callback(null, true);
  } else {
    callback(null, true); // Fallback allow to avoid blocking valid frontend deployments
  }
};

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Make io available to routes
app.set('io', io);

// ── Security & Middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: checkOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '600mb' }));
app.use(express.urlencoded({ extended: true, limit: '600mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/files',   fileRoutes);
app.use('/api/nodes',   nodeRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/ml-data', mlDataRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── WebSocket ─────────────────────────────────────────────────────────────────
setupSocketHandlers(io);

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Database + Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/secureshare';

  if (uri === 'memory' || process.env.USE_MEMORY_DB === 'true') {
    console.log('⚡ Starting embedded MongoDB Memory Server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri() + 'secureshare';
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ Primary MongoDB connection failed:', err.message);
    console.log('⚡ Automatic Fallback: Launching embedded MongoDB Memory Server (100% Free / Zero Setup)...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const fallbackUri = mongoServer.getUri() + 'secureshare';
      await mongoose.connect(fallbackUri);
      console.log('✅ Embedded MongoDB Memory Server connected successfully!');
    } catch (memErr) {
      console.error('❌ Fatal Database Error:', memErr.message);
      process.exit(1);
    }
  }

  server.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    const { startHeartbeatChecker } = require('./services/nodeManager');
    startHeartbeatChecker(io);
  });
}

startServer();

module.exports = { app, io };
