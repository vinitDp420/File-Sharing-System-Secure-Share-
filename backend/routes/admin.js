const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const File = require('../models/File');
const Node = require('../models/Node');
const Log = require('../models/Log');
const Chunk = require('../models/Chunk');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — Dashboard overview
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalFiles, totalNodes, totalLogs, anomalyLogs, totalChunks] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      File.countDocuments({ isDeleted: false }),
      Node.countDocuments(),
      Log.countDocuments(),
      Log.countDocuments({ anomalyLabel: { $in: ['high', 'critical'] } }),
      Chunk.countDocuments(),
    ]);

    const onlineNodes = await Node.countDocuments({ status: 'online' });
    const storageResult = await File.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, total: { $sum: '$sizeMB' } } }]);
    const totalStorageMB = storageResult[0]?.total || 0;

    res.json({ totalUsers, totalFiles, totalNodes, onlineNodes, totalLogs, anomalyLogs, totalChunks, totalStorageMB });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const users = await User.find(query).select('-passwordHash -privateKeyEncrypted')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, status } = req.body;
    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'deleted' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/files
router.get('/files', async (req, res) => {
  try {
    const { page = 1, limit = 20, riskOnly } = req.query;
    const query = { isDeleted: false };
    if (riskOnly === 'true') query.riskLevel = { $in: ['high', 'critical'] };

    const files = await File.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await File.countDocuments(query);
    res.json({ files, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// GET /api/admin/logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, anomaly, search } = req.query;
    const query = {};
    if (anomaly === 'true') query.anomalyLabel = { $in: ['high', 'critical'] };
    const logs = await Log.find(query)
      .populate('userId', 'name email')
      .populate('fileId', 'fileName')
      .sort({ timestamp: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await Log.countDocuments(query);
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/admin/activity — Last 50 activities for chart
router.get('/activity', async (req, res) => {
  try {
    const hourlyActivity = await Log.aggregate([
      { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ hourlyActivity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
