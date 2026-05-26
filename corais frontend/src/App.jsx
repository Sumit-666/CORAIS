import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage       from './pages/AuthPage'
import DashboardShell from './pages/DashboardShell'
import { useAuth }    from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/"      element={<ProtectedRoute><DashboardShell /></ProtectedRoute>} />
      <Route path="*"      element={<Navigate to="/" replace />} />
    </Routes>
  )
}
