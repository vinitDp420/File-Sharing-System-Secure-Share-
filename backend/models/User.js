const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  publicKey: { type: String },
  privateKeyEncrypted: { type: String },
  storageUsedMB: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
