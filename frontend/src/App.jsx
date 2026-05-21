import { useState, useCallback, useEffect } from 'react'
import InputForm from './components/InputForm'
import StepCard from './components/StepCard'
import { STEPS, INIT_STEP } from './constants'

const initSteps = () =>
  Object.fromEntries(STEPS.map(s => [s.key, { ...INIT_STEP }]))

export default function App() {
  const [form, setForm] = useState({
    jobDescription: '',
    name: 'John Doe',
    skills: '',
    experience: 3,
  })
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState(initSteps)
  const [memory, setMemory] = useState({})
  const [started, setStarted] = useState(false)

  // Load initial memory
  useEffect(() => {
    fetch('/api/memory')
      .then(r => r.json())
      .then(setMemory)
      .catch(() => {})
  }, [])

  const handleEvent = useCallback((event) => {
    const { type, step } = event

    if (['model_trying', 'model_success', 'model_failed', 'model_cached'].includes(type)) {
      const statusMap = {
        model_cached: 'cached',
        model_trying: 'trying',
        model_success: 'success',
        model_failed: 'failed',
      }
      setSteps(prev => ({
        ...prev,
        [step]: {
          ...prev[step],
          status: type === 'model_trying' ? 'running' : prev[step].status,
          currentModel: type === 'model_trying' ? event.model_name : prev[step].currentModel,
          grid: { ...prev[step].grid, [event.trial_index]: statusMap[type] },
        },
      }))
    } else if (type === 'step_result') {
      setSteps(prev => ({
        ...prev,
        [step]: { ...prev[step], status: 'done', result: event.result },
      }))
    } else if (type === 'memory_update') {
      setMemory(event.memory)
    }
  }, [])

  const handleRun = async () => {
    if (!form.jobDescription.trim() || !form.skills.trim()) return
    setRunning(true)
    setStarted(true)
    setSteps(initSteps())

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: form.jobDescription,
          candidate_name: form.name,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          experience: Number(form.experience),
        }),
      })

      const reader = res.body.getReader()
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
            try {
              handleEvent(JSON.parse(line.slice(6)))
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-layout">
      {/* ── Left: inputs ───────────────────────────────────── */}
      <aside className="left-panel">
        <InputForm
          form={form}
          onChange={setForm}
          onRun={handleRun}
          running={running}
        />
      </aside>

      {/* ── Centre: workflow ────────────────────────────────── */}
      <main className="centre-panel">
        {!started ? (
          <div className="empty-state">
            <p className="empty-icon">🧠</p>
            <p className="empty-title">Fill in the form and click Run</p>
            <p className="empty-sub">
              CORAIS will try models from cheapest to most capable,<br />
              stop as soon as one succeeds, and remember it for next time.
            </p>
          </div>
        ) : (
          <div className="steps-list">
            {STEPS.map(s => (
              <StepCard
                key={s.key}
                stepKey={s.key}
                label={s.label}
                icon={s.icon}
                state={steps[s.key]}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Right: memory ───────────────────────────────────── */}
      <aside className="right-panel">
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
