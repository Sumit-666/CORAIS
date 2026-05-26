import ModelGrid from './ModelGrid'

function JdResult({ result }) {
  return (
    <div className="result-block">
      <p className="result-label">Required Skills</p>
      <div className="skills-wrap">
        {(result.skills || []).map(s => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
      </div>
    </div>
  )
}

function EvalResult({ result }) {
  const hire = (result.hire_recommendation || '').toLowerCase()
  return (
    <div className="result-block">
      <div className="eval-top">
        <div className="eval-score">
          <span className="score-num">{result.overall_score}</span>
          <span className="score-denom">/100</span>
        </div>
        <span className={`hire-badge hire-${hire}`}>{hire}</span>
      </div>
      <div className="eval-lists">
        <div>
          <p className="list-title">Strengths</p>
          <ul className="eval-list">
            {(result.strengths || []).map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div>
          <p className="list-title">Gaps</p>
          <ul className="eval-list gaps">
            {(result.gaps || []).map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function AdviceResult({ result }) {
  return (
    <div className="result-block">
      <p className="result-label">Improvement Tips</p>
      <p className="advice-text">{result.advice}</p>
    </div>
  )
}

function CoverLetterResult({ result }) {
  return (
    <div className="result-block">
      <p className="result-label">Cover Letter</p>
      <div className="cover-letter-text">
        {(result.letter || '').split('\n').map((line, i) => (
          <p key={i} className={line.trim() === '' ? 'cover-letter-spacer' : 'cover-letter-line'}>
            {line || ' '}
          </p>
        ))}
      </div>
    </div>
  )
}

const RESULT_MAP = {
  jd_parsing:           JdResult,
  candidate_evaluation: EvalResult,
  career_advice:        AdviceResult,
  cover_letter:         CoverLetterResult,
}

export default function StepCard({ stepKey, label, icon, state }) {
  const { status, grid, result, currentModel } = state
  const ResultComp = RESULT_MAP[stepKey]

  return (
    <div className={`step-card step-card--${status}`}>
      <div className="step-header">
        <span className="step-icon">{icon}</span>
        <span className="step-title">{label}</span>
        {status === 'running' && currentModel && (
          <span className="step-status trying">Trying {currentModel}…</span>
        )}
        {status === 'done' && (
          <span className="step-status done">✓ Done</span>
        )}
      </div>

      <ModelGrid statuses={grid} />

      {result && ResultComp && (
        <ResultComp result={result} />
      )}
    </div>
  )
}
