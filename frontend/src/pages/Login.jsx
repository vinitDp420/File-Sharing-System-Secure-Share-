import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiLock, FiShield, FiEye, FiEyeOff } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [focused, setFocused] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.refreshToken, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-dark-900">
        <motion.div className="w-full max-w-md" initial={{ opacity:0, x:-30 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5 }}>
          <div className="flex items-center gap-2 mb-8">
            <FiShield className="text-primary-400 text-2xl" />
            <span className="text-xl font-bold gradient-text">SecureShare</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-8">Sign in to your secure vault</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`relative gradient-border rounded-xl transition-all duration-300 ${focused === 'email' ? 'shadow-lg shadow-primary-500/20' : ''}`}>
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input id="login-email" type="email" placeholder="Email address" className="input-field pl-11 relative z-10"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')} required />
            </div>
            <div className={`relative gradient-border rounded-xl transition-all duration-300 ${focused === 'password' ? 'shadow-lg shadow-primary-500/20' : ''}`}>
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input id="login-password" type={showPw ? 'text' : 'password'} placeholder="Password" className="input-field pl-11 pr-11 relative z-10"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-10">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <button id="login-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2 py-4">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            No account? <Link to="/register" className="text-primary-400 hover:text-primary-300">Create one</Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 glass rounded-xl text-xs text-slate-500">
            <p className="font-semibold text-slate-400 mb-1">First registered user becomes Admin</p>
            <p>Register at <Link to="/register" className="text-primary-400">/register</Link> to get started</p>
          </div>
        </motion.div>
      </div>

      {/* Right — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&h=1000&fit=crop" alt="security" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-dark-900/80 to-accent-900/40" />
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <h2 className="text-4xl font-bold text-white mb-4">Your files.<br /><span className="gradient-text">Always secure.</span></h2>
          <p className="text-slate-300 leading-relaxed">Zero-knowledge architecture means even we can't read your files. Encrypted with your unique RSA key pair.</p>
        </div>
      </div>
    </div>
  )
}
