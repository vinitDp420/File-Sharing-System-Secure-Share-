const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('../middleware/auth');
const File = require('../models/File');
const Chunk = require('../models/Chunk');
const Node = require('../models/Node');
const Log = require('../models/Log');
const User = require('../models/User');
const { encryptFile, decryptFile, encryptAESKeyWithRSA } = require('../services/encryption');
const { splitIntoChunks, reassembleChunks } = require('../services/chunking');
const {
  selectBestNodes, uploadChunkToNode, downloadChunkFromNode,
  deleteChunkFromNode, replicateChunk
} = require('../services/nodeManager');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 600 * 1024 * 1024 } });

// POST /api/files/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  const io = req.app.get('io');
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { originalname, buffer, mimetype, size } = req.file;
    const sizeMB = size / (1024 * 1024);
    const fileType = mimetype.split('/')[0];

    io?.to(`user:${req.user._id}`).emit('upload:progress', { progress: 10, stage: 'Encrypting...' });

    // Encrypt file
    const { encryptedData, iv, key, signature } = encryptFile(buffer);

    io?.to(`user:${req.user._id}`).emit('upload:progress', { progress: 30, stage: 'Chunking...' });

    // Split into chunks
    const chunks = splitIntoChunks(encryptedData);

    // Select best nodes
    const bestNodes = await selectBestNodes(2);
    if (bestNodes.length === 0) return res.status(503).json({ error: 'No storage nodes available' });

    // Encrypt AES key with owner's RSA public key
    const encryptedAESKey = encryptAESKeyWithRSA(key, req.user.publicKey);

    // Create file record
    const fileRecord = await File.create({
      ownerId: req.user._id,
      fileName: originalname,
      fileType: mimetype,
      sizeMB,
      encryptedAESKey,
      iv,
      signature,
      chunkIds: [],
    });

    const chunkIds = [];
    const totalChunks = chunks.length;

    // Upload chunks in parallel
    await Promise.all(chunks.map(async (chunkBuf, index) => {
      const chunkId = `${fileRecord._id}_chunk_${index}`;
      const primaryNode = bestNodes[index % bestNodes.length];
      const checksum = crypto.createHash('sha256').update(chunkBuf).digest('hex');

      await uploadChunkToNode(primaryNode.url, chunkId, chunkBuf);
      const replicaNodeIds = await replicateChunk(chunkId, chunkBuf, primaryNode.url);

      const chunkRecord = await Chunk.create({
        fileId: fileRecord._id,
        chunkIndex: index,
        nodeId: primaryNode.nodeId,
        checksum,
        replicaNodeIds,
        sizeBytes: chunkBuf.length,
      });
      chunkIds[index] = chunkRecord._id;

      const progress = 30 + Math.round((index + 1) / totalChunks * 60);
      io?.to(`user:${req.user._id}`).emit('upload:progress', { progress, stage: `Uploading chunk ${index + 1}/${totalChunks}` });
    }));

    // Update file with chunk IDs
    await File.findByIdAndUpdate(fileRecord._id, { chunkIds });

    // Update user storage
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsedMB: sizeMB } });

    // ── ML Analysis (non-blocking — runs after response) ──────────────────────
    const analyzeWithML = async () => {
      try {
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
        const axios = require('axios');
        const ext = originalname.split('.').pop()?.toLowerCase() || 'bin';

        // 1. Classify file type
        let classification = null;
        let mlConfidence = null;
        try {
          const classRes = await axios.post(`${mlUrl}/ml/classify`, {
            extension: ext,
            size_kb: sizeMB * 1024,
            has_text: ['txt','pdf','doc','docx','csv','json','xml','html','md'].includes(ext) ? 1 : 0,
            has_binary: ['exe','dll','so','bin','apk','dmg','iso'].includes(ext) ? 1 : 0,
            entropy: Math.min(4 + Math.random() * 4, 8), // estimated
          }, { timeout: 5000 });
          classification = classRes.data.label;
          mlConfidence = classRes.data.confidence;
        } catch (e) { /* ML unavailable, continue */ }

        // 2. Detect anomaly (file size, user login attempts)
        let isSuspicious = false;
        let riskLevel = 'low';
        let anomalyScore = null;
        try {
          const userData = await User.findById(req.user._id);
          const anomalyRes = await axios.post(`${mlUrl}/ml/anomaly`, {
            user_id: req.user._id.toString(),
            action: 'upload',
            file_size_mb: sizeMB,
            download_count_24h: 0,
            login_attempts: userData?.loginAttempts || 0,
          }, { timeout: 5000 });
          isSuspicious = anomalyRes.data.is_anomaly;
          riskLevel = anomalyRes.data.risk_level || 'low';
          anomalyScore = anomalyRes.data.anomaly_score;
        } catch (e) { /* ML unavailable */ }

        // 3. Extra rule-based heuristics
        const dangerousExts = ['exe','dll','bat','cmd','sh','ps1','vbs','js','jar','apk','msi','scr','pif'];
        if (dangerousExts.includes(ext)) {
          isSuspicious = true;
          riskLevel = riskLevel === 'low' ? 'high' : riskLevel;
        }
        if (sizeMB > 100) { // very large file
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }

        // 4. Save analysis results to file record
        await File.findByIdAndUpdate(fileRecord._id, {
          isSuspicious, riskLevel, mlClassification: classification,
          mlConfidence, anomalyScore, mlAnalyzedAt: new Date(),
        });

        // 5. Log and alert admin if suspicious
        if (isSuspicious || riskLevel === 'high' || riskLevel === 'critical') {
          await Log.create({
            userId: req.user._id, action: 'anomaly_detected', fileId: fileRecord._id,
            ip: req.ip,
            anomalyLabel: riskLevel,          // ← fixes Security page query
            anomalyScore: anomalyScore || 0,  // ← fixes score display
            details: { fileName: originalname, riskLevel, anomalyScore, classification },
          });
          io?.to('admin').emit('anomaly:detected', {
            user_id: req.user._id.toString(),
            risk_level: riskLevel,
            action: 'suspicious_upload',
            fileName: originalname,
            anomaly_score: anomalyScore,
            classification,
            timestamp: new Date().toISOString(),
          });
        }

        // Notify uploader so the UI can react in real-time
        io?.to(`user:${req.user._id}`).emit('file:analyzed', {
          fileId: fileRecord._id.toString(),
          isSuspicious, riskLevel, classification, anomalyScore,
        });

        console.log(`🔍 ML: "${originalname}" class="${classification}" risk=${riskLevel} suspicious=${isSuspicious}`);
        return { isSuspicious, riskLevel, classification, anomalyScore };
      } catch (err) {
        console.error('ML analysis error:', err.message);
        return { isSuspicious: false, riskLevel: 'low', classification: null };
      }
    };

    // Await with 10s cap — result ready BEFORE response so fetchFiles() is immediately accurate
    const mlResult = await Promise.race([
      analyzeWithML(),
      new Promise(resolve => setTimeout(() => resolve({ isSuspicious: false, riskLevel: 'low', classification: null }), 10000)),
    ]);
    // ── End ML Analysis ───────────────────────────────────────────────────────

    // Log
    await Log.create({ userId: req.user._id, action: 'upload', fileId: fileRecord._id, ip: req.ip, details: { fileName: originalname, sizeMB } });

    io?.to(`user:${req.user._id}`).emit('upload:progress', { progress: 100, stage: 'Complete!', fileId: fileRecord._id });
    io?.to('admin').emit('activity:new', { userId: req.user._id, action: 'upload', fileName: originalname, timestamp: new Date().toISOString() });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord._id, fileName: originalname, sizeMB, chunkCount: chunks.length,
        isSuspicious: mlResult?.isSuspicious || false,
        riskLevel: mlResult?.riskLevel || 'low',
        classification: mlResult?.classification || null,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// GET /api/files  — returns owned files AND files shared with the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;

    // Match owned files OR files where this user is in sharedWith
    const query = {
      isDeleted: false,
      $or: [
        { ownerId: req.user._id },
        { 'sharedWith.userId': req.user._id },
      ],
    };
    if (search) query.$text = { $search: search };
    if (type) query.fileType = new RegExp(type, 'i');

    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('chunkIds', 'nodeId chunkIndex')
      .populate('ownerId', 'name email');   // so frontend knows who shared it

    const total = await File.countDocuments(query);

    // Tag each file so front-end can split into "My Files" vs "Shared with me"
    const tagged = files.map(f => {
      const plain = f.toObject();
      plain.isSharedWithMe = !f.ownerId._id.equals(req.user._id);
      plain.sharedByName  = plain.isSharedWithMe ? plain.ownerId.name  : null;
      plain.sharedByEmail = plain.isSharedWithMe ? plain.ownerId.email : null;
      return plain;
    });

    res.json({ files: tagged, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Fetch files error:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST /api/files/prescan  — fast ML scan BEFORE the actual upload
// Accepts: { fileName, sizeMB, mimeType }
router.post('/prescan', authenticate, async (req, res) => {
  try {
    const { fileName = '', sizeMB = 0, mimeType = '' } = req.body;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const axios = require('axios');

    let classification = null;
    let mlConfidence   = null;
    let isSuspicious   = false;
    let riskLevel      = 'low';
    let anomalyScore   = null;

    // 1. Classification
    try {
      const cr = await axios.post(`${mlUrl}/ml/classify`, {
        extension: ext,
        size_kb:    sizeMB * 1024,
        has_text:   ['txt','pdf','doc','docx','csv','json','xml','html','md'].includes(ext) ? 1 : 0,
        has_binary: ['exe','dll','so','bin','apk','dmg','iso'].includes(ext)                ? 1 : 0,
        entropy: Math.min(4 + Math.random() * 4, 8),
      }, { timeout: 4000 });
      classification = cr.data.label;
      mlConfidence   = cr.data.confidence;
    } catch (_) { /* ML offline — use rule-based only */ }

    // 2. Anomaly detection
    try {
      const userData = await User.findById(req.user._id);
      const ar = await axios.post(`${mlUrl}/ml/anomaly`, {
        user_id:            req.user._id.toString(),
        action:             'upload',
        file_size_mb:       sizeMB,
        download_count_24h: 0,
        login_attempts:     userData?.loginAttempts || 0,
      }, { timeout: 4000 });
      isSuspicious = ar.data.is_anomaly;
      riskLevel    = ar.data.risk_level || 'low';
      anomalyScore = ar.data.anomaly_score;
    } catch (_) { /* ML offline */ }

    // 3. Rule-based heuristics
    const dangerousExts = ['exe','dll','bat','cmd','sh','ps1','vbs','js','jar','apk','msi','scr','pif'];
    if (dangerousExts.includes(ext)) {
      isSuspicious = true;
      riskLevel    = riskLevel === 'low' ? 'high' : riskLevel;
    }
    if (sizeMB > 100) riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;

    res.json({ isSuspicious, riskLevel, classification, mlConfidence, anomalyScore });
  } catch (err) {
    console.error('Prescan error:', err);
    // Never block upload on prescan failure — return safe defaults
    res.json({ isSuspicious: false, riskLevel: 'low', classification: null });
  }
});

// GET /api/files/download/:id
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      isDeleted: false,
      $or: [{ ownerId: req.user._id }, { 'sharedWith.userId': req.user._id }],
    }).populate('chunkIds');

    if (!file) return res.status(404).json({ error: 'File not found' });

    // Sort chunks by index
    const sortedChunks = file.chunkIds.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Fetch all chunks in parallel
    const chunkBuffers = await Promise.all(sortedChunks.map(async (chunk) => {
      const node = await Node.findOne({ nodeId: chunk.nodeId });
      if (!node) throw new Error(`Node ${chunk.nodeId} not found`);

      const chunkId = `${file._id}_chunk_${chunk.chunkIndex}`;
      try {
        return await downloadChunkFromNode(node.url, chunkId);
      } catch (err) {
        // Try replica nodes
        for (const replicaId of chunk.replicaNodeIds) {
          const replica = await Node.findOne({ nodeId: replicaId });
          if (replica) {
            try {
              return await downloadChunkFromNode(replica.url, chunkId);
            } catch (e) { /* try next */ }
          }
        }
        throw new Error(`Failed to download chunk ${chunk.chunkIndex}`);
      }
    }));

    // Reassemble
    const encryptedData = reassembleChunks(chunkBuffers);

    // Decrypt — use owner's info (ownerId may be a populated doc or plain ObjectId)
    const ownerId = file.ownerId?._id ?? file.ownerId;
    const owner = await User.findById(ownerId);
    const { decryptAESKeyWithRSA } = require('../services/encryption');
    const aesKey = decryptAESKeyWithRSA(file.encryptedAESKey, owner.privateKeyEncrypted);
    const decrypted = decryptFile(encryptedData, aesKey, file.iv, file.signature);

    // Update download count
    await File.findByIdAndUpdate(file._id, { $inc: { downloadCount: 1 } });
    await Log.create({ userId: req.user._id, action: 'download', fileId: file._id, ip: req.ip });

    res.set({
      'Content-Type': file.fileType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Content-Length': decrypted.length,
    });
    res.send(decrypted);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message || 'Download failed' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Soft delete
    await File.findByIdAndUpdate(file._id, { isDeleted: true });

    // Remove chunks from nodes
    const chunks = await Chunk.find({ fileId: file._id });
    await Promise.allSettled(chunks.map(async (chunk) => {
      const node = await Node.findOne({ nodeId: chunk.nodeId });
      if (node) {
        await deleteChunkFromNode(node.url, `${file._id}_chunk_${chunk.chunkIndex}`);
      }
    }));

    // Update storage
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsedMB: -file.sizeMB } });

    await Log.create({ userId: req.user._id, action: 'delete', fileId: file._id, ip: req.ip });
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/files/share
router.post('/share', authenticate, async (req, res) => {
  try {
    const { fileId, recipientEmail, permission = 'read' } = req.body;

    const file = await File.findOne({ _id: fileId, ownerId: req.user._id, isDeleted: false });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    // Re-encrypt AES key for recipient
    const owner = await User.findById(req.user._id);
    const { decryptAESKeyWithRSA, encryptAESKeyWithRSA } = require('../services/encryption');
    const aesKey = decryptAESKeyWithRSA(file.encryptedAESKey, owner.privateKeyEncrypted);
    const recipientEncryptedKey = encryptAESKeyWithRSA(aesKey, recipient.publicKey);

    // Check if already shared
    const alreadyShared = file.sharedWith.find(s => s.userId.equals(recipient._id));
    if (alreadyShared) {
      alreadyShared.permission = permission;
      alreadyShared.encryptedKey = recipientEncryptedKey;
    } else {
      file.sharedWith.push({ userId: recipient._id, permission, encryptedKey: recipientEncryptedKey });
    }
    await file.save();

    await Log.create({ userId: req.user._id, action: 'share', fileId: file._id, ip: req.ip, details: { recipientEmail } });

    // ── Notify the recipient in real-time so their Files page refreshes ──────
    const io = req.app.get('io');
    const sharedFilePayload = {
      _id:             file._id,
      fileName:        file.fileName,
      fileType:        file.fileType,
      sizeMB:          file.sizeMB,
      chunkIds:        file.chunkIds,
      createdAt:       file.createdAt,
      isSuspicious:    file.isSuspicious,
      riskLevel:       file.riskLevel,
      mlClassification: file.mlClassification,
      mlAnalyzedAt:    file.mlAnalyzedAt,
      isSharedWithMe:  true,
      sharedByName:    req.user.name,
      sharedByEmail:   req.user.email,
    };
    io?.to(`user:${recipient._id}`).emit('file:shared', sharedFilePayload);
    // ──────────────────────────────────────────────────────────────────────────

    res.json({ message: `File shared with ${recipientEmail}` });
  } catch (err) {
    res.status(500).json({ error: 'Share failed' });
  }
});

module.exports = router;
