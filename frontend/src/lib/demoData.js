export const demoData = {
  stats: {
    totalUsers: 142,
    totalFiles: 893,
    onlineNodes: 3,
    totalStorageMB: 4520.5,
    anomalyLogs: 2,
    totalChunks: 1786
  },
  activity: {
    hourlyActivity: Array.from({length: 12}).map((_, i) => ({ _id: `Hour ${i}`, count: Math.floor(Math.random() * 50) + 10 }))
  },
  logs: {
    logs: Array.from({length: 50}).map((_, i) => ({
      timestamp: Date.now() - Math.random() * 86400000 * 7,
      action: Math.random() > 0.5 ? 'upload' : 'download'
    }))
  },
  files: {
    files: [
      { _id: '1', fileName: 'Q3_Financial_Report.pdf', sizeMB: 4.2, fileType: 'application/pdf', isEncrypted: true, createdAt: Date.now() - 3600000, riskLevel: 'low', isSuspicious: false, mlClassification: 'document', chunkIds: [1,2,3] },
      { _id: '2', fileName: 'Customer_Data_Export.csv', sizeMB: 12.8, fileType: 'text/csv', isEncrypted: true, createdAt: Date.now() - 86400000, riskLevel: 'medium', isSuspicious: true, mlClassification: 'spreadsheet', chunkIds: [1,2,3,4,5] },
      { _id: '3', fileName: 'Project_Assets.zip', sizeMB: 145.5, fileType: 'application/zip', isEncrypted: true, createdAt: Date.now() - 172800000, riskLevel: 'low', isSuspicious: false, mlClassification: 'archive', chunkIds: Array.from({length: 15}) },
      { _id: '4', fileName: 'System_Architecture_Diagram.png', sizeMB: 2.1, fileType: 'image/png', isEncrypted: true, createdAt: Date.now() - 250000000, riskLevel: 'low', isSuspicious: false, mlClassification: 'image', chunkIds: [1,2] }
    ],
    usage: 100
  },
  nodes: {
    nodes: [
      { nodeId: 'node-us-east-1', region: 'us-east', status: 'online', cpuUsage: 45, ramUsage: 60, diskTotalMB: 100000, diskUsedMB: 45000, latency: 24, activeConnections: 12, bandwidthMbps: 850, storedChunks: Array(500) },
      { nodeId: 'node-eu-central-1', region: 'eu-central', status: 'online', cpuUsage: 32, ramUsage: 45, diskTotalMB: 100000, diskUsedMB: 32000, latency: 85, activeConnections: 8, bandwidthMbps: 620, storedChunks: Array(300) },
      { nodeId: 'node-ap-south-1', region: 'ap-south', status: 'online', cpuUsage: 78, ramUsage: 82, diskTotalMB: 100000, diskUsedMB: 89000, latency: 145, activeConnections: 24, bandwidthMbps: 410, storedChunks: Array(986) },
    ]
  },
  users: {
    users: [
      { _id: 'u1', name: 'Demo Admin', email: 'admin@secureshare.com', role: 'admin', status: 'active', createdAt: Date.now() - 100000000 },
      { _id: 'u2', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', createdAt: Date.now() - 50000000 },
      { _id: 'u3', name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'inactive', createdAt: Date.now() - 20000000 },
    ]
  }
}
