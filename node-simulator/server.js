require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 6001;
const NODE_ID = process.env.NODE_ID || 'N001';
const REGION = process.env.REGION || 'us-east';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const CHUNKS_DIR = path.join(__dirname, 'chunks', NODE_ID);

// Ensure chunks directory exists
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ── Chunk Storage ─────────────────────────────────────────────────────────────

// POST /chunks — Store a chunk
app.post('/chunks', upload.single('data'), (req, res) => {
  try {
    const chunkId = req.body.chunkId || req.query.chunkId;
    if (!chunkId) return res.status(400).json({ error: 'chunkId required' });
    
    const chunkPath = path.join(CHUNKS_DIR, chunkId);
    fs.writeFileSync(chunkPath, req.file.buffer);
    
    console.log(`📦 Stored chunk: ${chunkId} (${req.file.size} bytes)`);
    res.json({ message: 'Chunk stored', chunkId, nodeId: NODE_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /chunks/:chunkId — Retrieve a chunk
app.get('/chunks/:chunkId', (req, res) => {
  try {
    const chunkPath = path.join(CHUNKS_DIR, req.params.chunkId);
    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({ error: 'Chunk not found' });
    }
    const data = fs.readFileSync(chunkPath);
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /chunks/:chunkId — Delete a chunk
app.delete('/chunks/:chunkId', (req, res) => {
  try {
    const chunkPath = path.join(CHUNKS_DIR, req.params.chunkId);
    if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
    res.json({ message: 'Chunk deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health — Node health metrics
app.get('/health', (req, res) => {
  const chunks = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR) : [];
  const diskUsedMB = chunks.reduce((acc, f) => {
    try { return acc + fs.statSync(path.join(CHUNKS_DIR, f)).size / (1024 * 1024); } catch { return acc; }
  }, 0);

  // Simulate CPU/RAM metrics
  const cpuUsage = Math.random() * 60 + 10;
  const ramUsage = Math.random() * 50 + 20;
  const bandwidthMbps = Math.random() * 800 + 100;
  const activeConnections = Math.floor(Math.random() * 50);

  res.json({
    nodeId: NODE_ID,
    region: REGION,
    status: 'online',
    cpuUsage: parseFloat(cpuUsage.toFixed(1)),
    ramUsage: parseFloat(ramUsage.toFixed(1)),
    bandwidthMbps: parseFloat(bandwidthMbps.toFixed(1)),
    activeConnections,
    diskUsedMB: parseFloat(diskUsedMB.toFixed(2)),
    chunkCount: chunks.length,
    uptime: process.uptime(),
  });
});

// GET /chunks — List all chunks
app.get('/chunks', (req, res) => {
  const chunks = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR) : [];
  res.json({ chunks, count: chunks.length });
});

// ── Heartbeat to Backend ──────────────────────────────────────────────────────
const sendHeartbeat = async () => {
  try {
    const healthData = {
      nodeId: NODE_ID,
      region: REGION,
      url: `http://localhost:${PORT}`,
      cpuUsage: parseFloat((Math.random() * 60 + 10).toFixed(1)),
      ramUsage: parseFloat((Math.random() * 50 + 20).toFixed(1)),
      bandwidthMbps: parseFloat((Math.random() * 800 + 100).toFixed(1)),
      latency: parseFloat((Math.random() * 50 + 5).toFixed(2)),
      activeConnections: Math.floor(Math.random() * 50),
      diskUsedMB: 0,
    };
    await axios.post(`${BACKEND_URL}/api/nodes/heartbeat`, healthData, { timeout: 5000 });
    console.log(`💓 Heartbeat sent to backend`);
  } catch (err) {
    console.warn(`⚠️ Heartbeat failed: ${err.message}`);
  }
};

app.listen(PORT, () => {
  console.log(`🖥️  Node Simulator [${NODE_ID}] (${REGION}) running on port ${PORT}`);
  sendHeartbeat();
  setInterval(sendHeartbeat, 30000);
});
