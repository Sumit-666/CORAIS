export default function AdminToggle({ view, onToggle }) {
  return (
    <div className="admin-toggle">
      <button
        className={`toggle-btn ${view === 'demo' ? 'toggle-btn--active' : ''}`}
        onClick={() => onToggle('demo')}
      >
        Candidate
      </button>
      <button
        className={`toggle-btn ${view === 'admin' ? 'toggle-btn--active' : ''}`}
        onClick={() => onToggle('admin')}
      >
        Admin
      </button>
    </div>
  )
}
