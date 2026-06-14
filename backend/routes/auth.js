const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Log = require('../models/Log');
const { authenticate } = require('../middleware/auth');

const generateTokens = (userId, role) => {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
  const refreshToken = jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { token, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate RSA-2048 key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Set first user as admin
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await User.create({
      name, email, passwordHash, publicKey,
      privateKeyEncrypted: privateKey, // In prod: encrypt with password-derived key
      role,
    });

    const { token, refreshToken } = generateTokens(user._id, user.role);

    // Log registration
    await Log.create({ userId: user._id, action: 'register', ip: req.ip });

    res.status(201).json({
      message: 'Registration successful',
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      privateKey, // Send once — user must save this
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await User.findByIdAndUpdate(user._id, { $inc: { loginAttempts: 1 } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date(), loginAttempts: 0 });

    const { token, refreshToken } = generateTokens(user._id, user.role);

    // Log login
    await Log.create({ userId: user._id, action: 'login', ip: req.ip });

    // Emit to admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('activity:new', {
        userId: user._id, name: user.name, action: 'login',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      token, refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, storageUsedMB: user.storageUsedMB },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Invalid token' });

    const tokens = generateTokens(user._id, user.role);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -privateKeyEncrypted');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const File = require('../models/File');
    const fileCount = await File.countDocuments({ ownerId: user._id });
    res.json({ user, stats: { fileCount } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/auth/profile — update name / password
router.patch('/profile', authenticate, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('currentPassword').optional().isLength({ min: 1 }),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password min 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, currentPassword, newPassword } = req.body;

    if (name) user.name = name;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();
    await Log.create({ userId: user._id, action: 'profile_update', ip: req.ip });

    res.json({
      message: 'Profile updated successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// DELETE /api/auth/profile — delete own account
router.delete('/profile', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to delete account' });

    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    await User.findByIdAndUpdate(user._id, { status: 'deleted' });
    await Log.create({ userId: user._id, action: 'account_deleted', ip: req.ip });

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
