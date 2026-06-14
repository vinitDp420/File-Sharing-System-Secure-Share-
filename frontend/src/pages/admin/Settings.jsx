import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSave, FiMoon, FiSun, FiMail, FiShield, FiDatabase } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useOutletContext } from 'react-router-dom'

const ACCENT_COLORS = [
  { name:'Blue', value:'blue', class:'bg-blue-500' },
  { name:'Violet', value:'violet', class:'bg-violet-500' },
  { name:'Emerald', value:'emerald', class:'bg-emerald-500' },
  { name:'Rose', value:'rose', class:'bg-rose-500' },
  { name:'Amber', value:'amber', class:'bg-amber-500' },
]

const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-white/10'} relative`}>
    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${checked ? 'left-6' : 'left-1'}`}/>
  </button>
)

export default function AdminSettings() {
  const [acc, setAcc] = useState(localStorage.getItem('accentColor') || 'blue')
  const [maxUpload, setMaxUpload] = useState(500)
  const [replication, setReplication] = useState(2)
  const [maintenance, setMaintenance] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [smtp, setSmtp] = useState({ host:'', port:587, user:'', pass:'' })

  const save = (section) => {
    localStorage.setItem('accentColor', acc)
    toast.success(`${section} settings saved!`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm">Configure system-wide preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Theme */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Appearance</h3>
          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-3 block">Accent Color</label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map(c => (
                <button key={c.value} onClick={() => setAcc(c.value)}
                  className={`w-8 h-8 rounded-full ${c.class} transition-all ${acc === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  title={c.name}/>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              {darkMode ? <FiMoon/> : <FiSun/>} {darkMode ? 'Dark Mode' : 'Light Mode'}
            </div>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
          <button onClick={() => save('Theme')} className="btn-primary mt-4 py-2 text-sm flex items-center gap-2"><FiSave/>Save Theme</button>
        </div>

        {/* Storage */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><FiDatabase/>Storage Settings</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <label>Max Upload Size</label><span className="text-white font-medium">{maxUpload} MB</span>
              </div>
              <input type="range" min={10} max={1000} step={10} value={maxUpload} onChange={e => setMaxUpload(+e.target.value)}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <label>Replication Factor</label><span className="text-white font-medium">{replication}x</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={replication} onChange={e => setReplication(+e.target.value)}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>1x (No replication)</span><span>5x (Max redundancy)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm">Maintenance Mode</div>
                <div className="text-slate-600 text-xs">Disable uploads/downloads for all users</div>
              </div>
              <Toggle checked={maintenance} onChange={setMaintenance} />
            </div>
          </div>
          <button onClick={() => save('Storage')} className="btn-primary mt-4 py-2 text-sm flex items-center gap-2"><FiSave/>Save Storage</button>
        </div>

        {/* SMTP */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><FiMail/>SMTP Configuration</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">SMTP Host</label>
              <input type="text" placeholder="smtp.gmail.com" className="input-field py-2 text-sm"
                value={smtp.host} onChange={e => setSmtp({...smtp, host:e.target.value})} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Port</label>
              <input type="number" placeholder="587" className="input-field py-2 text-sm"
                value={smtp.port} onChange={e => setSmtp({...smtp, port:+e.target.value})} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Username</label>
              <input type="text" placeholder="user@domain.com" className="input-field py-2 text-sm"
                value={smtp.user} onChange={e => setSmtp({...smtp, user:e.target.value})} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Password</label>
              <input type="password" placeholder="••••••••" className="input-field py-2 text-sm"
                value={smtp.pass} onChange={e => setSmtp({...smtp, pass:e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => save('SMTP')} className="btn-primary py-2 text-sm flex items-center gap-2"><FiSave/>Save SMTP</button>
            <button onClick={() => toast.info('Test email sent!')} className="btn-secondary py-2 text-sm flex items-center gap-2"><FiMail/>Test</button>
          </div>
        </div>

        {/* Backup */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><FiShield/>Backup & Restore</h3>
          <div className="flex gap-3">
            <button onClick={() => toast.success('Backup initiated!')} className="btn-primary py-2 text-sm">Create Backup</button>
            <button onClick={() => toast.info('Select backup file to restore')} className="btn-secondary py-2 text-sm">Restore</button>
          </div>
        </div>
      </div>
    </div>
  )
}
