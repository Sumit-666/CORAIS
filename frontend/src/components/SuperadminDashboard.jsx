import { NavLink, Outlet, Route, Routes } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import UserManagement from './UserManagement'

const tabClass = ({ isActive }) => `sa-tab ${isActive ? 'sa-tab--active' : ''}`

export default function SuperadminDashboard() {
  return (
    <div className="sa-dash">
      <div className="sa-tabs">
        <NavLink to="/admin" end className={tabClass}>
          System Overview
        </NavLink>
        <NavLink to="/admin/users" className={tabClass}>
          User Management
        </NavLink>
      </div>

      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
      </Routes>
    </div>
  )
}
