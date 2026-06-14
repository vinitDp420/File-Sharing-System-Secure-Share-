const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const Chunk = require('../models/Chunk');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/nodes/discover
router.get('/discover', authenticate, async (req, res) => {
  try {
    const nodes = await Node.find().select('-storedChunks');
    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// POST /api/nodes/heartbeat (called by node simulators)
router.post('/heartbeat', async (req, res) => {
  try {
    const { nodeId, region, cpuUsage, ramUsage, bandwidthMbps, latency, activeConnections, diskUsedMB, url } = req.body;

    const node = await Node.findOneAndUpdate(
      { nodeId },
      { status: 'online', region, cpuUsage, ramUsage, bandwidthMbps, latency, activeConnections, diskUsedMB, url, lastHeartbeat: new Date() },
      { upsert: true, new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('node:status', { nodeId, status: 'online', cpuUsage, ramUsage, latency, activeConnections });
    }

    res.json({ message: 'Heartbeat received', nodeId });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// GET /api/nodes/:id/chunks
router.get('/:id/chunks', authenticate, requireAdmin, async (req, res) => {
  try {
    const chunks = await Chunk.find({ nodeId: req.params.id }).populate('fileId', 'fileName sizeMB');
    res.json({ chunks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chunks' });
  }
});

module.exports = router;
