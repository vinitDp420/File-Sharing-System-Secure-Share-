const axios = require('axios');
const Node = require('../models/Node');

const NODE_URLS = (process.env.NODE_SIM_URLS || 'http://localhost:6001,http://localhost:6002,http://localhost:6003').split(',');
const REPLICATION_FACTOR = parseInt(process.env.REPLICATION_FACTOR || 2);
const HEARTBEAT_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Initialize nodes in DB
 */
async function initializeNodes() {
  const nodeConfigs = [
    { nodeId: 'N001', region: 'us-east', url: NODE_URLS[0] || 'http://localhost:6001' },
    { nodeId: 'N002', region: 'us-west', url: NODE_URLS[1] || 'http://localhost:6002' },
    { nodeId: 'N003', region: 'eu-central', url: NODE_URLS[2] || 'http://localhost:6003' },
  ];
  for (const cfg of nodeConfigs) {
    await Node.findOneAndUpdate({ nodeId: cfg.nodeId }, cfg, { upsert: true, new: true });
  }
}

/**
 * Select best available nodes (lowest latency, highest availability)
 */
async function selectBestNodes(count = REPLICATION_FACTOR) {
  const nodes = await Node.find({ status: 'online' }).sort({ latency: 1, cpuUsage: 1 });
  if (nodes.length === 0) {
    // Fallback: return all nodes even if offline
    const allNodes = await Node.find().sort({ latency: 1 });
    return allNodes.slice(0, count);
  }
  return nodes.slice(0, Math.min(count, nodes.length));
}

/**
 * Upload a chunk to a node
 */
async function uploadChunkToNode(nodeUrl, chunkId, chunkBuffer) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('chunkId', chunkId);
  form.append('data', chunkBuffer, { filename: chunkId, contentType: 'application/octet-stream' });

  const response = await axios.post(`${nodeUrl}/chunks`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return response.data;
}

/**
 * Download a chunk from a node
 */
async function downloadChunkFromNode(nodeUrl, chunkId) {
  const response = await axios.get(`${nodeUrl}/chunks/${chunkId}`, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

/**
 * Delete a chunk from a node
 */
async function deleteChunkFromNode(nodeUrl, chunkId) {
  await axios.delete(`${nodeUrl}/chunks/${chunkId}`, { timeout: 10000 });
}

/**
 * Pin a chunk to multiple nodes (replication)
 */
async function replicateChunk(chunkId, chunkBuffer, primaryNodeUrl) {
  const allOnlineNodes = await Node.find({ status: 'online', url: { $ne: primaryNodeUrl } });
  const replicaNodes = allOnlineNodes.slice(0, REPLICATION_FACTOR - 1);
  const replicaNodeIds = [];
  for (const node of replicaNodes) {
    try {
      await uploadChunkToNode(node.url, chunkId, chunkBuffer);
      replicaNodeIds.push(node.nodeId);
    } catch (err) {
      console.warn(`⚠️ Replication to ${node.nodeId} failed:`, err.message);
    }
  }
  return replicaNodeIds;
}

/**
 * Check node health + update DB
 */
async function checkNodeHealth(node, io) {
  try {
    const start = Date.now();
    const response = await axios.get(`${node.url}/health`, { timeout: 5000 });
    const latency = Date.now() - start;
    const data = response.data;

    await Node.findOneAndUpdate({ nodeId: node.nodeId }, {
      status: 'online',
      latency,
      cpuUsage: data.cpuUsage || 0,
      ramUsage: data.ramUsage || 0,
      bandwidthMbps: data.bandwidthMbps || 0,
      activeConnections: data.activeConnections || 0,
      diskUsedMB: data.diskUsedMB || 0,
      lastHeartbeat: new Date(),
    });

    if (io) {
      io.emit('node:status', { nodeId: node.nodeId, status: 'online', latency, ...data });
    }
  } catch (err) {
    await Node.findOneAndUpdate({ nodeId: node.nodeId }, {
      status: 'offline',
      lastHeartbeat: new Date(),
    });
    if (io) {
      io.emit('node:status', { nodeId: node.nodeId, status: 'offline' });
    }
  }
}

/**
 * Start periodic heartbeat checker
 */
function startHeartbeatChecker(io) {
  initializeNodes().then(() => console.log('✅ Nodes initialized'));

  const checkAll = async () => {
    const nodes = await Node.find();
    await Promise.all(nodes.map(n => checkNodeHealth(n, io)));
  };

  checkAll();
  setInterval(checkAll, 30000); // every 30s
}

module.exports = {
  selectBestNodes,
  uploadChunkToNode,
  downloadChunkFromNode,
  deleteChunkFromNode,
  replicateChunk,
  startHeartbeatChecker,
  initializeNodes,
};
