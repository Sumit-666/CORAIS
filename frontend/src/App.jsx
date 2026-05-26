import { useState, useCallback, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import InputForm from './components/InputForm'
import StepCard from './components/StepCard'
import Navbar from './components/Navbar'
import AdminDashboard from './components/AdminDashboard'
import SuperadminDashboard from './components/SuperadminDashboard'
import UserManagement from './components/UserManagement'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { useAuth } from './context/AuthContext'
import { STEPS, INIT_STEP } from './constants'

// ── Output summaries ──────────────────────────────────────────────────────────

function OutputSummary({ stepKey, result }) {
  if (stepKey === 'jd_parsing') {
    const skills = result.skills || []
    return (
      <div className="out-content">
        <span className="out-count">{skills.length} skills</span>
        <div className="out-tags">
          {skills.slice(0, 4).map(s => <span key={s} className="out-tag">{s}</span>)}
          {skills.length > 4 && <span className="out-tag out-tag--more">+{skills.length - 4}</span>}
        </div>
      </div>
    )
  }
  if (stepKey === 'candidate_evaluation') {
    const hire = (result.hire_recommendation || '').toLowerCase()
    return (
      <div className="out-content">
        <span className="out-score">{result.overall_score}<span className="out-score-denom">/100</span></span>
        <span className={`out-hire out-hire--${hire}`}>{hire}</span>
      </div>
    )
  }
  if (stepKey === 'career_advice') {
    const text = result.advice || ''
    return <p className="out-text">{text.slice(0, 120)}{text.length > 120 ? '…' : ''}</p>
  }
  if (stepKey === 'cover_letter') {
    const text = result.letter || ''
    return <p className="out-text">{text.slice(0, 120)}{text.length > 120 ? '…' : ''}</p>
  }
  return null
}

const initSteps = () => Object.fromEntries(STEPS.map(s => [s.key, { ...INIT_STEP }]))

// ── Candidate view (/) ────────────────────────────────────────────────────────

function CandidateView() {
  const { authFetch } = useAuth()
  const [form, setForm]             = useState({ name: '', skills: '', experience: 3 })
  const [currentJob, setCurrentJob] = useState(null)
  const [jobError,   setJobError]   = useState(false)
  const [running,  setRunning]  = useState(false)
  const [steps,    setSteps]    = useState(initSteps)
  const [memory,   setMemory]   = useState({})
  const [started,  setStarted]  = useState(false)

  useEffect(() => {
    authFetch('/api/job')
      .then(r => { if (!r.ok) throw new Error('no job'); return r.json() })
      .then(job => { setCurrentJob(job); setJobError(false) })
      .catch(e => { if (e.message !== 'Unauthorized') setJobError(true) })

    authFetch('/api/memory')
      .then(r => r.json())
      .then(setMemory)
      .catch(() => {})
  }, [authFetch])

  const handleEvent = useCallback((event) => {
    const { type, step } = event
    if (['model_trying', 'model_success', 'model_failed', 'model_cached'].includes(type)) {
      const statusMap = { model_cached: 'cached', model_trying: 'trying', model_success: 'success', model_failed: 'failed' }
      setSteps(prev => ({
        ...prev,
        [step]: {
          ...prev[step],
          status:       type === 'model_trying' ? 'running' : prev[step].status,
          currentModel: type === 'model_trying' ? event.model_name : prev[step].currentModel,
          grid: { ...prev[step].grid, [event.trial_index]: statusMap[type] },
        },
      }))
    } else if (type === 'budget_blocked') {
      setSteps(prev => ({ ...prev, [step]: { ...prev[step], status: 'blocked' } }))
    } else if (type === 'step_result') {
      setSteps(prev => ({ ...prev, [step]: { ...prev[step], status: 'done', result: event.result } }))
    } else if (type === 'memory_update') {
      setMemory(event.memory)
    }
  }, [])

  const handleRun = async () => {
    if (!currentJob || !form.name.trim() || !form.skills.trim()) return
    setRunning(true)
    setStarted(true)
    setSteps(initSteps())
    try {
      const res = await authFetch('/api/run', {
        method: 'POST',
        body: JSON.stringify({
          candidate_name: form.name,
          skills:         form.skills.split(',').map(s => s.trim()).filter(Boolean),
          experience:     Number(form.experience),
        }),
      })
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { handleEvent(JSON.parse(line.slice(6))) } catch {}
          }
        }
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') console.error(err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-layout">
      <aside className="left-panel">
        <InputForm
          form={form}
          onChange={setForm}
          onRun={handleRun}
          running={running}
          currentJob={currentJob}
          jobError={jobError}
        />
      </aside>

      <main className="centre-panel">
        {!started ? (
          <div className="empty-state">
            <p className="empty-icon">🧠</p>
            <p className="empty-title">Fill in your profile and click Apply</p>
            <p className="empty-sub">
              CORAIS will match your skills to the job, try models from cheapest
              to most capable, stop as soon as one succeeds, and remember it for next time.
            </p>
          </div>
        ) : (
          <div className="steps-list">
            {STEPS.map(s => (
              <StepCard key={s.key} stepKey={s.key} label={s.label} icon={s.icon} state={steps[s.key]} />
            ))}
          </div>
        )}
      </main>

      <aside className="right-panel">
        {started && (
          <div className="out-section">
            <p className="out-title">Outputs</p>
            {STEPS.map(s => {
              const st = steps[s.key]
              if (!st?.result) return null
              return (
                <div key={s.key} className="out-card">
                  <p className="out-label">{s.icon} {s.label}</p>
                  <OutputSummary stepKey={s.key} result={st.result} />
                </div>
              )
            })}
            {STEPS.every(s => !steps[s.key]?.result) && <p className="memory-empty">Running…</p>}
          </div>
        )}
        <p className="memory-title">Learned Memory</p>
        <p className="memory-sub">CORAIS remembers which model worked.</p>
        {Object.keys(memory).length === 0 ? (
          <p className="memory-empty">No memory yet.</p>
        ) : (
          Object.entries(memory).map(([task, entry]) => (
            <div key={task} className="memory-card">
              <p className="memory-task">{task.replace(/_/g, ' ')}</p>
              <p className="memory-model">{entry.model_name}</p>
              <p className="memory-meta">
                Tier {entry.tier} · {entry.provider} · {entry.success_count} run{entry.success_count !== 1 ? 's' : ''}
              </p>
            </div>
          ))
        )}
      </aside>
    </div>
  )
}

// ── /admin route — shows analytics or superadmin dashboard ────────────────────

function AdminRoute() {
  const { user } = useAuth()
  if (user?.role === 'superadmin') return <SuperadminDashboard />
  return <AdminDashboard />
}

// ── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole === 'admin' && !['admin', 'superadmin'].includes(user.role)) {
    return <Navigate to="/" replace />
  }
  if (requiredRole === 'superadmin' && user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

// ── Layout wrapper (navbar shown on all protected pages) ──────────────────────

function Layout({ children }) {
  const { user, logout } = useAuth()
  return (
    <>
      <Navbar user={user} onSignOut={logout} />
      {children}
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected — all authenticated users */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><CandidateView /></Layout>
        </ProtectedRoute>
      } />

      {/* Protected — admin + superadmin */}
      <Route path="/admin/*" element={
        <ProtectedRoute requiredRole="admin">
          <Layout><AdminRoute /></Layout>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
