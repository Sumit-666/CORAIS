export default function InputForm({ form, onChange, onRun, running }) {
  const set = (field) => (e) => onChange({ ...form, [field]: e.target.value })

  return (
    <div className="input-panel">
      <div className="panel-title">
        <span className="logo">🧠</span>
        <div>
          <h1>CORAIS</h1>
          <p className="logo-sub">Cost-Optimised Routing AI System</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Job Description</label>
        <textarea
          className="form-textarea"
          rows={5}
          placeholder="e.g. We need a Python developer with FastAPI, PostgreSQL and Docker…"
          value={form.jobDescription}
          onChange={set('jobDescription')}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Candidate Name</label>
        <input
          className="form-input"
          type="text"
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
        disabled={running}
      >
        {running ? '⟳  Running…' : '▶  Run CORAIS Pipeline'}
      </button>

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
