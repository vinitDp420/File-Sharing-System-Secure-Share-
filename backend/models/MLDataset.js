const mongoose = require('mongoose');

// ── 1. File Access History (Recommender) ──────────────────────────────────────
const fileAccessSchema = new mongoose.Schema({
  userId:       { type: String, required: true },
  fileId:       { type: String, required: true },
  fileName:     { type: String },
  fileType:     { type: String },
  accessCount:  { type: Number, default: 1 },
  lastAccessed: { type: Date },
  tags:         [String],
  createdAt:    { type: Date, default: Date.now },
});
fileAccessSchema.index({ userId: 1 });
fileAccessSchema.index({ fileId: 1 });

// ── 2. Activity Logs / Anomaly Detection ──────────────────────────────────────
const activityLogSchema = new mongoose.Schema({
  logId:            { type: String, unique: true },
  userId:           { type: String, required: true },
  action:           { type: String },
  fileId:           { type: String },
  timestamp:        { type: Date },
  ipAddress:        { type: String },
  fileSizeMb:       { type: Number },
  downloadCount24h: { type: Number, default: 0 },
  loginAttempts:    { type: Number, default: 0 },
  anomalyLabel:     { type: Number, default: 0 },   // 0 = normal, 1 = anomaly
  createdAt:        { type: Date, default: Date.now },
});
activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ anomalyLabel: 1 });

// ── 3. File Metadata Classification ──────────────────────────────────────────
const fileMetaSchema = new mongoose.Schema({
  fileId:    { type: String },
  extension: { type: String, required: true },
  sizeKb:    { type: Number },
  hasText:   { type: Number, default: 0 },
  hasBinary: { type: Number, default: 0 },
  entropy:   { type: Number },
  label:     { type: String },           // document, image, video, code, data, archive
  createdAt: { type: Date, default: Date.now },
});
fileMetaSchema.index({ label: 1 });
fileMetaSchema.index({ extension: 1 });

// ── 4. Node Performance (Smart Node Selector) ─────────────────────────────────
const nodePerformanceSchema = new mongoose.Schema({
  nodeId:             { type: String },
  region:             { type: String },
  cpuPct:             { type: Number },
  ramPct:             { type: Number },
  bandwidthMbps:      { type: Number },
  latencyMs:          { type: Number },
  activeConnections:  { type: Number },
  predictedLatencyMs: { type: Number },
  recordedAt:         { type: Date, default: Date.now },
});
nodePerformanceSchema.index({ nodeId: 1 });
nodePerformanceSchema.index({ region: 1 });

module.exports = {
  FileAccessHistory:  mongoose.model('FileAccessHistory',  fileAccessSchema),
  MLActivityLog:      mongoose.model('MLActivityLog',      activityLogSchema),
  FileMetaClassify:   mongoose.model('FileMetaClassify',   fileMetaSchema),
  NodePerformance:    mongoose.model('NodePerformance',    nodePerformanceSchema),
};
