import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUser, FiMail, FiLock, FiShield, FiDownload, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [privateKey, setPrivateKey] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.refreshToken, data.user)
      setPrivateKey(data.privateKey)
      toast.success('Account created! Save your private key.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadKey = () => {
    const blob = new Blob([privateKey], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `secureshare_private_key_${form.email}.pem`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=1000&fit=crop" alt="secure server" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 to-primary-900/40" />
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <div className="flex items-center gap-3 mb-8">
            <FiShield className="text-primary-400 text-3xl" />
            <span className="text-2xl font-bold text-white">SecureShare</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Join the most secure file sharing platform</h2>
          <p className="text-slate-300 leading-relaxed">Your files are encrypted with AES-256 before they leave your device. Only you hold the RSA private key.</p>
          <div className="mt-8 space-y-3">
            {['AES-256-CBC file encryption', 'RSA-2048 key pair generated at signup', 'Distributed storage across 3+ nodes', 'ML anomaly detection on all activity'].map(f => (
              <div key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <FiCheck className="text-emerald-400 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-dark-900">
        <motion.div className="w-full max-w-md" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5 }}>
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <FiShield className="text-primary-400 text-2xl" />
            <span className="text-xl font-bold gradient-text">SecureShare</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400 mb-8">Start sharing files securely today</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="reg-name" type="text" placeholder="Full name" className="input-field pl-11"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="reg-email" type="email" placeholder="Email address" className="input-field pl-11"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="reg-password" type={showPw ? 'text' : 'password'} placeholder="Password (min 6 chars)" className="input-field pl-11 pr-11"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <button id="reg-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2 py-4">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Sign in</Link>
          </p>
        </motion.div>
      </div>

      {/* Private Key Modal */}
      <AnimatePresence>
        {privateKey && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="glass rounded-2xl p-8 max-w-lg w-full"
              initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <FiShield className="text-amber-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Save Your Private Key</h3>
                  <p className="text-amber-400 text-xs">⚠️ This will only be shown ONCE</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-4">Your RSA-2048 private key is used to decrypt files. Store it safely — if lost, files cannot be recovered.</p>
              <div className="bg-black/40 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all font-mono">{privateKey}</pre>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadKey} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  <FiDownload /> Download .pem File
                </button>
                <button onClick={() => { setPrivateKey(null); navigate('/dashboard') }} className="btn-secondary flex-1 text-center">
                  I've saved it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
