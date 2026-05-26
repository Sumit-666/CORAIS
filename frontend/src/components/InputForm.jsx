export default function InputForm({ form, onChange, onRun, running, currentJob, jobError }) {
  const set = (field) => (e) => onChange({ ...form, [field]: e.target.value })
  const canRun = !running && currentJob && form.name.trim() && form.skills.trim()

  return (
    <div className="input-panel">
      <div className="panel-title">
        <span className="logo">🧠</span>
        <div>
          <h1>CORAIS</h1>
          <p className="logo-sub">Cost-Optimised Routing AI System</p>
        </div>
      </div>

      {/* ── Active Job Posting ─────────────────────────────── */}
      {jobError ? (
        <div className="job-card job-card--empty">
          <p className="job-card-label">Active Opening</p>
          <p className="job-card-none">No job posted yet. Contact the recruiter.</p>
        </div>
      ) : currentJob ? (
        <div className="job-card">
          <p className="job-card-label">Active Opening</p>
          <p className="job-card-title">{currentJob.title}</p>
          <p className="job-card-company">{currentJob.company}</p>
          <p className="job-card-desc">{currentJob.description}</p>
        </div>
      ) : (
        <div className="job-card job-card--loading">
          <p className="job-card-label">Active Opening</p>
          <p className="job-card-none">Loading…</p>
        </div>
      )}

      <div className="form-divider" />

      {/* ── Candidate Profile ──────────────────────────────── */}
      <p className="section-label">Your Profile</p>

      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Jane Smith"
          value={form.name}
          onChange={set('name')}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Skills <span className="form-hint">(comma separated)</span></label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="e.g. Python, Django, MySQL, REST APIs"
          value={form.skills}
          onChange={set('skills')}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Years of Experience</label>
        <input
          className="form-input form-input--short"
          type="number"
          min={0}
          max={50}
          value={form.experience}
          onChange={set('experience')}
        />
      </div>

      <button
        className="run-btn"
        onClick={onRun}
        disabled={!canRun}
      >
        {running ? '⟳  Evaluating…' : '▶  Apply & Evaluate'}
      </button>

      {jobError && (
        <p className="run-btn-hint">A job must be posted before you can apply.</p>
      )}

      <div className="trial-order">
        <p className="trial-order-title">Trial Order (first → last)</p>
        <p className="trial-order-text">
          Tier 3: Gemini Flash Lite → GPT-4.1 Nano → Haiku 3.5<br />
          Tier 2: Gemini 2.5 Flash → GPT-5 Mini → Sonnet 4<br />
          Tier 1: Gemini 2.5 Pro → GPT-5 → Opus 4
        </p>
      </div>
    </div>
  )
}
