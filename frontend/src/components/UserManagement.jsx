import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_OPTIONS = ['user', 'admin', 'superadmin']

export default function UserManagement() {
  const { authFetch, user: currentUser } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/users')
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      if (e.message !== 'Unauthorized') setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { load() }, [load])

  const changeRole = async (userId, role) => {
    try {
      await authFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
    } catch (e) {
      if (e.message !== 'Unauthorized') setError('Failed to update role')
    }
  }

  const deleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      setUsers(u => u.filter(x => x.id !== userId))
    } catch (e) {
      if (e.message !== 'Unauthorized') setError('Failed to delete user')
    }
  }

  if (loading) return <div className="admin-loading">Loading users…</div>

  return (
    <div className="users-layout">
      <h2 className="users-heading">User Management</h2>
      {error && <p className="auth-error">{error}</p>}
      <table className="users-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>
                {u.username}
                {u.id === currentUser?.id && (
                  <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>(you)</span>
                )}
              </td>
              <td style={{ color: '#64748b' }}>{u.email}</td>
              <td>
                {u.id === currentUser?.id ? (
                  <span className={`role-badge role-badge--${u.role}`}>{u.role}</span>
                ) : (
                  <select
                    className="role-select"
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </td>
              <td style={{ color: '#64748b', fontSize: 12 }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
              </td>
              <td>
                {u.id !== currentUser?.id && (
                  <button className="delete-btn" onClick={() => deleteUser(u.id, u.username)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
