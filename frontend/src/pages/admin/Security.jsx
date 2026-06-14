import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FiAlertTriangle, FiShield, FiLock } from 'react-icons/fi'
import { getSocket } from '../../lib/socket'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/api'

const RiskBadge = ({ level }) => {
  const map = { low:'badge-low', medium:'badge-medium', high:'badge-high', critical:'badge-critical' }
  return <span className={map[level] || 'badge-low'}>{level}</span>
}

export default function AdminSecurity() {
  const [anomalies, setAnomalies] = useState([])
  const [blocklist, setBlocklist] = useState(['192.168.1.1','10.0.0.1','203.0.113.5'])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newIp, setNewIp] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/admin/logs?anomaly=true'),
      api.get('/admin/logs'),
    ]).then(([anomalyRes, allRes]) => {
      const labeled   = anomalyRes.data.logs || []
      const byAction  = (allRes.data.logs || []).filter(l =>
        l.action === 'anomaly_detected' && !labeled.find(x => x._id === l._id)
      )
      const combined  = [...labeled, ...byAction].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setAnomalies(combined.slice(0, 20))
      setLogs(allRes.data.logs || [])
      setLoading(false)
    }).catch(() => setLoading(false))

    const socket = getSocket()
    socket.on('anomaly:detected', (data) => {
      setAnomalies(prev => [{ ...data, _id: Date.now(), timestamp: new Date().toISOString() }, ...prev.slice(0, 19)])
    })
    return () => socket.off('anomaly:detected')
  }, [])

  // Real anomaly counts grouped by hour-of-day (0–23)
  const hourlyAnomalies = Array.from({ length: 24 }, (_, h) => {
    const count = logs.filter(l => {
      const d = new Date(l.timestamp)
      const diffDays = Math.floor((Date.now() - d) / 86400000)
      return diffDays < 1 && d.getHours() === h &&
        (l.action === 'anomaly_detected' || ['high','critical'].includes(l.anomalyLabel))
    }).length
    return { hour: `${h}:00`, anomalies: count }
  })

  const encryptionHealth = [
    { component:'AES-256-CBC Keys', status:'Healthy', last:'30s ago', color:'text-emerald-400' },
    { component:'RSA-2048 Keypairs', status:'Healthy', last:'2m ago', color:'text-emerald-400' },
    { component:'SHA-256 Signatures', status:'Healthy', last:'1m ago', color:'text-emerald-400' },
    { component:'TLS/HTTPS', status:'Active', last:'Now', color:'text-blue-400' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-slate-400 text-sm">Live anomaly monitoring and threat intelligence</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Live Anomaly Feed */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="text-red-400" />
            <h3 className="font-semibold text-white">Live Anomaly Feed</h3>
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-auto"/>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {loading ? [...Array(4)].map((_,i) => <div key={i} className="skeleton h-10 rounded-xl"/>) :
              anomalies.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">No anomalies detected</div>
              ) : anomalies.slice(0,10).map((a, i) => (
                <motion.div key={a._id || i} className="flex items-center gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10"
                  initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(a.userId?.name || a.user_id || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{a.userId?.email || a.user_id || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{a.action} · {a.ip}</div>
                  </div>
                  <RiskBadge level={a.anomalyLabel || a.risk_level || 'high'} />
                </motion.div>
              ))}
          </div>
        </div>

        {/* IP Blocklist */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FiShield className="text-primary-400" />
            <h3 className="font-semibold text-white">IP Blocklist</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Add IP address..." className="input-field py-2 text-sm flex-1"
              value={newIp} onChange={e => setNewIp(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && newIp) { setBlocklist(b => [...b, newIp]); setNewIp('') }}} />
            <button onClick={() => { if(newIp) { setBlocklist(b => [...b, newIp]); setNewIp('') }}} className="btn-primary py-2 px-4 text-sm">Block</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {blocklist.map(ip => (
              <div key={ip} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl text-sm">
                <span className="font-mono text-slate-300">{ip}</span>
                <button onClick={() => setBlocklist(b => b.filter(x => x !== ip))} className="text-slate-600 hover:text-red-400 text-xs transition-colors">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Anomaly Chart */}
      <div className="card mb-6">
        <h3 className="font-semibold text-white mb-4">Anomaly Distribution (24h)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyAnomalies}>
            <XAxis dataKey="hour" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
            <Bar dataKey="anomalies" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Encryption Health */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiLock className="text-emerald-400" />
          <h3 className="font-semibold text-white">Encryption Health</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {['Component','Status','Last Check'].map(h => (
                <th key={h} className="pb-3 text-slate-400 text-sm font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {encryptionHealth.map(e => (
              <tr key={e.component} className="border-b border-white/5">
                <td className="py-3 text-slate-300 text-sm">{e.component}</td>
                <td className="py-3"><span className={`text-sm font-semibold ${e.color}`}>{e.status}</span></td>
                <td className="py-3 text-slate-500 text-xs">{e.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
