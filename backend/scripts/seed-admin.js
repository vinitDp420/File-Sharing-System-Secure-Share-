/**
 * seed-admin.js
 * Creates / updates the admin account: admin@secureshare.com / admin@#123
 * Run: node scripts/seed-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const User = require('../models/User');

const ADMIN_NAME     = 'Admin';
const ADMIN_EMAIL    = 'admin@secureshare.com';
const ADMIN_PASSWORD = 'admin@#123';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secureshare');
  console.log('✅ MongoDB connected');

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  // Generate RSA-2048 key pair (same as registration flow)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    // Update password + force role=admin in case it was changed
    existing.passwordHash        = passwordHash;
    existing.role                = 'admin';
    existing.publicKey           = publicKey;
    existing.privateKeyEncrypted = privateKey;
    existing.status              = 'active';
    await existing.save();
    console.log('♻️  Admin account updated successfully.');
  } else {
    await User.create({
      name:                ADMIN_NAME,
      email:               ADMIN_EMAIL,
      passwordHash,
      role:                'admin',
      publicKey,
      privateKeyEncrypted: privateKey,
      status:              'active',
    });
    console.log('🎉 Admin account created successfully.');
  }

  console.log('─────────────────────────────────────');
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log(`  Role     : admin`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
