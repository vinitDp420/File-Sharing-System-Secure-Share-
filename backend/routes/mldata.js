const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  FileAccessHistory,
  MLActivityLog,
  FileMetaClassify,
  NodePerformance,
} = require('../models/MLDataset');

// All routes require admin
router.use(authenticate, requireAdmin);

// GET /api/ml-data/stats — counts from all 4 ML collections
router.get('/stats', async (req, res) => {
  try {
    const [accessCount, activityCount, metaCount, nodeCount, anomalyCount] = await Promise.all([
      FileAccessHistory.countDocuments(),
      MLActivityLog.countDocuments(),
      FileMetaClassify.countDocuments(),
      NodePerformance.countDocuments(),
      MLActivityLog.countDocuments({ anomalyLabel: 1 }),
    ]);

    // Label distribution for classifier
    const labelDist = await FileMetaClassify.aggregate([
      { $group: { _id: '$label', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Anomaly rate
    const anomalyRate = activityCount > 0
      ? parseFloat(((anomalyCount / activityCount) * 100).toFixed(2))
      : 0;

    // Region distribution for node selector
    const regionDist = await NodePerformance.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 }, avgLatency: { $avg: '$predictedLatencyMs' } } },
      { $sort: { avgLatency: 1 } },
    ]);

    res.json({
      collections: {
        fileAccessHistory:   accessCount,
        mlActivityLogs:      activityCount,
        fileMetaClassify:    metaCount,
        nodePerformance:     nodeCount,
        totalRecords:        accessCount + activityCount + metaCount + nodeCount,
      },
      anomalies: { count: anomalyCount, rate: anomalyRate },
      labelDistribution: labelDist,
      regionDistribution: regionDist,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ML dataset stats: ' + err.message });
  }
});

// GET /api/ml-data/activity-logs — paginated anomaly activity
router.get('/activity-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, anomaly } = req.query;
    const query = {};
    if (anomaly === 'true') query.anomalyLabel = 1;

    const logs = await MLActivityLog
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await MLActivityLog.countDocuments(query);

    res.json({ logs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ml-data/file-access — paginated file access history
router.get('/file-access', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const query = userId ? { userId } : {};

    const records = await FileAccessHistory
      .find(query)
      .sort({ accessCount: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await FileAccessHistory.countDocuments(query);

    res.json({ records, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ml-data/node-performance — latest node performance records
router.get('/node-performance', async (req, res) => {
  try {
    const { region } = req.query;
    const query = region ? { region } : {};

    const records = await NodePerformance
      .find(query)
      .sort({ recordedAt: -1 })
      .limit(100);

    res.json({ records, total: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
