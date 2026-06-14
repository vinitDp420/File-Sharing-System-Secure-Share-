const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  region: { type: String, required: true },
  url: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline', 'degraded'], default: 'offline' },
  cpuUsage: { type: Number, default: 0 },
  ramUsage: { type: Number, default: 0 },
  bandwidthMbps: { type: Number, default: 0 },
  latency: { type: Number, default: 0 },
  activeConnections: { type: Number, default: 0 },
  storedChunks: [String],
  diskUsedMB: { type: Number, default: 0 },
  diskTotalMB: { type: Number, default: 10240 },
  lastHeartbeat: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Node', nodeSchema);
