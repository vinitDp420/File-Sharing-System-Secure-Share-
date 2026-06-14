import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import CountUp from 'react-countup'
import { FiUsers, FiFile, FiServer, FiAlertTriangle, FiHardDrive, FiActivity } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4']

const KpiCard = ({ icon: Icon, label, value, suffix='', color, delay }) => (
  <motion.div className="kpi-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay }}>
    <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-20 flex items-center justify-center mb-2`}>
      <Icon className={`text-xl ${color.replace('bg-','text-')}`} />
    </div>
    <div className="text-3xl font-black text-white">
      <CountUp end={typeof value === 'number' ? value : 0} duration={1.5} suffix={suffix} decimals={value % 1 !== 0 ? 1 : 0} enableScrollSpy />
    </div>
    <div className="text-slate-400 text-sm">{label}</div>
  </motion.div>
)

export default function AdminOverview() {
  const [stats, setStats] = useState({})
  const [activity, setActivity] = useState([])
  const [liveActivity, setLiveActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadDownloadData, setUploadDownloadData] = useState([])
  const [fileTypeData, setFileTypeData] = useState([])
  const [hourlyData, setHourlyData] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/activity'),
      api.get('/admin/logs?limit=500'),
      api.get('/admin/files?limit=500'),
    ]).then(([s, a, logsRes, filesRes]) => {
      setStats(s.data)
      setActivity(a.data.hourlyActivity.slice(-12))

      // ── Uploads vs Downloads per day (real logs) ──────────────────────────
      const DAY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
      const uploads   = Array(7).fill(0)
      const downloads = Array(7).fill(0)
      ;(logsRes.data.logs || []).forEach(log => {
        const d = new Date(log.timestamp)
        const diffDays = Math.floor((Date.now() - d) / 86400000)
        if (diffDays < 7) {
          const idx = (d.getDay() + 6) % 7   // 0=Mon … 6=Sun
          if (log.action === 'upload')   uploads[idx]   += 1
          if (log.action === 'download') downloads[idx] += 1
        }
      })
      setUploadDownloadData(DAY.map((day, i) => ({ day, uploads: uploads[i], downloads: downloads[i] })))

      // ── File Types from real file MIME types ──────────────────────────────
      const typeCounts = {}
      ;(filesRes.data.files || []).forEach(f => {
        const t = f.fileType?.split('/')[0] || 'other'
        const label = t.charAt(0).toUpperCase() + t.slice(1)
        typeCounts[label] = (typeCounts[label] || 0) + 1
      })
      setFileTypeData(Object.entries(typeCounts).map(([name, value]) => ({ name, value })))

      // ── Hourly activity (last 12 hours from /admin/activity) ──────────────
      const hourly = (a.data.hourlyActivity || []).slice(-12).map(h => ({
        hour: h._id?.split(' ')[1] || h._id,
        count: h.count,
      }))
      setHourlyData(hourly)

      setLoading(false)
    }).catch(() => setLoading(false))

    const socket = getSocket()
    socket.on('activity:new', (data) => {
      setLiveActivity(prev => [{ ...data, key: Date.now() }, ...prev.slice(0, 9)])
    })
    return () => socket.off('activity:new')
  }, [])

  const kpis = [
    { icon: FiUsers, label: 'Total Users', value: stats.totalUsers || 0, color: 'bg-blue-500', delay: 0 },
    { icon: FiFile, label: 'Total Files', value: stats.totalFiles || 0, color: 'bg-violet-500', delay: 0.1 },
    { icon: FiServer, label: 'Online Nodes', value: stats.onlineNodes || 0, color: 'bg-emerald-500', delay: 0.2 },
    { icon: FiHardDrive, label: 'Storage (MB)', value: stats.totalStorageMB || 0, color: 'bg-amber-500', delay: 0.3 },
    { icon: FiAlertTriangle, label: 'Anomalies', value: stats.anomalyLogs || 0, color: 'bg-red-500', delay: 0.4 },
    { icon: FiActivity, label: 'Total Chunks', value: stats.totalChunks || 0, color: 'bg-cyan-500', delay: 0.5 },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">System-wide statistics and live activity</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl"/>) :
          kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Uploads vs Downloads</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={uploadDownloadData}>
              <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
              <Legend />
              <Line type="monotone" dataKey="uploads" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="downloads" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">File Types Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fileTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {fileTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Activity by Hour (last 12h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#bwGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Activity Feed */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-white">Live Activity</h3>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {liveActivity.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-6">Waiting for activity...</div>
            ) : liveActivity.map((a, i) => (
              <div key={a.key} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(a.name || a.userId || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm text-slate-300 flex-1">
                  <span className="text-white">{a.name || 'User'}</span> {a.action} {a.fileName && <span className="text-primary-400">{a.fileName}</span>}
                </div>
                <div className="text-xs text-slate-600">{new Date(a.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
