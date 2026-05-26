import { NavLink } from 'react-router-dom'

const ROLE_COLORS = {
  user:       { bg: '#166534', color: '#86efac' },
  admin:      { bg: '#1d4ed8', color: '#bfdbfe' },
  superadmin: { bg: '#581c87', color: '#e9d5ff' },
}

const tabClass = ({ isActive }) => `nav-tab ${isActive ? 'nav-tab--active' : ''}`

export default function Navbar({ user, onSignOut }) {
  const roleStyle = ROLE_COLORS[user?.role] ?? ROLE_COLORS.user
  const isAdmin   = user?.role === 'admin' || user?.role === 'superadmin'

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🧠</span>
        <span className="navbar-title">CORAIS</span>
      </div>

      <div className="navbar-tabs">
        <NavLink to="/" end className={tabClass}>
          Candidate
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={tabClass}>
            Dashboard
          </NavLink>
        )}
      </div>

      <div className="navbar-right">
        {user && (
          <div className="user-info">
            <div className="user-avatar">{user.username?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user.username}</span>
            <span
              className="user-role-chip"
              style={{ background: roleStyle.bg, color: roleStyle.color }}
            >
              {user.role}
            </span>
          </div>
        )}
        <button className="logout-btn" onClick={onSignOut}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </nav>
  )
}
