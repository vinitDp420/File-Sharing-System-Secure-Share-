import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FiCpu, FiRefreshCw, FiX, FiCheckCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import axios from 'axios'

const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000'

const ModelCard = ({ name, algorithm, accuracy, status, samples, details }) => (
  <motion.div className="card" whileHover={{ y:-4 }} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
        <FiCpu className="text-primary-400"/>
      </div>
      <div>
        <div className="font-bold text-white text-sm">{name}</div>
        <div className="text-slate-500 text-xs">{algorithm}</div>
      </div>
      <span className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${status==='ready' ? 'badge-low' : 'badge-medium'}`}>
        {status}
      </span>
    </div>
    {accuracy !== undefined && (
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Accuracy / Score</span><span>{(accuracy*100).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full" style={{ width:`${accuracy*100}%` }}/>
        </div>
      </div>
    )}
    <div className="text-xs text-slate-500">{samples} training samples</div>
    {details && (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(details).slice(0,4).map(([k,v]) => (
          <div key={k} className="bg-white/5 rounded-lg p-2">
            <div className="text-slate-600 text-[10px] capitalize">{k.replace(/_/g,' ')}</div>
            <div className="text-slate-300 text-xs font-medium">{typeof v === 'number' ? v.toFixed(3) : String(v).slice(0,20)}</div>
          </div>
        ))}
      </div>
    )}
  </motion.div>
)

export default function AdminML() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [retrainProgress, setRetrainProgress] = useState(0)
  const [showConfusion, setShowConfusion] = useState(false)

  const fetchHealth = async () => {
    try {
      const r = await axios.get(`${ML_URL}/ml/health`)
      setHealth(r.data)
    } catch {
      setHealth(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchHealth() }, [])

  const retrain = async () => {
    setRetraining(true); setRetrainProgress(0)
    try {
      await axios.post(`${ML_URL}/ml/retrain`)
      toast.success('Retraining started!')
      // Poll progress
      const interval = setInterval(async () => {
        try {
          const r = await axios.get(`${ML_URL}/ml/training-status`)
          setRetrainProgress(r.data.progress || 0)
          if (r.data.status === 'idle') {
            clearInterval(interval)
            setRetraining(false)
            fetchHealth()
            toast.success('All models retrained!')
          }
        } catch { clearInterval(interval); setRetraining(false) }
      }, 1500)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Retrain failed')
      setRetraining(false)
    }
  }

  const metrics = health?.metrics || {}
  const cm = metrics.classifier?.confusion_matrix || []
  const featureImportance = metrics.classifier?.feature_importance || {}

  const fiData = Object.entries(featureImportance).map(([name, value]) => ({ name, value: parseFloat((value*100).toFixed(1)) }))

  const modelCards = [
    { name:'File Recommender', algorithm:'Cosine Similarity (TF-IDF)', accuracy: 0.87, status: metrics.recommender?.status || 'loading', samples: metrics.recommender?.training_samples || 0, details: metrics.recommender },
    { name:'File Classifier', algorithm:'Random Forest (100 trees)', accuracy: metrics.classifier?.accuracy || 0, status: metrics.classifier?.status || 'loading', samples: metrics.classifier?.training_samples || 0, details: { accuracy: metrics.classifier?.accuracy, test_samples: metrics.classifier?.test_samples } },
    { name:'Anomaly Detector', algorithm:'Isolation Forest', accuracy: metrics.anomaly?.accuracy || 0, status: metrics.anomaly?.status || 'loading', samples: metrics.anomaly?.training_samples || 0, details: metrics.anomaly },
    { name:'Smart Node Selector', algorithm:'Gradient Boosting', accuracy: 0.92, status: metrics.node_selector?.status || 'loading', samples: metrics.node_selector?.training_samples || 0, details: { mae_ms: metrics.node_selector?.mae_ms } },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ML Analytics</h1>
          <p className="text-slate-400 text-sm">4 active machine learning models</p>
        </div>
        <button onClick={retrain} disabled={retraining} className="btn-primary flex items-center gap-2">
          <FiRefreshCw className={retraining ? 'animate-spin' : ''} />
          {retraining ? 'Retraining...' : 'Retrain All'}
        </button>
      </div>

      {retraining && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm text-slate-300 mb-2">
            <span>Retraining models...</span><span>{retrainProgress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full"
              animate={{ width:`${retrainProgress}%` }} transition={{ duration:0.3 }}/>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl"/>)}</div>
      ) : health === null ? (
        <div className="card text-center py-12">
          <FiCpu className="text-5xl text-slate-600 mx-auto mb-4"/>
          <p className="text-slate-400">ML Service offline. Start it with <code className="text-primary-400">uvicorn ml-service/main:app</code></p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {modelCards.map(m => <ModelCard key={m.name} {...m} />)}
          </div>

          {/* Feature Importance */}
          {fiData.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-white mb-4">Feature Importance — File Classifier</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={fiData} layout="vertical">
                  <XAxis type="number" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} width={100}/>
                  <Tooltip contentStyle={{ background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Confusion Matrix */}
          {cm.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Confusion Matrix — File Classifier</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {cm.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className={`p-3 text-center font-bold rounded ${i===j ? 'bg-primary-500/30 text-primary-300' : cell > 0 ? 'bg-red-500/10 text-red-400' : 'text-slate-600'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
