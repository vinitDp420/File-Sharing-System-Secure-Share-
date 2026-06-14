const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

/**
 * Generate a random AES-256 key
 */
function generateAESKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypt a buffer with AES-256-CBC
 */
function encryptBuffer(buffer, key, iv) {
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

/**
 * Decrypt a buffer with AES-256-CBC
 */
function decryptBuffer(encryptedBuffer, key, iv) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

/**
 * Compute SHA-256 hash/signature of a buffer
 */
function computeSignature(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verify SHA-256 signature
 */
function verifySignature(buffer, signature) {
  const computed = computeSignature(buffer);
  return computed === signature;
}

/**
 * Encrypt AES key with RSA public key (PEM)
 */
function encryptAESKeyWithRSA(aesKey, publicKeyPem) {
  const encrypted = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    aesKey
  );
  return encrypted.toString('base64');
}

/**
 * Decrypt AES key with RSA private key (PEM)
 */
function decryptAESKeyWithRSA(encryptedKeyBase64, privateKeyPem) {
  const encryptedBuffer = Buffer.from(encryptedKeyBase64, 'base64');
  const decrypted = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    encryptedBuffer
  );
  return decrypted;
}

/**
 * Full file encryption: returns { encryptedData, iv, key, signature }
 */
function encryptFile(fileBuffer) {
  const key = generateAESKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const encryptedData = encryptBuffer(fileBuffer, key, iv);
  const signature = computeSignature(fileBuffer);
  return {
    encryptedData,
    iv: iv.toString('hex'),
    key,
    signature,
  };
}

/**
 * Full file decryption and verification
 */
function decryptFile(encryptedData, keyBuffer, ivHex, expectedSignature) {
  const iv = Buffer.from(ivHex, 'hex');
  const decrypted = decryptBuffer(encryptedData, keyBuffer, iv);
  const valid = verifySignature(decrypted, expectedSignature);
  if (!valid) {
    throw new Error('File integrity check failed — signature mismatch');
  }
  return decrypted;
}

module.exports = {
  generateAESKey,
  encryptBuffer,
  decryptBuffer,
  computeSignature,
  verifySignature,
  encryptAESKeyWithRSA,
  decryptAESKeyWithRSA,
  encryptFile,
  decryptFile,
};
