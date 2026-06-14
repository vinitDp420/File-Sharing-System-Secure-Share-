import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiEdit2, FiTrash2, FiUserX, FiUser, FiX } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/api'

const RoleBadge = ({ role }) => (
  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${role === 'admin' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
    {role}
  </span>
)

const StatusBadge = ({ status }) => {
  const map = { active:'badge-low', suspended:'badge-high', deleted:'badge-critical' }
  return <span className={map[status] || 'badge-low'}>{status}</span>
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)

  const fetchUsers = () => {
    api.get(`/admin/users?search=${search}`).then(r => { setUsers(r.data.users); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [search])

  const update = async (id, body) => {
    try {
      await api.patch(`/admin/users/${id}`, body)
      toast.success('User updated')
      fetchUsers()
    } catch { toast.error('Update failed') }
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchUsers() }
    catch { toast.error('Delete failed') }
  }

  const activityData = Array.from({ length: 7 }, (_, i) => ({
    day: ['M','T','W','T','F','S','S'][i], actions: Math.floor(Math.random() * 20)
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} registered users</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input id="user-search" type="text" placeholder="Search users..." className="input-field pl-9 py-2 text-sm w-64"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">User</th>
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">Role</th>
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">Status</th>
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">Storage</th>
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">Joined</th>
              <th className="px-6 py-4 text-slate-400 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="skeleton h-8 rounded"/></td></tr>
            )) : users.map(u => (
              <tr key={u._id} className="table-row">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{u.name}</div>
                      <div className="text-slate-500 text-xs">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                <td className="px-6 py-4 text-slate-400 text-sm">{u.storageUsedMB?.toFixed(1) || 0} MB</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{formatDistanceToNow(new Date(u.createdAt), { addSuffix:true })}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="View">
                      <FiUser size={14}/>
                    </button>
                    <button onClick={() => update(u._id, { role: u.role === 'admin' ? 'user' : 'admin' })} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-violet-400 transition-colors" title="Toggle Role">
                      <FiEdit2 size={14}/>
                    </button>
                    <button onClick={() => update(u._id, { status: u.status === 'active' ? 'suspended' : 'active' })} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-orange-400 transition-colors" title="Suspend/Activate">
                      <FiUserX size={14}/>
                    </button>
                    <button onClick={() => deleteUser(u._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                      <FiTrash2 size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="glass-dark rounded-2xl p-8 w-full max-w-lg"
              initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">User Details</h3>
                <button onClick={() => setSelectedUser(null)}><FiX className="text-slate-400 hover:text-white"/></button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{selectedUser.name}</div>
                  <div className="text-slate-400">{selectedUser.email}</div>
                  <div className="flex gap-2 mt-1">
                    <RoleBadge role={selectedUser.role} />
                    <StatusBadge status={selectedUser.status} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label:'Storage Used', value:`${selectedUser.storageUsedMB?.toFixed(1)||0} MB` },
                  { label:'Login Attempts', value: selectedUser.loginAttempts || 0 },
                  { label:'Last Login', value: selectedUser.lastLoginAt ? formatDistanceToNow(new Date(selectedUser.lastLoginAt), { addSuffix:true }) : 'Never' },
                  { label:'Member Since', value: formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix:true }) },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3">
                    <div className="text-slate-500 text-xs">{s.label}</div>
                    <div className="text-white font-semibold mt-1">{s.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Activity (this week)</h4>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={activityData}>
                    <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="actions" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
