import { useState } from 'react'
import Sidebar   from '../components/Sidebar'
import TopBar    from '../components/TopBar'
import JobsPanel from '../components/JobsPanel'
import { useAuth } from '../context/AuthContext'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-slate-800 rounded-xl p-5">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-600">{sub}</div>
    </div>
  )
}

// ── Panels ────────────────────────────────────────────────────────────────────

function DashboardPanel() {
  return (
    <>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white mb-1">Dashboard</h2>
        <p className="text-sm text-slate-500">Welcome back — here's what's happening.</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Runs"     value="—" sub="All time"     />
        <StatCard label="Success Rate"   value="—" sub="Last 30 days" />
        <StatCard label="Avg Cost"       value="—" sub="Per run"      />
        <StatCard label="Cache Hit Rate" value="—" sub="Today"        />
      </div>
      <div className="bg-gray-900 border border-slate-800 rounded-xl p-6">
        <div className="text-sm font-semibold text-white mb-4">Recent Activity</div>
        <div className="space-y-3">
          {[80, 60, 70, 45].map((w, i) => (
            <div key={i} className="h-3 bg-slate-800 rounded opacity-60" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </>
  )
}

function AnalyticsPanel() {
  return (
    <>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white mb-1">Analytics</h2>
        <p className="text-sm text-slate-500">Model routing performance and cost breakdown.</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Calls Today"   value="—" sub="Across all models" />
        <StatCard label="Total Cost"    value="—" sub="Today"             />
        <StatCard label="Budget Tier"   value="—" sub="Current"           />
        <StatCard label="Cache Entries" value="—" sub="Active"            />
      </div>
      <div className="bg-gray-900 border border-slate-800 rounded-xl p-6">
        <div className="text-sm font-semibold text-white mb-4">Model Usage Distribution</div>
        <div className="space-y-3">
          {[70, 50, 85].map((w, i) => (
            <div key={i} className="h-3 bg-slate-800 rounded opacity-60" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </>
  )
}

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-900 border border-dashed border-slate-700 rounded-xl text-slate-500 gap-3">
      <span className="text-4xl opacity-40">🔧</span>
      <span className="font-semibold">{label}</span>
      <span className="text-sm">This section is coming soon</span>
    </div>
  )
}

const PANELS = {
  dashboard: <DashboardPanel />,
  analytics: <AnalyticsPanel />,
  reports:   <ComingSoon label="Reports"          />,
  users:     <ComingSoon label="User Management"  />,
  settings:  <ComingSoon label="Settings"         />,
  profile:   <ComingSoon label="My Profile"       />,
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function DashboardShell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a]">
      <Sidebar user={user} active={active} onSelect={setActive} onLogout={logout} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={user} active={active} />
        <main className="flex-1 overflow-y-auto p-8">
          {active === 'jobs'
            ? <JobsPanel />
            : (PANELS[active] ?? <ComingSoon label={active} />)
          }
        </main>
      </div>
    </div>
  )
}
