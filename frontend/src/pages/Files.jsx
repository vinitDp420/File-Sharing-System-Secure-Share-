import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import {
  FiUploadCloud, FiSearch, FiShare2, FiTrash2, FiDownload,
  FiX, FiAlertTriangle, FiShield, FiUsers, FiFolder, FiCheck,
  FiClock, FiZap,
} from 'react-icons/fi'
import {
  FaFilePdf, FaFileImage, FaFileVideo, FaFileCode,
  FaFileExcel, FaFileWord, FaFileArchive, FaFile,
} from 'react-icons/fa'
import api from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

// ─── helpers ──────────────────────────────────────────────────────────────────

const FileIcon = ({ type }) => {
  const s = type?.toLowerCase() || ''
  if (s.includes('pdf'))                                         return <FaFilePdf   className="text-red-400    text-2xl" />
  if (s.includes('image') || s.includes('png') || s.includes('jpg')) return <FaFileImage className="text-blue-400   text-2xl" />
  if (s.includes('video'))                                       return <FaFileVideo  className="text-purple-400 text-2xl" />
  if (s.includes('zip')  || s.includes('tar') || s.includes('rar'))  return <FaFileArchive className="text-yellow-400 text-2xl" />
  if (s.includes('sheet')|| s.includes('excel')|| s.includes('csv')) return <FaFileExcel   className="text-green-400  text-2xl" />
  if (s.includes('word') || s.includes('doc'))                   return <FaFileWord   className="text-blue-400   text-2xl" />
  if (s.includes('text') || s.includes('code') || s.includes('js') || s.includes('py')) return <FaFileCode className="text-emerald-400 text-2xl" />
  return <FaFile className="text-slate-400 text-2xl" />
}

const formatSize = mb => mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`

const RISK_COLORS  = { low: 'border-white/10', medium: 'border-amber-500/30', high: 'border-orange-500/40', critical: 'border-red-500/50' }
const RISK_BADGE   = {
  low:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Safe'       },
  medium:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',  label: 'Medium Risk' },
  high:     { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30', label: 'High Risk'   },
  critical: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',    label: 'Critical'    },
}

// ─── Scan stages shown in the detection overlay ───────────────────────────────
const SCAN_STAGES = [
  { id: 1, label: 'Reading file metadata…',       pct: 15 },
  { id: 2, label: 'Running ML classification…',   pct: 45 },
  { id: 3, label: 'Anomaly detection…',           pct: 75 },
  { id: 4, label: 'Applying security heuristics…',pct: 95 },
]

// ─── Detection Overlay ────────────────────────────────────────────────────────
function ScanOverlay({ scanning, scanResult, pendingFiles, onConfirm, onCancel }) {
  const [stageIdx, setStageIdx] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (!scanning) return
    setStageIdx(0); setPct(0)
    const timers = SCAN_STAGES.map((s, i) =>
      setTimeout(() => { setStageIdx(i); setPct(s.pct) }, i * 900)
    )
    return () => timers.forEach(clearTimeout)
  }, [scanning])

  if (!scanning && !scanResult) return null

  const risk       = scanResult?.riskLevel || 'low'
  const suspicious = scanResult?.isSuspicious
  const badge      = RISK_BADGE[risk] || RISK_BADGE.low
  const isCritical = risk === 'critical' || risk === 'high'

  return (
    <AnimatePresence>
      {(scanning || scanResult) && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/10"
            initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0 }}
          >
            {scanning ? (
              <>
                {/* Scanning phase */}
                <div className="flex flex-col items-center text-center mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-primary-500/10 border-2 border-primary-500/40 flex items-center justify-center mb-4"
                    animate={{ boxShadow: ['0 0 0 0 rgba(99,102,241,0.4)', '0 0 0 20px rgba(99,102,241,0)'] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <FiShield className="text-primary-400 text-3xl" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-1">Scanning File</h3>
                  <p className="text-slate-400 text-sm">
                    {pendingFiles?.map(f => f.name).join(', ')}
                  </p>
                </div>

                {/* Stage list */}
                <div className="space-y-3 mb-6">
                  {SCAN_STAGES.map((s, i) => {
                    const done    = i < stageIdx
                    const current = i === stageIdx
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                          ${done    ? 'bg-emerald-500'      : ''}
                          ${current ? 'border-2 border-primary-400 bg-primary-500/10' : ''}
                          ${!done && !current ? 'bg-white/5 border border-white/10' : ''}`}>
                          {done && <FiCheck className="text-white text-xs" />}
                          {current && (
                            <motion.div className="w-2 h-2 rounded-full bg-primary-400"
                              animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                          )}
                        </div>
                        <span className={`text-sm transition-colors ${done ? 'text-emerald-400' : current ? 'text-white font-medium' : 'text-slate-600'}`}>
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full"
                    animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Analyzing with ML models…</p>
              </>
            ) : (
              <>
                {/* Result phase */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2
                    ${suspicious ? 'bg-red-500/10 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`}>
                    {suspicious
                      ? <FiAlertTriangle className="text-red-400 text-3xl" />
                      : <FiShield className="text-emerald-400 text-3xl" />}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {suspicious ? (isCritical ? '⛔ Threat Detected' : '⚠️ Risk Detected') : '✅ File is Safe'}
                  </h3>
                  <p className="text-slate-400 text-sm">{pendingFiles?.map(f => f.name).join(', ')}</p>
                </div>

                {/* Result details */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2 mb-6 border border-white/10 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Level</span>
                    <span className={`font-semibold ${badge.text}`}>{badge.label}</span>
                  </div>
                  {scanResult?.classification && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">File Type (ML)</span>
                      <span className="text-white capitalize">{scanResult.classification}</span>
                    </div>
                  )}
                  {scanResult?.anomalyScore != null && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Anomaly Score</span>
                      <span className="text-white">{scanResult.anomalyScore?.toFixed(3)}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  {isCritical ? (
                    <>
                      <button onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 transition text-sm font-medium">
                        Upload Anyway
                      </button>
                      <button onClick={onCancel}
                        className="flex-1 btn-primary text-sm">
                        Cancel Upload
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={onConfirm}
                        className="flex-1 btn-primary flex items-center gap-2 justify-center text-sm">
                        <FiUploadCloud /> Proceed to Upload
                      </button>
                      <button onClick={onCancel}
                        className="flex-1 btn-secondary text-sm">Cancel</button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── File Card ────────────────────────────────────────────────────────────────
function FileCard({ file, onDownload, onShare, onDelete, isShared }) {
  const risk       = file.riskLevel || 'low'
  const suspicious = file.isSuspicious
  const badge      = RISK_BADGE[risk] || RISK_BADGE.low

  return (
    <motion.div
      className={`glass rounded-2xl p-5 group border ${RISK_COLORS[risk]}
        ${suspicious ? 'shadow-[0_0_20px_rgba(239,68,68,0.08)]' : ''}`}
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4, boxShadow: suspicious ? '0 10px 40px rgba(239,68,68,0.15)' : '0 10px 40px rgba(59,130,246,0.15)' }}
    >
      {/* Suspicious banner */}
      {suspicious && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 mb-3">
          <FiAlertTriangle size={10} />
          <span className="font-semibold uppercase tracking-wide">Suspicious File Detected</span>
        </div>
      )}

      {/* Shared by banner */}
      {isShared && (
        <div className="flex items-center gap-1.5 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-2 py-1 mb-3">
          <FiUsers size={10} />
          <span className="font-medium">Shared by <strong>{file.sharedByName || file.sharedByEmail}</strong></span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${suspicious ? 'bg-red-500/10' : 'bg-white/5'}`}>
            <FileIcon type={file.fileType} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate max-w-[180px]">{file.fileName}</p>
            <p className="text-slate-500 text-xs">{formatSize(file.sizeMB)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 justify-between">
        <span className="text-xs text-slate-600">
          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDownload(file)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-primary-400 transition-colors" title="Download">
            <FiDownload size={14} />
          </button>
          {!isShared && (
            <button onClick={() => onShare(file)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors" title="Share">
              <FiShare2 size={14} />
            </button>
          )}
          {!isShared && (
            <button onClick={() => onDelete(file._id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom badges */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          🔒 AES-256 · {file.chunkIds?.length || 0} chunks
        </span>
        {file.mlAnalyzedAt && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg} ${badge.text} ${badge.border}`}>
            {suspicious ? <FiAlertTriangle size={9} /> : <FiShield size={9} />}
            {badge.label}
          </span>
        )}
        {file.mlClassification && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-white/10 capitalize">
            {file.mlClassification}
          </span>
        )}
        {!file.mlAnalyzedAt && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-500 border border-white/5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse inline-block" />
            Analyzing…
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Files() {
  const { user } = useAuth()
  const [allFiles, setAllFiles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('mine')       // 'mine' | 'shared'

  // Upload / scan state
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  // Pre-scan overlay state
  const [scanning, setScanning]     = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const pendingFilesRef             = useRef([])    // files waiting for user confirmation
  const [pendingFilesDisp, setPendingFilesDisp] = useState([])

  // Search / share
  const [search, setSearch]         = useState('')
  const [shareModal, setShareModal] = useState(null)
  const [shareEmail, setShareEmail] = useState('')

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchFiles = async () => {
    try {
      const { data } = await api.get('/files')
      setAllFiles(data.files)
    } catch { toast.error('Failed to load files') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchFiles()
    const socket = getSocket()
    socket.on('upload:progress', ({ progress: p, stage }) => { setProgress(p); setProgressMsg(stage) })
    socket.on('file:analyzed', ({ fileId, isSuspicious, riskLevel, classification }) => {
      setAllFiles(prev => prev.map(f =>
        f._id === fileId
          ? { ...f, isSuspicious, riskLevel, mlClassification: classification, mlAnalyzedAt: new Date() }
          : f
      ))
      if (isSuspicious || riskLevel === 'high' || riskLevel === 'critical') {
        toast.warning(`⚠️ Suspicious file detected! Risk: ${riskLevel.toUpperCase()}`, { autoClose: 6000 })
      }
    })

    // ── Real-time: someone shared a file WITH the current user ───────────────
    socket.on('file:shared', (newFile) => {
      setAllFiles(prev => {
        // Avoid duplicates if already present (e.g. re-share with permission change)
        const exists = prev.some(f => String(f._id) === String(newFile._id))
        if (exists) {
          return prev.map(f => String(f._id) === String(newFile._id) ? { ...f, ...newFile } : f)
        }
        return [newFile, ...prev]   // prepend so it appears at the top
      })
      toast.info(`📂 ${newFile.sharedByName || newFile.sharedByEmail} shared "${newFile.fileName}" with you`, { autoClose: 5000 })
      // Switch to the "Shared with Me" tab automatically so the user sees it
      setTab('shared')
    })
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      socket.off('upload:progress')
      socket.off('file:analyzed')
      socket.off('file:shared')
    }
  }, [])

  // ── Pre-scan then upload ────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    pendingFilesRef.current = accepted
    setPendingFilesDisp(accepted)

    // 1. Show scanning overlay
    setScanning(true)
    setScanResult(null)

    try {
      const first = accepted[0]
      const sizeMB = first.size / (1024 * 1024)

      // Call the fast prescan endpoint
      const { data } = await api.post('/files/prescan', {
        fileName: first.name,
        sizeMB,
        mimeType: first.type,
      })

      // Simulate a minimum 3-second scan feel
      await new Promise(r => setTimeout(r, 3600))

      setScanning(false)
      setScanResult(data)   // show result — user must confirm
    } catch {
      // If prescan fails, don't block
      setScanning(false)
      setScanResult({ isSuspicious: false, riskLevel: 'low', classification: null })
    }
  }, [])

  // Called when user clicks "Proceed" in scan result overlay
  const handleConfirmUpload = async () => {
    const filesToUpload = pendingFilesRef.current
    setScanResult(null)
    setPendingFilesDisp([])
    pendingFilesRef.current = []

    setUploading(true); setProgress(0); setProgressMsg('Preparing…')
    for (const file of filesToUpload) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success(`${file.name} uploaded!`)
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err.response?.data?.error || err.message}`)
      }
    }
    await fetchFiles()
    setUploading(false); setProgress(0); setProgressMsg('')
  }

  const handleCancelUpload = () => {
    setScanning(false)
    setScanResult(null)
    setPendingFilesDisp([])
    pendingFilesRef.current = []
    toast.info('Upload cancelled')
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, maxSize: 500 * 1024 * 1024,
  })

  // ── File actions ────────────────────────────────────────────────────────────
  const downloadFile = async (file) => {
    try {
      const resp = await api.get(`/files/download/${file._id}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(resp.data)
      const a    = document.createElement('a')
      a.href = url; a.download = file.fileName; a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch { toast.error('Download failed') }
  }

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return
    try {
      await api.delete(`/files/${id}`)
      setAllFiles(f => f.filter(x => x._id !== id))
      toast.success('File deleted')
    } catch { toast.error('Delete failed') }
  }

  const shareFile = async () => {
    if (!shareEmail) return
    try {
      await api.post('/files/share', { fileId: shareModal._id, recipientEmail: shareEmail })
      toast.success(`Shared with ${shareEmail}`)
      setShareModal(null); setShareEmail('')
    } catch (err) { toast.error(err.response?.data?.error || 'Share failed') }
  }

  // ── View data ───────────────────────────────────────────────────────────────
  const myFiles     = allFiles.filter(f => !f.isSharedWithMe)
  const sharedFiles = allFiles.filter(f =>  f.isSharedWithMe)

  const filterFn = list => list.filter(f => f.fileName.toLowerCase().includes(search.toLowerCase()))
  const displayed = filterFn(tab === 'mine' ? myFiles : sharedFiles)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-900 p-6">
      {/* Pre-scan overlay */}
      <ScanOverlay
        scanning={scanning}
        scanResult={scanResult}
        pendingFiles={pendingFilesDisp}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-bold text-white">File Manager</h1>
            <p className="text-slate-400 mt-1">{allFiles.length} files encrypted &amp; distributed</p>
          </div>
          <a href="/dashboard" className="btn-secondary text-sm">Dashboard</a>
        </motion.div>

        {/* Drop Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div {...getRootProps()} className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 mb-8
            ${isDragActive ? 'border-primary-500 bg-primary-500/10 scale-[1.01]' : 'border-white/20 hover:border-primary-500/50 hover:bg-white/5'}`}>
            <input {...getInputProps()} id="file-drop-input" />
            <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}>
              <FiUploadCloud className={`text-5xl mx-auto mb-4 ${isDragActive ? 'text-primary-400' : 'text-slate-600'}`} />
              <p className="text-lg font-semibold text-slate-300 mb-1">
                {isDragActive ? 'Drop files here!' : 'Drag & drop files here'}
              </p>
              <p className="text-slate-500 text-sm">or click to browse · Max 500MB · All types supported</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="text-xs text-slate-600 flex items-center gap-1"><FiShield size={10} /> AES-256-CBC encrypted</span>
                <span className="text-xs text-primary-600 flex items-center gap-1"><FiZap size={10} /> ML scan before upload</span>
              </div>
            </motion.div>
          </div>

          {/* Upload Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div className="glass rounded-xl p-4 mb-6"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">{progressMsg}</span>
                  <span className="text-sm text-primary-400 font-bold">{progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Tab switcher */}
          <div className="flex bg-white/5 rounded-xl p-1 gap-1 shrink-0">
            <button id="tab-my-files"
              onClick={() => setTab('mine')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === 'mine' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <FiFolder size={14} /> My Files
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'mine' ? 'bg-white/20' : 'bg-white/10'}`}>
                {myFiles.length}
              </span>
            </button>
            <button id="tab-shared-files"
              onClick={() => setTab('shared')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === 'shared' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <FiUsers size={14} /> Shared with Me
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'shared' ? 'bg-white/20' : 'bg-white/10'}`}>
                {sharedFiles.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input id="file-search" type="text" placeholder="Search files…" className="input-field pl-11"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* File Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-24 text-slate-600">
            {tab === 'shared'
              ? <><FiUsers className="text-6xl mx-auto mb-4" /><p className="text-xl">No files shared with you yet.</p></>
              : <><FiUploadCloud className="text-6xl mx-auto mb-4" /><p className="text-xl">No files yet. Upload your first file!</p></>}
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show">
            {displayed.map(file => (
              <FileCard
                key={file._id}
                file={file}
                isShared={file.isSharedWithMe}
                onDownload={downloadFile}
                onShare={setShareModal}
                onDelete={deleteFile}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass rounded-2xl p-8 w-full max-w-md"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Share "{shareModal.fileName}"</h3>
                <button onClick={() => setShareModal(null)}><FiX className="text-slate-400 hover:text-white" /></button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                The recipient's RSA public key will be used to share the decryption key securely.
              </p>
              <input id="share-email" type="email" placeholder="Recipient email address" className="input-field mb-4"
                value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && shareFile()} />
              <div className="flex gap-3">
                <button onClick={shareFile} className="btn-primary flex-1 flex items-center gap-2 justify-center">
                  <FiShare2 /> Share File
                </button>
                <button onClick={() => setShareModal(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
