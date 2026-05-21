import { TRIAL_ORDER } from '../constants'

const STATUS = {
  pending: { bg: '#1e293b', color: '#475569', icon: '○' },
  trying:  { bg: '#451a03', color: '#fcd34d', icon: '⟳' },
  success: { bg: '#14532d', color: '#86efac', icon: '✓' },
  failed:  { bg: '#450a0a', color: '#fca5a5', icon: '✗' },
  cached:  { bg: '#1e3a5f', color: '#93c5fd', icon: '⚡' },
}

// TRIAL_ORDER: row = (3-tier), col = providerIndex
// Tier 3 → row 0, Tier 2 → row 1, Tier 1 → row 2
// Google → col 0, OpenAI → col 1, Anthropic → col 2

export default function ModelGrid({ statuses = {} }) {
  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <div />
        {['Google', 'OpenAI', 'Anthropic'].map(p => (
          <div key={p} className="mg-provider">{p}</div>
        ))}
      </div>

      {[3, 2, 1].map(tier => (
        <div key={tier} className="mg-row">
          <div className="mg-tier-label">
            Tier {tier}
            <span className="mg-tier-sub">
              {tier === 3 ? 'cheapest' : tier === 2 ? 'balanced' : 'best'}
            </span>
          </div>
          {[0, 1, 2].map(col => {
            const idx = (3 - tier) * 3 + col
            const trial = TRIAL_ORDER[idx]
            const status = statuses[idx] ?? 'pending'
            const cfg = STATUS[status] ?? STATUS.pending
            return (
              <div
                key={idx}
                className={`mg-card mg-card--${status}`}
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <span className="mg-icon">{cfg.icon}</span>
                <span className="mg-name">{trial.name}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
