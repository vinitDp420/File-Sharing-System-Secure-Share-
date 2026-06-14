import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiUser, FiMail, FiLock, FiShield, FiDownload, FiSave,
  FiLogOut, FiTrash2, FiEdit3, FiCheck, FiX, FiArrowLeft,
  FiHardDrive, FiFile, FiActivity, FiKey, FiEye, FiEyeOff,
  FiAlertTriangle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

/* ─── tiny sub-components ─── */
const StatCard = ({ icon: Icon, label, value, suffix = '', color }) => {
  const numVal = typeof value === 'number' && isFinite(value) ? value : 0
  const display = numVal % 1 !== 0 ? numVal.toFixed(1) : numVal
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`text-xl ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <div className="text-2xl font-black text-white">{display}{suffix}</div>
        <div className="text-slate-500 text-sm">{label}</div>
      </div>
    </div>
  )
}

const Field = ({ label, value, icon: Icon }) => (
  <div>
    <label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">{label}</label>
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <Icon className="text-slate-500 flex-shrink-0" size={15} />
      <span className="text-slate-300 text-sm">{value}</span>
    </div>
  </div>
)

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName]         = useState('')
  const [savingName, setSavingName]   = useState(false)

  // Change password
  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw]     = useState({})
  const [savingPw, setSavingPw] = useState(false)

  // Delete account modal
  const [deleteModal, setDeleteModal]   = useState(false)
  const [deletePass, setDeletePass]     = useState('')
  const [deleting, setDeleting]         = useState(false)

  // Avatar ring progress
  const storageLimit = 1024
  const storagePct   = Math.min(((profile?.storageUsedMB || 0) / storageLimit) * 100, 100)

  useEffect(() => {
    api.get('/auth/profile')
      .then(r => {
        setProfile(r.data.user)
        setStats(r.data.stats)
        setNewName(r.data.user.name)
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  /* ─── save name ─── */
  const saveName = async () => {
    if (!newName.trim() || newName === profile.name) { setEditingName(false); return }
    setSavingName(true)
    try {
      const r = await api.patch('/auth/profile', { name: newName.trim() })
      setProfile(p => ({ ...p, name: r.data.user.name }))
      if (updateUser) updateUser({ name: r.data.user.name })
      toast.success('Name updated!')
      setEditingName(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally { setSavingName(false) }
  }

  /* ─── change password ─── */
  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast.error('New passwords do not match'); return }
    if (pwForm.next.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSavingPw(true)
    try {
      await api.patch('/auth/profile', { currentPassword: pwForm.current, newPassword: pwForm.next })
      toast.success('Password changed successfully!')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password change failed')
    } finally { setSavingPw(false) }
  }

  /* ─── download private key (stored in localStorage if saved) ─── */
  const downloadKey = () => {
    try {
      const key = localStorage.getItem('privateKey')
      if (!key) { toast.warning('Private key not found in browser storage. You must have saved it during registration.'); return }
      const blob = new Blob([key], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `secureshare_${profile?.email}_private.pem`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Private key downloaded')
    } catch { toast.error('Could not download key') }
  }

  /* ─── delete account ─── */
  const deleteAccount = async () => {
    if (!deletePass) { toast.error('Enter your password'); return }
    setDeleting(true)
    try {
      await api.delete('/auth/profile', { data: { password: deletePass } })
      toast.success('Account deleted. Goodbye!')
      logout()
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    } finally { setDeleting(false) }
  }

  const togglePw = (field) => setShowPw(p => ({ ...p, [field]: !p[field] }))

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Back nav */}
        <motion.div className="flex items-center gap-3 mb-8" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}>
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <FiArrowLeft size={16}/> Back to Dashboard
          </Link>
        </motion.div>

        {/* ── Hero card ── */}
        <motion.div className="glass rounded-3xl p-8 mb-6 relative overflow-hidden"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar with storage ring */}
            <div className="relative flex-shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90 absolute inset-0">
                <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
                <circle cx="44" cy="44" r="40" fill="none" stroke="url(#ringGrad)" strokeWidth="4"
                  strokeDasharray={`${storagePct * 2.513} ${(100-storagePct) * 2.513}`} strokeLinecap="round"/>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-white/10">
                {profile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-dark-900" title="Online"/>
            </div>

            {/* Name & email */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input id="profile-name-input" autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter') saveName(); if(e.key==='Escape') setEditingName(false) }}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-2xl font-bold focus:outline-none focus:border-primary-500 w-full max-w-xs"/>
                  <button onClick={saveName} disabled={savingName} className="p-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors">
                    {savingName ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <FiCheck size={16}/>}
                  </button>
                  <button onClick={() => { setEditingName(false); setNewName(profile.name) }} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 transition-colors">
                    <FiX size={16}/>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white truncate">{profile?.name}</h1>
                  <button onClick={() => { setEditingName(true) }} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors" title="Edit name">
                    <FiEdit3 size={14}/>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                <FiMail size={13}/> {profile?.email}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${profile?.role === 'admin' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                  {profile?.role === 'admin' ? '👑 Administrator' : '👤 User'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ Active
                </span>
                {profile?.lastLoginAt && (
                  <span className="text-xs text-slate-500">
                    Last login {formatDistanceToNow(new Date(profile.lastLoginAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
              <Link to="/dashboard" className="btn-ghost text-sm py-2 flex items-center gap-2">
                <FiActivity size={14}/> Dashboard
              </Link>
              <Link to="/files" className="btn-ghost text-sm py-2 flex items-center gap-2">
                <FiFile size={14}/> My Files
              </Link>
              <button onClick={logout} className="btn-ghost text-sm py-2 flex items-center gap-2 text-red-400 hover:text-red-300">
                <FiLogOut size={14}/> Sign Out
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
          <StatCard icon={FiFile} label="Total Files" value={stats.fileCount || 0} color="bg-blue-500"/>
          <StatCard icon={FiHardDrive} label="Storage Used" value={parseFloat((profile?.storageUsedMB || 0).toFixed(1))} suffix=" MB" color="bg-violet-500"/>
          <StatCard icon={FiShield} label="Security" value={100} suffix="%" color="bg-emerald-500"/>
          <StatCard icon={FiActivity} label="Login Attempts" value={profile?.loginAttempts || 0} color="bg-amber-500"/>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Account Info ── */}
          <motion.div className="card" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.15 }}>
            <h2 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
              <FiUser className="text-primary-400"/> Account Information
            </h2>
            <div className="space-y-4">
              <Field label="Full Name"     value={profile?.name}  icon={FiUser}/>
              <Field label="Email Address" value={profile?.email} icon={FiMail}/>
              <Field label="Role"          value={profile?.role === 'admin' ? 'Administrator' : 'Standard User'} icon={FiShield}/>
              <Field label="Member Since"  value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—'} icon={FiActivity}/>
            </div>

            {/* Storage bar */}
            <div className="mt-5 pt-5 border-t border-white/5">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span className="flex items-center gap-1"><FiHardDrive size={13}/> Storage</span>
                <span>{(profile?.storageUsedMB || 0).toFixed(1)} / {storageLimit} MB</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-600"
                  initial={{ width:0 }} animate={{ width:`${storagePct}%` }} transition={{ duration:1, delay:0.3 }}/>
              </div>
            </div>
          </motion.div>

          {/* ── Change Password ── */}
          <motion.div className="card" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}>
            <h2 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
              <FiLock className="text-primary-400"/> Change Password
            </h2>
            <form onSubmit={changePassword} className="space-y-4">
              {[
                { id:'current', label:'Current Password', key:'current' },
                { id:'new-pw', label:'New Password',      key:'next'    },
                { id:'confirm-pw', label:'Confirm New Password', key:'confirm' },
              ].map(f => (
                <div key={f.id}>
                  <label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">{f.label}</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                    <input
                      id={f.id}
                      type={showPw[f.key] ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-field pl-10 pr-10 py-3 text-sm"
                      value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                    <button type="button" onClick={() => togglePw(f.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      {showPw[f.key] ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={savingPw || !pwForm.current || !pwForm.next}
                className="btn-primary w-full flex items-center gap-2 justify-center py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {savingPw ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <FiSave size={14}/>}
                {savingPw ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>

          {/* ── Security & Keys ── */}
          <motion.div className="card" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.25 }}>
            <h2 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
              <FiKey className="text-primary-400"/> Security & Encryption
            </h2>
            <div className="space-y-3">
              {[
                { label:'Encryption', value:'AES-256-CBC', status:'Active', color:'text-emerald-400' },
                { label:'Key Type',   value:'RSA-2048',    status:'Active', color:'text-emerald-400' },
                { label:'Signature',  value:'SHA-256',     status:'Active', color:'text-emerald-400' },
                { label:'Session',    value:'JWT (24h)',   status:'Active', color:'text-blue-400'    },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-slate-300 text-sm">{r.label}</div>
                    <div className="text-slate-500 text-xs">{r.value}</div>
                  </div>
                  <span className={`text-xs font-semibold ${r.color}`}>{r.status}</span>
                </div>
              ))}
            </div>

            {/* RSA Key download */}
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-slate-500 text-xs mb-3">
                Your RSA-2048 private key is required to decrypt shared files. Store it safely.
              </p>
              <button onClick={downloadKey}
                className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium">
                <FiDownload size={14}/> Download Private Key (.pem)
              </button>
            </div>
          </motion.div>

          {/* ── Danger Zone ── */}
          <motion.div className="card border border-red-500/20" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }}>
            <h2 className="font-bold text-red-400 text-lg mb-2 flex items-center gap-2">
              <FiAlertTriangle/> Danger Zone
            </h2>
            <p className="text-slate-500 text-sm mb-5">
              Once your account is deleted, all files, encryption keys, and data are permanently removed.
              This action cannot be undone.
            </p>
            <button onClick={() => setDeleteModal(true)}
              className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium">
              <FiTrash2 size={14}/> Delete My Account
            </button>
          </motion.div>

        </div>
      </div>

      {/* ── Delete account confirmation modal ── */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="glass-dark rounded-2xl p-8 w-full max-w-md border border-red-500/30"
              initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:20 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <FiTrash2 className="text-red-400 text-xl"/>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Delete Account</h3>
                  <p className="text-slate-500 text-xs">This action is permanent and irreversible</p>
                </div>
                <button onClick={() => { setDeleteModal(false); setDeletePass('') }} className="ml-auto text-slate-500 hover:text-white">
                  <FiX size={18}/>
                </button>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5 text-sm text-red-300">
                ⚠️ All your files, chunks across all nodes, and encryption keys will be permanently deleted.
              </div>

              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">Enter your password to confirm</label>
              <div className="relative mb-5">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                <input
                  id="delete-confirm-password"
                  type="password"
                  placeholder="Your password"
                  className="input-field pl-10 py-3 text-sm border-red-500/30 focus:border-red-500/60"
                  value={deletePass}
                  onChange={e => setDeletePass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && deleteAccount()}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={deleteAccount} disabled={deleting || !deletePass}
                  className="flex-1 flex items-center gap-2 justify-center py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <FiTrash2 size={14}/>}
                  {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                </button>
                <button onClick={() => { setDeleteModal(false); setDeletePass('') }}
                  className="flex-1 btn-secondary py-3">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
