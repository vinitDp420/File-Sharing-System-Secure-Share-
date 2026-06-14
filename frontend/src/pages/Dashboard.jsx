import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FiHardDrive, FiFile, FiShare2, FiShield, FiLogOut } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import CountUp from 'react-countup'
import { formatDistanceToNow } from 'date-fns'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityData, setActivityData] = useState(
    DAY_LABELS.map(day => ({ day, uploads: 0, downloads: 0 }))
  )

  useEffect(() => {
    api.get('/files').then(r => {
      const fetchedFiles = r.data.files || []
      setFiles(fetchedFiles)
      setLoading(false)

      // Build real weekly activity from files data
      // Count uploads per day-of-week (last 7 days)
      const now = new Date()
      const uploadsByDay = Array(7).fill(0)
      const downloadsByDay = Array(7).fill(0)

      fetchedFiles.forEach(f => {
        const created = new Date(f.createdAt)
        const diffMs = now - created
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < 7) {
          // day 0 = today, day 6 = 6 days ago
          // Map to Mon-Sun: getDay() returns 0=Sun,1=Mon,...,6=Sat
          const jsDay = created.getDay() // 0=Sun
          const monBasedIdx = (jsDay + 6) % 7  // 0=Mon, 6=Sun
          uploadsByDay[monBasedIdx] += 1
          downloadsByDay[monBasedIdx] += (f.downloadCount || 0)
        }
      })

      setActivityData(DAY_LABELS.map((day, i) => ({
        day,
        uploads: uploadsByDay[i],
        downloads: downloadsByDay[i],
      })))
    }).catch(() => setLoading(false))
  }, [])

  // If admin, also fetch system-wide hourly activity and merge
  useEffect(() => {
    if (user?.role !== 'admin') return
    api.get('/admin/activity').then(r => {
      const hourly = r.data.hourlyActivity || []
      const uploadsByDay = Array(7).fill(0)
      const downloadsByDay = Array(7).fill(0)

      hourly.forEach(h => {
        // h._id = "2026-04-05 14:00", h.count = number of logs in that hour
        const date = new Date(h._id)
        const jsDay = date.getDay()
        const monBasedIdx = (jsDay + 6) % 7
        uploadsByDay[monBasedIdx] += h.count
      })

      setActivityData(DAY_LABELS.map((day, i) => ({
        day,
        uploads: uploadsByDay[i],
        downloads: downloadsByDay[i],
      })))
    }).catch(() => { /* admin activity unavailable, keep file-based data */ })
  }, [user])

  // Derived from real file data
  const totalSizeMB = files.reduce((s, f) => s + (f.sizeMB || 0), 0)
  const storageLimit = 1024 // 1 GB limit
  const pct = Math.min((totalSizeMB / storageLimit) * 100, 100)

  const typeCounts = files.reduce((acc, f) => {
    const t = f.fileType?.split('/')[0] || 'other'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header with blurred bg image */}
      <div className="relative h-48 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=400&fit=crop" alt="analytics" className="w-full h-full object-cover opacity-20" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/40 to-dark-900" />
        <div className="absolute inset-0 px-6 py-6 flex items-end justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400">Welcome back, <span className="text-primary-400">{user?.name}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/files" className="btn-primary text-sm py-2">File Manager</Link>
            {user?.role === 'admin' && <Link to="/admin" className="btn-secondary text-sm py-2">Admin Panel</Link>}
            <Link to="/profile" className="flex items-center gap-2 btn-ghost text-sm py-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {user?.name?.split(' ')[0]}
            </Link>
            <button onClick={logout} className="btn-ghost text-sm flex items-center gap-1"><FiLogOut size={14}/> Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          variants={{ show:{ transition:{ staggerChildren:0.1 } } }} initial="hidden" animate="show">
          {[
            { icon: FiFile, label:'Total Files', value: files.length, color:'text-blue-400' },
            { icon: FiHardDrive, label:'Storage Used', value: `${totalSizeMB.toFixed(1)}`, suffix:'MB', color:'text-violet-400', raw:true },
            { icon: FiShare2, label:'Shared Files', value: files.filter(f => f.sharedWith?.length > 0).length, color:'text-emerald-400' },
            { icon: FiShield, label:'Encrypted', value: 100, suffix:'%', color:'text-amber-400' },
          ].map((k, i) => (
            <motion.div key={i} className="kpi-card" variants={{ hidden:{opacity:0,y:20}, show:{opacity:1,y:0} }}>
              <k.icon className={`${k.color} text-xl`} />
              <div className={`text-2xl font-black ${k.color}`}>
                {k.raw ? <>{k.value}{k.suffix}</> : <CountUp end={k.value} duration={1.5} suffix={k.suffix} enableScrollSpy scrollSpyOnce />}
              </div>
              <div className="text-slate-500 text-sm">{k.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Storage Donut */}
          <motion.div className="card" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }}>
            <h3 className="font-semibold text-white mb-4">Storage Usage</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#grad)" strokeWidth="2.5"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-white">{pct.toFixed(0)}%</span>
                  <span className="text-xs text-slate-500">used</span>
                </div>
              </div>
              <div>
                <p className="text-white font-semibold">{totalSizeMB.toFixed(1)} MB</p>
                <p className="text-slate-500 text-sm">of {storageLimit} MB</p>
                <div className="mt-3 space-y-1">
                  {pieData.slice(0, 4).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="capitalize">{d.name}</span>
                      <span className="ml-auto text-slate-500">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Activity Chart */}
          <motion.div className="card" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}>
            <h3 className="font-semibold text-white mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={activityData}>
                <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                <Line type="monotone" dataKey="uploads" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="downloads" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Files */}
        <motion.div className="card mt-8" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Files</h3>
            <Link to="/files" className="text-primary-400 text-sm hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
          ) : files.slice(0, 5).map(file => (
            <div key={file._id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <div className="text-slate-400 text-sm truncate flex-1">{file.fileName}</div>
              <div className="text-slate-500 text-xs">{file.sizeMB?.toFixed(1)} MB</div>
              <div className="text-slate-600 text-xs hidden md:block">{formatDistanceToNow(new Date(file.createdAt), { addSuffix:true })}</div>
              <span className="badge-low">Encrypted</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
