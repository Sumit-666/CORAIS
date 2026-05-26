import { useState, useEffect, useCallback } from 'react'

const TIER_COLOR = {
  NORMAL:   '#22c55e',
  CONSERVE: '#f59e0b',
  CRITICAL: '#ef4444',
  STOPPED:  '#7f1d1d',
}

const HEALTH_COLOR = {
  healthy:  '#22c55e',
  degraded: '#f59e0b',
  down:     '#ef4444',
}

function fmt$(n) { return `$${Number(n).toFixed(4)}` }
function fmtPct(n) { return `${Number(n).toFixed(1)}%` }
function fmtMs(n) { return `${n}ms` }
function fmtTime(iso) {
  if (!iso) return '—'
  return iso.slice(11, 19)
}

export default function AdminDashboard() {
  const [stats,  setStats]  = useState(null)
  const [logs,   setLogs]   = useState([])
  const [models, setModels] = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [statsRes, logsRes, modelsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/logs?limit=50'),
        fetch('/api/admin/models'),
      ])
      const [s, l, m] = await Promise.all([
        statsRes.json(), logsRes.json(), modelsRes.json(),
      ])
      setStats(s)
      setLogs(l)
      setModels(m)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15_000)
    return () => clearInterval(id)
  }, [refresh])

  const toggleModel = async (modelId) => {
    await fetch(`/api/admin/models/${modelId}/toggle`, { method: 'PATCH' })
    refresh()
  }

  if (loading) return <div className="admin-loading">Loading dashboard…</div>

  const budget  = stats?.budget  ?? {}
  const cache   = stats?.cache   ?? {}
  const routing = stats?.routing ?? {}

  const modelDist = routing.model_distribution ?? {}
  const avgCost   = routing.total_calls > 0
    ? routing.total_cost / routing.total_calls
    : 0

  return (
    <div className="admin-layout">

      {/* ── Budget + Stats row ──────────────────────────────── */}
      <div className="admin-row">

        {/* Budget gauge */}
        <div className="admin-section admin-section--budget">
          <div className="admin-section-title">
            Daily Budget
            <span className="tier-badge" style={{ background: TIER_COLOR[budget.tier] ?? '#475569' }}>
              {budget.tier ?? '—'}
            </span>
          </div>
          <div className="budget-numbers">
            <span className="budget-spend">{fmt$(budget.today_spend ?? 0)}</span>
            <span className="budget-ceiling"> / ${budget.ceiling ?? 50}</span>
          </div>
          <div className="budget-bar-track">
            <div
              className="budget-bar-fill"
              style={{
                width: `${Math.min(budget.pct ?? 0, 100)}%`,
                background: TIER_COLOR[budget.tier] ?? '#22c55e',
              }}
            />
          </div>
          <p className="budget-pct">{fmtPct(budget.pct ?? 0)} used today</p>
        </div>

        {/* Stats boxes */}
        <div className="admin-stats-grid">
          <div className="stat-box">
            <p className="stat-value">{routing.total_calls ?? 0}</p>
            <p className="stat-label">Calls Today</p>
          </div>
          <div className="stat-box">
            <p className="stat-value">{fmtPct(routing.cache_hit_rate ?? 0)}</p>
            <p className="stat-label">Cache Hit Rate</p>
          </div>
          <div className="stat-box">
            <p className="stat-value">{fmt$(avgCost)}</p>
            <p className="stat-label">Avg Cost / Call</p>
          </div>
          <div className="stat-box">
            <p className="stat-value">{cache.active_entries ?? 0}</p>
            <p className="stat-label">Cache Entries</p>
          </div>
        </div>
      </div>

      {/* ── Model Health ────────────────────────────────────── */}
      <div className="admin-section">
        <p className="admin-section-title">Model Health</p>
        <div className="model-health-grid">
          {Object.entries(models).map(([id, m]) => (
            <div key={id} className="model-health-card">
              <div className="mhc-top">
                <span
                  className="health-dot"
                  style={{ background: m.is_active ? (HEALTH_COLOR[m.health_status] ?? '#475569') : '#475569' }}
                />
                <span className="mhc-name">{m.display_name}</span>
                <span className="mhc-tier">T{m.tier}</span>
              </div>
              <p className="mhc-cost">
                ${m.cost_per_1m_input} / ${m.cost_per_1m_output} per 1M
              </p>
              <button
                className={`mhc-toggle ${m.is_active ? 'mhc-toggle--on' : 'mhc-toggle--off'}`}
                onClick={() => toggleModel(id)}
              >
                {m.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Routing distribution + Logs ─────────────────────── */}
      <div className="admin-row admin-row--bottom">

        {/* Routing distribution */}
        <div className="admin-section admin-section--dist">
          <p className="admin-section-title">Model Usage Today</p>
          {Object.keys(modelDist).length === 0 ? (
            <p className="admin-empty">No calls yet today.</p>
          ) : (
            <table className="dist-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modelDist)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([mid, d]) => (
                    <tr key={mid}>
                      <td>{d.model_name}</td>
                      <td>{d.count}</td>
                      <td>{fmt$(d.total_cost)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent logs */}
        <div className="admin-section admin-section--logs">
          <p className="admin-section-title">Recent Routing Logs</p>
          {logs.length === 0 ? (
            <p className="admin-empty">No logs yet.</p>
          ) : (
            <div className="logs-scroll">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Task</th>
                    <th>Model</th>
                    <th>Cost</th>
                    <th>Latency</th>
                    <th>Cache</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="log-time">{fmtTime(l.timestamp)}</td>
                      <td>{l.prompt_type?.replace(/_/g, ' ')}</td>
                      <td>{l.model_name ?? l.model_id}</td>
                      <td>{fmt$(l.cost_usd ?? 0)}</td>
                      <td>{fmtMs(l.latency_ms ?? 0)}</td>
                      <td>
                        <span className={`log-cache ${l.cache_hit ? 'log-cache--hit' : 'log-cache--miss'}`}>
                          {l.cache_hit ? 'HIT' : 'MISS'}
                        </span>
                      </td>
                      <td>
                        <span className="tier-badge tier-badge--sm"
                          style={{ background: TIER_COLOR[l.budget_tier] ?? '#475569' }}>
                          {l.budget_tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
