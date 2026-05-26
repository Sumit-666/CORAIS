const SECTION_META = {
  dashboard: { title: 'Dashboard',    sub: 'Overview of your activity'   },
  analytics: { title: 'Analytics',    sub: 'Routing and cost insights'   },
  reports:   { title: 'Reports',      sub: 'Detailed run reports'        },
  jobs:      { title: 'Job Postings', sub: 'Browse open positions'       },
  users:     { title: 'Users',        sub: 'Manage accounts and roles'   },
  settings:  { title: 'Settings',     sub: 'System configuration'        },
  profile:   { title: 'My Profile',   sub: 'Your account details'        },
}

const ROLE_COLORS = {
  user:       'bg-green-900/50 text-green-300',
  admin:      'bg-blue-900/50  text-blue-300',
  superadmin: 'bg-purple-900/50 text-purple-300',
}

export default function TopBar({ user, active }) {
  const meta = SECTION_META[active] ?? { title: 'CORAIS', sub: '' }
  const role = user?.role ?? 'user'

  return (
    <header className="h-[60px] flex items-center justify-between px-7 border-b border-slate-800 bg-[#0f172a] shrink-0">
      <div>
        <div className="text-base font-bold text-white">{meta.title}</div>
        {meta.sub && <div className="text-xs text-slate-500">{meta.sub}</div>}
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${ROLE_COLORS[role] ?? ROLE_COLORS.user}`}>
        {role}
      </span>
    </header>
  )
}
