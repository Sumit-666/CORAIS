import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const STEP_LABELS = {
  resume_parse:         'Parsing Resume',
  jd_parsing:           'Analyzing Job Description',
  candidate_evaluation: 'Evaluating Candidate',
  career_advice:        'Generating Career Advice',
  cover_letter:         'Writing Cover Letter',
}

const REC_COLORS = {
  yes:   'bg-green-900/50 text-green-400',
  maybe: 'bg-amber-900/50 text-amber-400',
  no:    'bg-red-900/50   text-red-400',
}

// ── Step progress ─────────────────────────────────────────────────────────────

function StepProgress({ statuses }) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(STEP_LABELS).map(([id, label]) => {
        const s = statuses[id] ?? 'idle'
        const dotColor =
          s === 'trying'  ? 'bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]' :
          s === 'success' ? 'bg-green-500' :
          s === 'failed'  ? 'bg-red-500'   : 'bg-slate-700'
        const textColor =
          s === 'success' ? 'text-white' :
          s === 'trying'  ? 'text-slate-300' : 'text-slate-500'
        return (
          <div key={id} className="flex items-center gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${dotColor}`} />
            <span className={`flex-1 transition-colors ${textColor}`}>{label}</span>
            {s === 'trying'  && <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">running…</span>}
            {s === 'success' && <span className="text-[11px] px-2 py-0.5 rounded bg-green-900/50 text-green-400">done</span>}
            {s === 'failed'  && <span className="text-[11px] px-2 py-0.5 rounded bg-red-900/50 text-red-400">failed</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────

function Results({ data }) {
  const [tab, setTab] = useState('evaluation')
  const evaluation = data.candidate_evaluation ?? {}
  const skills     = data.resume_parse?.skills   ?? []
  const jdSkills   = data.jd_parsing?.skills     ?? []
  const advice     = data.career_advice?.advice   ?? ''
  const letter     = data.cover_letter?.letter    ?? ''

  const tabs = [
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'skills',     label: 'Skills'      },
    { id: 'advice',     label: 'Advice'      },
    { id: 'letter',     label: 'Cover Letter'},
  ]

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-slate-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer
              ${tab === t.id
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'evaluation' && (
          <div>
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-5xl font-black text-white">{evaluation.overall_score ?? '—'}</span>
              <span className="text-xl text-slate-500">/100</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${REC_COLORS[evaluation.hire_recommendation] ?? REC_COLORS.no}`}>
                {evaluation.hire_recommendation ?? '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Strengths</div>
                {(evaluation.strengths ?? []).map((s, i) => (
                  <div key={i} className="text-sm text-green-400 py-1">✓ {s}</div>
                ))}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gaps</div>
                {(evaluation.gaps ?? []).map((g, i) => (
                  <div key={i} className="text-sm text-red-400 py-1">✗ {g}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'skills' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Your Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Role Requirements</div>
              <div className="flex flex-wrap gap-1.5">
                {jdSkills.map((s, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-900/60 text-indigo-300">{s}</span>)}
              </div>
            </div>
          </div>
        )}

        {tab === 'advice' && (
          <pre className="text-sm text-slate-400 whitespace-pre-wrap leading-7 font-sans">
            {advice || 'No advice generated.'}
          </pre>
        )}

        {tab === 'letter' && (
          <pre className="text-sm text-slate-400 whitespace-pre-wrap leading-7 font-sans">
            {letter || 'No cover letter generated.'}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── Apply modal ───────────────────────────────────────────────────────────────

function ApplyModal({ job, token, onClose }) {
  const [name,    setName]    = useState('')
  const [exp,     setExp]     = useState('')
  const [file,    setFile]    = useState(null)
  const [error,   setError]   = useState('')
  const [running, setRunning] = useState(false)
  const [statuses, setStatuses] = useState({})
  const [results,  setResults]  = useState(null)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a resume file'); return }
    setError('')
    setRunning(true)
    setResults(null)
    setStatuses({})
    setDone(false)

    const fd = new FormData()
    fd.append('candidate_name', name)
    fd.append('experience', exp)
    fd.append('resume', file)

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail || 'Application failed')
        setRunning(false)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      const acc     = {}

      while (true) {
        const { done: sd, value } = await reader.read()
        if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'model_trying')                      setStatuses(s => ({ ...s, [ev.step]: 'trying' }))
            else if (ev.type === 'model_success' || ev.type === 'model_cached') setStatuses(s => ({ ...s, [ev.step]: 'success' }))
            else if (ev.type === 'model_failed')                 setStatuses(s => ({ ...s, [ev.step]: 'failed' }))
            else if (ev.type === 'step_result') { acc[ev.step] = ev.result; setResults({ ...acc }) }
            else if (ev.type === 'done')         setDone(true)
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-slate-800 rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-7 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-white">Apply — {job.title}</div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mt-0.5">{job.company}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white hover:bg-slate-800 transition-colors p-1.5 rounded-lg cursor-pointer text-base leading-none">✕</button>
        </div>

        {/* Form */}
        {!running && !done && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoFocus
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Years of Experience</label>
              <input type="number" min="0" max="50" value={exp} onChange={e => setExp(e.target.value)} placeholder="e.g. 3" required
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resume</label>
              <label className="block border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-500 cursor-pointer text-center hover:border-indigo-500 hover:text-slate-300 transition-colors">
                {file ? file.name : 'Choose PDF / DOCX / TXT…'}
                <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={e => setFile(e.target.files[0])} className="hidden" />
              </label>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit"
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer">
              Submit Application
            </button>
          </form>
        )}

        {/* Pipeline results */}
        {(running || done) && (
          <div className="flex flex-col gap-5">
            <StepProgress statuses={statuses} />
            {results && <Results data={results} />}
            {done && (
              <button onClick={onClose}
                className="w-full py-3 rounded-xl border border-indigo-600 text-indigo-400 hover:bg-indigo-600 hover:text-white font-bold text-sm transition-colors cursor-pointer">
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function JobsPanel() {
  const { token }  = useAuth()
  const [jobs,     setJobs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [applying, setApplying] = useState(null)

  useEffect(() => {
    fetch('/api/jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Failed to load jobs'); setLoading(false) })
  }, [token])

  if (loading) return <div className="text-center text-slate-500 py-16 text-sm">Loading job postings…</div>
  if (error)   return <div className="text-center text-red-400  py-16 text-sm">{error}</div>

  return (
    <>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white mb-1">Job Postings</h2>
        <p className="text-sm text-slate-500">Browse open positions and apply with your resume.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-900 border border-dashed border-slate-700 rounded-xl text-slate-500 gap-3">
          <span className="text-4xl opacity-40">📋</span>
          <span className="font-semibold">No job postings yet</span>
          <span className="text-sm">Check back later or contact your recruiter.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...jobs].reverse().map(job => (
            <div key={job.id}
              className="bg-gray-900 border border-slate-800 hover:border-indigo-500 rounded-xl p-6 flex items-start gap-5 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-white mb-0.5">{job.title}</div>
                <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-3">{job.company}</div>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{job.description}</p>
              </div>
              <button onClick={() => setApplying(job)}
                className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                Apply Now
              </button>
            </div>
          ))}
        </div>
      )}

      {applying && (
        <ApplyModal job={applying} token={token} onClose={() => setApplying(null)} />
      )}
    </>
  )
}
