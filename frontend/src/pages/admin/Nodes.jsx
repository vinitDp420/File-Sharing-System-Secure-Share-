import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FiWifi, FiWifiOff, FiCpu, FiHardDrive } from 'react-icons/fi'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

const regionFlags = { 'us-east':'us', 'us-west':'us', 'eu-central':'eu', 'ap-south':'in' }

const ProgressBar = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs text-slate-400 mb-1">
      <span>{label}</span><span>{value?.toFixed(1)}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width:`${Math.min(value||0,100)}%` }}/>
    </div>
  </div>
)

export default function AdminNodes() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/nodes/discover').then(r => { setNodes(r.data.nodes); setLoading(false) }).catch(() => setLoading(false))

    const socket = getSocket()
    socket.on('node:status', (update) => {
      setNodes(prev => prev.map(n => n.nodeId === update.nodeId ? { ...n, ...update } : n))
    })
    return () => socket.off('node:status')
  }, [])

  const latencyData = nodes.map(n => ({ name: n.nodeId, latency: n.latency || 0 }))

  const chunksData = nodes.map(n => ({ name: n.nodeId, chunks: n.storedChunks?.length || 0 }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Storage Nodes</h1>
        <p className="text-slate-400 text-sm">{nodes.filter(n => n.status==='online').length}/{nodes.length} nodes online</p>
      </div>

      {/* Node Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {loading ? [...Array(3)].map((_,i) => <div key={i} className="skeleton h-64 rounded-2xl"/>) :
          nodes.map((node, i) => (
          <motion.div key={node.nodeId} className="card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-2 h-2 rounded-full ${node.status==='online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}/>
              <span className="font-bold text-white">{node.nodeId}</span>
              <img src={`https://flagcdn.com/24x18/${regionFlags[node.region] || 'us'}.png`} alt={node.region} className="h-4 rounded-sm ml-auto" />
              <span className="text-slate-500 text-xs">{node.region}</span>
            </div>
            <div className="space-y-3 mb-4">
              <ProgressBar label="CPU" value={node.cpuUsage} color="bg-blue-500" />
              <ProgressBar label="RAM" value={node.ramUsage} color="bg-violet-500" />
              <ProgressBar label="Disk" value={(node.diskUsedMB / node.diskTotalMB) * 100} color="bg-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-500">Latency</div>
                <div className="text-primary-400 font-semibold">{node.latency?.toFixed(0) || 0}ms</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-500">Connections</div>
                <div className="text-primary-400 font-semibold">{node.activeConnections || 0}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-500">Bandwidth</div>
                <div className="text-primary-400 font-semibold">{node.bandwidthMbps?.toFixed(0) || 0} Mbps</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-500">Status</div>
                <div className={`font-semibold ${node.status==='online' ? 'text-emerald-400' : 'text-red-400'}`}>{node.status}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Latency by Node (ms)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={latencyData}>
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
              <Bar dataKey="latency" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Chunks per Node</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chunksData}>
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
              <Bar dataKey="chunks" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
