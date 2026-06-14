import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiShield, FiHome, FiUsers, FiFile, FiServer, FiAlertTriangle,
  FiCpu, FiFileText, FiSettings, FiBarChart2, FiMenu, FiX,
  FiBell, FiSearch, FiLogOut, FiChevronLeft, FiUser
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../lib/socket'
import { toast } from 'react-toastify'

const navItems = [
  { to: '/admin', icon: FiHome, label: 'Overview', end:true },
  { to: '/admin/users', icon: FiUsers, label: 'Users' },
  { to: '/admin/files', icon: FiFile, label: 'Files' },
  { to: '/admin/nodes', icon: FiServer, label: 'Nodes' },
  { to: '/admin/security', icon: FiAlertTriangle, label: 'Security' },
  { to: '/admin/ml', icon: FiCpu, label: 'ML Analytics' },
  { to: '/admin/logs', icon: FiFileText, label: 'Logs' },
  { to: '/admin/settings', icon: FiSettings, label: 'Settings' },
  { to: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || 'blue')

  useEffect(() => {
    const socket = getSocket()
    socket.on('anomaly:detected', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev.slice(0, 19)])
      toast.warning(`🚨 Anomaly: ${data.risk_level?.toUpperCase()} risk from ${data.user_id}`, { autoClose: 5000 })
    })
    socket.on('activity:new', (data) => {
      toast.info(`📁 ${data.name || 'User'} performed: ${data.action}`, { autoClose: 2000 })
    })
    return () => { socket.off('anomaly:detected'); socket.off('activity:new') }
  }, [])

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen flex bg-dark-900" data-accent={accentColor}>
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        className="flex-shrink-0 h-screen sticky top-0 flex flex-col bg-black/40 backdrop-blur-xl border-r border-white/5 overflow-hidden z-40"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 min-h-[73px]">
          <FiShield className="text-primary-400 text-2xl flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}>
                <div className="font-bold text-white leading-none">SecureShare</div>
                <div className="text-xs text-slate-500">Admin Panel</div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-slate-500 hover:text-white transition-colors">
            {collapsed ? <FiMenu size={18}/> : <FiChevronLeft size={18}/>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : ''}>
              <item.icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="text-sm font-medium">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <Link to="/profile" title="My Profile">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 hover:ring-2 hover:ring-primary-400 transition-all">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </Link>
            <AnimatePresence>
              {!collapsed && (
                <motion.div className="flex-1 min-w-0" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                  <Link to="/profile" className="text-sm font-medium text-white truncate hover:text-primary-400 transition-colors block">{user?.name}</Link>
                  <div className="text-xs text-slate-500">Administrator</div>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
                <FiLogOut size={16}/>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-black/20 backdrop-blur-xl border-b border-white/5">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input type="text" placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary-500/50" />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <Link to="/profile" className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="My Profile">
              <FiUser size={18}/>
            </Link>
            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <FiBell size={18}/>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotif && (
                  <motion.div className="absolute right-0 top-12 w-80 glass-dark rounded-2xl shadow-2xl z-50 overflow-hidden"
                    initial={{ opacity:0, y:-10, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-10, scale:0.95 }}>
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">Anomaly Alerts</span>
                      <button onClick={() => { setNotifications(n => n.map(x => ({...x,read:true}))); setShowNotif(false) }} className="text-xs text-primary-400 hover:underline">Clear all</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-600 text-sm">No anomalies detected</div>
                      ) : notifications.slice(0,10).map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-white/5 text-sm ${!n.read ? 'bg-white/5' : ''}`}>
                          <div className="text-slate-300">{n.user_id} — <span className={`font-semibold ${n.risk_level === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{n.risk_level?.toUpperCase()}</span> risk</div>
                          <div className="text-slate-600 text-xs mt-0.5">{new Date(n.id).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div key={location.pathname} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            <Outlet context={{ setAccentColor }} />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
