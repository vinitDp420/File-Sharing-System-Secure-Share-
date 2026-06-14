const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  sizeMB: { type: Number, required: true },
  encryptedAESKey: { type: String, required: true },
  iv: { type: String, required: true },
  signature: { type: String },
  chunkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read', 'write'], default: 'read' },
    encryptedKey: { type: String },
  }],
  isDeleted: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  tags: [String],
  // ML Analysis
  isSuspicious: { type: Boolean, default: false },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  mlClassification: { type: String, default: null },         // e.g. 'document', 'executable'
  mlConfidence: { type: Number, default: null },
  anomalyScore: { type: Number, default: null },
  mlAnalyzedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

fileSchema.index({ ownerId: 1, isDeleted: 1 });
fileSchema.index({ 'sharedWith.userId': 1, isDeleted: 1 });   // fast lookup of files shared with a user
fileSchema.index({ fileName: 'text' });

module.exports = mongoose.model('File', fileSchema);
