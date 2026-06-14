import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiSearch, FiDownload, FiFilter } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/api'

const RiskBadge = ({ level }) => {
  const map = { low:'badge-low', medium:'badge-medium', high:'badge-high', critical:'badge-critical' }
  return <span className={map[level] || 'badge-low'}>{level || 'low'}</span>
}

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [anomalyOnly, setAnomalyOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchLogs = () => {
    const params = new URLSearchParams({ page, limit:20, ...(anomalyOnly ? { anomaly:'true' } : {}) })
    api.get(`/admin/logs?${params}`).then(r => { setLogs(r.data.logs); setTotal(r.data.total); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [page, anomalyOnly])

  const exportCSV = () => {
    const rows = [['Log ID','User','Action','IP','Anomaly','Timestamp']]
    logs.forEach(l => rows.push([l._id, l.userId?.email, l.action, l.ip, l.anomalyLabel, l.timestamp]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `secureshare_logs_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const json = JSON.stringify(logs, null, 2)
    const blob = new Blob([json], { type:'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `secureshare_logs_${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = logs.filter(l =>
    (l.userId?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.action || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
          <p className="text-slate-400 text-sm">{total} total events</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input type="text" placeholder="Search logs..." className="input-field pl-9 py-2 text-sm w-48"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setAnomalyOnly(!anomalyOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${anomalyOnly ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            <FiFilter size={14}/> {anomalyOnly ? 'All Logs' : 'Anomalies Only'}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 btn-secondary py-2 text-sm"><FiDownload size={14}/>CSV</button>
          <button onClick={exportJSON} className="flex items-center gap-2 btn-secondary py-2 text-sm"><FiDownload size={14}/>JSON</button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {['User','Action','File','IP','Risk','Timestamp'].map(h => (
                <th key={h} className="px-6 py-4 text-slate-400 text-sm font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_,i) => (
              <tr key={i}><td colSpan={6} className="px-6 py-3"><div className="skeleton h-8 rounded"/></td></tr>
            )) : filtered.map(log => (
              <motion.tr key={log._id}
                className={`table-row ${['high','critical'].includes(log.anomalyLabel) ? 'bg-red-500/3' : ''}`}
                initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {log.userId && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {log.userId?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-slate-300 text-sm">{log.userId?.email || 'System'}</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="px-2 py-0.5 bg-white/5 rounded-lg text-xs text-slate-300 font-mono">{log.action}</span>
                </td>
                <td className="px-6 py-3 text-slate-500 text-xs max-w-[120px] truncate">{log.fileId?.fileName || '—'}</td>
                <td className="px-6 py-3 text-slate-500 text-xs font-mono">{log.ip || '—'}</td>
                <td className="px-6 py-3"><RiskBadge level={log.anomalyLabel} /></td>
                <td className="px-6 py-3 text-slate-600 text-xs">{formatDistanceToNow(new Date(log.timestamp), { addSuffix:true })}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-slate-500 text-sm">Showing {filtered.length} of {total} logs</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p => p-1)} className="btn-ghost py-1 px-3 text-sm disabled:opacity-30">← Prev</button>
            <button onClick={() => setPage(p => p+1)} className="btn-ghost py-1 px-3 text-sm">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
