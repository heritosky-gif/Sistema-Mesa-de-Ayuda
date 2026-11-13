import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Requiere sesión; si se pasa `permission`, además exige ese permiso
export default function ProtectedRoute({ permission }) {
  const { isAuthenticated, can } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
