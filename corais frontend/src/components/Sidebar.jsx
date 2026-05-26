const NAV = {
  user: [
    { section: 'Main', items: [
      { id: 'dashboard', icon: '⊞', label: 'Dashboard'    },
      { id: 'jobs',      icon: '✦', label: 'Job Postings' },
      { id: 'profile',   icon: '◯', label: 'My Profile'   },
    ]},
  ],
  admin: [
    { section: 'Main', items: [
      { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    ]},
    { section: 'Insights', items: [
      { id: 'analytics', icon: '↗', label: 'Analytics' },
      { id: 'reports',   icon: '≡', label: 'Reports'   },
    ]},
    { section: 'Manage', items: [
      { id: 'jobs',      icon: '✦', label: 'Job Postings' },
    ]},
  ],
  superadmin: [
    { section: 'Main', items: [
      { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    ]},
    { section: 'Insights', items: [
      { id: 'analytics', icon: '↗', label: 'Analytics' },
      { id: 'reports',   icon: '≡', label: 'Reports'   },
    ]},
    { section: 'Manage', items: [
      { id: 'jobs',      icon: '✦', label: 'Job Postings' },
      { id: 'users',     icon: '◉', label: 'Users'        },
    ]},
    { section: 'System', items: [
      { id: 'settings',  icon: '⚙', label: 'Settings' },
    ]},
  ],
}

export default function Sidebar({ user, active, onSelect, onLogout }) {
  const role     = user?.role ?? 'user'
  const sections = NAV[role] ?? NAV.user

  return (
    <aside className="w-60 min-w-[240px] h-screen bg-[#0d1320] border-r border-slate-800 flex flex-col overflow-hidden">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <span className="text-2xl">🧠</span>
        <div>
          <div className="text-sm font-bold text-white tracking-tight">CORAIS</div>
          <div className="text-xs text-slate-500">AI Orchestration</div>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map(({ section, items }) => (
          <div key={section}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
              {section}
            </div>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 cursor-pointer
                  ${active === item.id
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <span className="text-base w-5 text-center leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User card + logout */}
      <div className="px-3 py-4 border-t border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{user?.username}</div>
          <div className="text-xs text-slate-500 capitalize">{role}</div>
        </div>
        <button onClick={onLogout} title="Sign out"
          className="text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

    </aside>
  )
}
