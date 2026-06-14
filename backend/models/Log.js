const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  ip: { type: String },
  userAgent: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  anomalyScore: { type: Number, default: 0 },
  anomalyLabel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  timestamp: { type: Date, default: Date.now },
});

logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ anomalyLabel: 1 });

module.exports = mongoose.model('Log', logSchema);
