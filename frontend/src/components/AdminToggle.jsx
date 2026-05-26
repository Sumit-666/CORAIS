const ROLE_COLORS = {
  user:       { bg: '#1e293b', color: '#94a3b8' },
  admin:      { bg: '#1d4ed8', color: '#bfdbfe' },
  superadmin: { bg: '#581c87', color: '#e9d5ff' },
}

export default function AdminToggle({ view, onToggle, canAdmin, isSuperadmin, user, onSignOut }) {
  const roleStyle = ROLE_COLORS[user?.role] ?? ROLE_COLORS.user

  return (
    <div className="top-bar">
      {user && (
        <div className="user-badge">
          <span>{user.username}</span>
          <span
            className="user-role-chip"
            style={{ background: roleStyle.bg, color: roleStyle.color }}
          >
            {user.role}
          </span>
        </div>
      )}

      <div className="admin-toggle">
        <button
          className={`toggle-btn ${view === 'demo' ? 'toggle-btn--active' : ''}`}
          onClick={() => onToggle('demo')}
        >
          Candidate
        </button>
        {canAdmin && (
          <button
            className={`toggle-btn ${view === 'admin' ? 'toggle-btn--active' : ''}`}
            onClick={() => onToggle('admin')}
          >
            Admin
          </button>
        )}
        {isSuperadmin && (
          <button
            className={`toggle-btn ${view === 'users' ? 'toggle-btn--active' : ''}`}
            onClick={() => onToggle('users')}
          >
            Users
          </button>
        )}
      </div>

      {onSignOut && (
        <button className="signout-btn" onClick={onSignOut}>Sign out</button>
      )}
    </div>
  )
}
