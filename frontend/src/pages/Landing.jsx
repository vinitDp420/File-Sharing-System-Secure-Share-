import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiShield, FiLock, FiServer, FiZap, FiUsers, FiCheck, FiArrowRight, FiGlobe } from 'react-icons/fi'
import CountUp from 'react-countup'

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } }

const features = [
  { icon: FiLock, title: 'AES-256 Encryption', desc: 'Military-grade encryption with RSA-2048 key exchange. Every file encrypted before leaving your device.', img: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&h=300&fit=crop', color: 'from-blue-600 to-blue-400' },
  { icon: FiServer, title: 'Distributed Storage', desc: 'Files split into 1MB chunks distributed across geo-redundant nodes with automatic replication.', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=300&fit=crop', color: 'from-violet-600 to-violet-400' },
  { icon: FiZap, title: 'ML-Powered Security', desc: 'Isolation Forest anomaly detection, smart node selection and file classification — in real time.', img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=300&fit=crop', color: 'from-emerald-600 to-emerald-400' },
]

const stats = [
  { value: 10000, suffix: '+', label: 'Files Shared', icon: FiServer },
  { value: 99.9, suffix: '%', label: 'Uptime', icon: FiZap, decimals: 1 },
  { value: 256, suffix: '-bit', label: 'AES Encryption', icon: FiLock },
  { value: 2048, suffix: '-bit', label: 'RSA Key Strength', icon: FiShield },
]

const testimonials = [
  { id:'t1', name:'Sarah Chen', role:'Security Engineer', text:'SecureShare finally gives me confidence when sharing sensitive code across teams. The encryption is bulletproof.' },
  { id:'t2', name:'Marcus Rivera', role:'Data Scientist', text:'The ML anomaly detection caught a brute-force attempt before it did any damage. Incredible system.' },
  { id:'t3', name:'Priya Patel', role:'CTO', text:'Distributed storage with live node monitoring — exactly what enterprise file sharing should look like.' },
]

// Animated particle dots (CSS only, no external lib needed as fallback)
const Particle = ({ style }) => (
  <motion.div
    className="absolute rounded-full bg-primary-500/20"
    style={style}
    animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
    transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
  />
)

export default function Landing() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    key: i,
    style: {
      width: `${4 + Math.random() * 16}px`,
      height: `${4 + Math.random() * 16}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }
  }))

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full glass-dark border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiShield className="text-primary-400 text-2xl" />
            <span className="text-xl font-bold gradient-text">SecureShare</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-slate-400 text-sm">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hover:text-white transition-colors">Stats</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* BG Image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop" alt="cybersecurity" className="w-full h-full object-cover opacity-10" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-900/80 via-dark-900/60 to-dark-900" />
        </div>

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map(p => <Particle key={p.key} style={p.style} />)}
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-primary-400 mb-8 border border-primary-500/20">
              <FiShield className="text-xs" />
              <span>Military-Grade Distributed File Security</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Secure Files.{' '}
              <span className="gradient-text">Distributed.</span>{' '}
              <br />Intelligent.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              SecureShare uses <strong className="text-white">AES-256 encryption</strong>, distributed chunked storage across geo-redundant nodes, and <strong className="text-white">ML-powered anomaly detection</strong> — all in a live admin panel.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-8 py-4 animate-pulse-glow">
                Start Sharing Securely <FiArrowRight />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
                Sign In
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-6 mt-14 text-sm text-slate-500">
              {['AES-256-CBC Encrypted', 'RSA-2048 Key Exchange', 'Isolation Forest Anomaly Detection', 'Zero-Knowledge Architecture'].map(b => (
                <div key={b} className="flex items-center gap-1.5">
                  <FiCheck className="text-emerald-400 text-xs" />
                  <span>{b}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="stats" className="py-16 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          >
            {stats.map(s => (
              <motion.div key={s.label} variants={fadeUp} className="text-center">
                <s.icon className="text-primary-400 text-2xl mx-auto mb-3" />
                <div className="text-3xl font-black gradient-text">
                  <CountUp end={s.value} decimals={s.decimals || 0} duration={2} suffix={s.suffix} enableScrollSpy scrollSpyOnce />
                </div>
                <div className="text-slate-500 text-sm mt-1">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">Why <span className="gradient-text">SecureShare?</span></motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 text-lg max-w-2xl mx-auto">Enterprise-grade security meets intelligent distributed computing</motion.p>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-8" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -8, scale: 1.02 }} className="glass rounded-2xl overflow-hidden group">
                <div className="relative h-48 overflow-hidden">
                  <img src={f.img} alt={f.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${f.color} opacity-60`} />
                  <f.icon className="absolute top-4 right-4 text-white text-2xl" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Architecture Visual */}
      <section className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <motion.div className="grid md:grid-cols-2 gap-16 items-center" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.div variants={fadeUp}>
              <h2 className="text-4xl font-bold mb-6">Distributed <span className="gradient-text">Architecture</span></h2>
              <div className="space-y-4">
                {[
                  { icon: FiShield, title: 'End-to-End Encryption', desc: 'Files encrypted with AES-256-CBC before transmission. AES keys wrapped with recipient\'s RSA-2048 public key.' },
                  { icon: FiServer, title: 'Chunked Storage', desc: '1MB chunks distributed across multiple nodes. Automatic replication ensures fault tolerance.' },
                  { icon: FiZap, title: 'Smart Node Selection', desc: 'Gradient Boosting model ranks nodes by predicted latency in real time.' },
                  { icon: FiGlobe, title: 'Geo-Redundant Nodes', desc: 'Storage nodes across US-East, US-West, EU-Central, and AP-South regions.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 glass rounded-xl hover:bg-white/10 transition-colors">
                    <item.icon className="text-primary-400 text-xl mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm">{item.title}</div>
                      <div className="text-slate-400 text-sm mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="relative">
              <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop" alt="server datacenter" className="rounded-2xl w-full h-80 object-cover" loading="lazy" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary-600/20 to-accent-600/20" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold mb-4">Trusted by <span className="gradient-text">Security Teams</span></h2>
          </motion.div>
          <motion.div className="grid md:grid-cols-3 gap-8" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {testimonials.map(t => (
              <motion.div key={t.id} variants={fadeUp} whileHover={{ y: -4 }} className="glass p-6 rounded-2xl">
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={`https://i.pravatar.cc/48?u=${t.id}`} alt={t.name} className="w-10 h-10 rounded-full" loading="lazy" />
                  <div>
                    <div className="font-semibold text-white text-sm">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div className="max-w-3xl mx-auto text-center glass rounded-3xl p-16" initial={{ opacity:0, scale:0.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once: true }}>
          <FiShield className="text-primary-400 text-5xl mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Ready to share <span className="gradient-text">securely?</span></h2>
          <p className="text-slate-400 mb-8">Join thousands of users protecting their files with military-grade encryption and ML-powered security.</p>
          <Link to="/register" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
            Create Free Account <FiArrowRight />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FiShield className="text-primary-400" />
          <span className="font-semibold text-slate-400">SecureShare</span>
        </div>
        <p>SecureShare — Distributed Computing · AES-256 · RSA-2048 · ML-Powered Security</p>
      </footer>
    </div>
  )
}
