const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE_MB || 1) * 1024 * 1024; // Default 1MB

/**
 * Split a buffer into chunks of CHUNK_SIZE bytes
 * @param {Buffer} buffer - The data to chunk
 * @returns {Buffer[]} Array of chunk buffers
 */
function splitIntoChunks(buffer) {
  const chunks = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.length);
    chunks.push(buffer.slice(offset, end));
    offset = end;
  }
  return chunks;
}

/**
 * Reassemble chunks back into a single buffer
 * @param {Buffer[]} chunks - Ordered array of chunk buffers
 * @returns {Buffer} Reassembled buffer
 */
function reassembleChunks(chunks) {
  return Buffer.concat(chunks);
}

/**
 * Get chunk count for a given size
 */
function getChunkCount(sizeBytes) {
  return Math.ceil(sizeBytes / CHUNK_SIZE);
}

module.exports = { splitIntoChunks, reassembleChunks, getChunkCount, CHUNK_SIZE };
