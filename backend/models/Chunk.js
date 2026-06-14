const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  chunkIndex: { type: Number, required: true },
  nodeId: { type: String, required: true },
  checksum: { type: String, required: true },
  replicaNodeIds: [String],
  sizeBytes: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Chunk', chunkSchema);
