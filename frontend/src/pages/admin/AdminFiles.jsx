import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTrash2, FiSearch, FiX, FiLayers, FiAlertTriangle, FiShield, FiFilter } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/api'

const RISK_BADGE = {
  low:      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  medium:   'bg-amber-500/10   text-amber-400   border border-amber-500/20',
  high:     'bg-orange-500/10  text-orange-400  border border-orange-500/30',
  critical: 'bg-red-500/10     text-red-400     border border-red-500/30',
}

const RISK_ROW = {
  low:      '',
  medium:   'bg-amber-500/5',
  high:     'bg-orange-500/8',
  critical: 'bg-red-500/8',
}

export default function AdminFiles() {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [riskOnly, setRiskOnly] = useState(false)

  const fetchFiles = (riskFilter = riskOnly) => {
    setLoading(true)
    api.get(`/admin/files${riskFilter ? '?riskOnly=true' : ''}`)
      .then(r => { setFiles(r.data.files); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchFiles() }, [])

  const toggleRisk = () => {
    const next = !riskOnly
    setRiskOnly(next)
    fetchFiles(next)
  }

  const viewChunks = async (file) => {
    setSelected(file)
  }

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return
    try { await api.delete(`/files/${id}`); toast.success('File deleted'); fetchFiles() }
    catch { toast.error('Delete failed') }
  }

  const formatSize = (mb) => mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`

  const highRiskCount = files.filter(f => ['high','critical'].includes(f.riskLevel)).length

  const filtered = files.filter(f =>
    f.fileName?.toLowerCase().includes(search.toLowerCase()) ||
    f.ownerId?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Files</h1>
          <p className="text-slate-400 text-sm">
            {files.length} total files
            {highRiskCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                ⚠️ {highRiskCount} high risk
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* High Risk Filter Toggle */}
          <button
            onClick={toggleRisk}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              riskOnly
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <FiFilter size={13} />
            {riskOnly ? 'All Files' : 'High Risk Only'}
          </button>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input type="text" placeholder="Search files..." className="input-field pl-9 py-2 text-sm w-64"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {['File Name','Owner','Risk Level','Type','Size','Chunks','Uploaded','Actions'].map(h => (
                <th key={h} className="px-5 py-4 text-slate-400 text-sm font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_,i) => (
              <tr key={i}><td colSpan={8} className="px-6 py-3"><div className="skeleton h-8 rounded"/></td></tr>
            )) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-slate-600">
                  {riskOnly ? '🛡️ No high risk files found' : 'No files found'}
                </td>
              </tr>
            ) : filtered.map(file => {
              const risk  = file.riskLevel || 'low'
              const badge = RISK_BADGE[risk] || RISK_BADGE.low
              const rowBg = RISK_ROW[risk]   || ''
              return (
                <tr key={file._id} className={`table-row ${rowBg}`}>
                  {/* File Name */}
                  <td className="px-5 py-4 max-w-[180px]">
                    <div className="flex items-center gap-2">
                      {(risk === 'high' || risk === 'critical') && (
                        <FiAlertTriangle size={13} className="text-orange-400 flex-shrink-0" />
                      )}
                      <span className="text-white text-sm font-medium truncate">{file.fileName}</span>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {file.ownerId?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="text-slate-400 text-xs">{file.ownerId?.name || 'Unknown'}</span>
                    </div>
                  </td>

                  {/* Risk Level — NEW COLUMN */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${badge}`}>
                        {(risk === 'high' || risk === 'critical')
                          ? <FiAlertTriangle size={9} />
                          : <FiShield size={9} />}
                        {risk}
                      </span>
                      {file.mlClassification && (
                        <span className="text-[10px] text-slate-500 capitalize">{file.mlClassification}</span>
                      )}
                      {file.anomalyScore != null && (
                        <span className="text-[10px] text-slate-600">score: {Number(file.anomalyScore).toFixed(2)}</span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-500 text-xs truncate max-w-[100px]">{file.fileType}</td>
                  <td className="px-5 py-4 text-slate-400 text-sm">{formatSize(file.sizeMB)}</td>
                  <td className="px-5 py-4 text-slate-400 text-sm">{file.chunkIds?.length || 0}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{formatDistanceToNow(new Date(file.createdAt), { addSuffix:true })}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => viewChunks(file)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-primary-400 transition-colors" title="View Details">
                        <FiLayers size={14}/>
                      </button>
                      <button onClick={() => deleteFile(file._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                        <FiTrash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* File Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="glass-dark rounded-2xl p-8 w-full max-w-xl"
              initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">{selected.fileName}</h3>
                  <p className="text-slate-400 text-sm">Owned by {selected.ownerId?.name} ({selected.ownerId?.email})</p>
                </div>
                <button onClick={() => setSelected(null)}><FiX className="text-slate-400 hover:text-white"/></button>
              </div>

              {/* Risk info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label:'Risk Level',      value: selected.riskLevel || 'low',  color: selected.riskLevel === 'high' || selected.riskLevel === 'critical' ? 'text-red-400' : 'text-emerald-400' },
                  { label:'ML Class',        value: selected.mlClassification || '—', color: 'text-primary-400' },
                  { label:'Anomaly Score',   value: selected.anomalyScore != null ? Number(selected.anomalyScore).toFixed(3) : '—', color: 'text-amber-400' },
                  { label:'Suspicious',      value: selected.isSuspicious ? 'YES ⚠️' : 'No ✓',  color: selected.isSuspicious ? 'text-red-400' : 'text-emerald-400' },
                  { label:'Total Chunks',    value: selected.chunkIds?.length || 0, color: 'text-primary-400' },
                  { label:'Size',            value: formatSize(selected.sizeMB), color: 'text-slate-300' },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3">
                    <div className="text-slate-500 text-xs mb-1">{s.label}</div>
                    <div className={`font-bold text-sm ${s.color}`}>{String(s.value)}</div>
                  </div>
                ))}
              </div>

              {/* Chunk list */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selected.chunkIds?.map((chunk, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl text-sm">
                    <span className="text-slate-400">Chunk {i}</span>
                    <span className="text-primary-400">{chunk.nodeId || '—'}</span>
                    <span className="badge-low">Distributed</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
