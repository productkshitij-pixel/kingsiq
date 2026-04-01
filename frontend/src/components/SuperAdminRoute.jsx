import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route so only super admins can access it.
 * Everyone else gets silently redirected to /dashboard.
 */
const SuperAdminRoute = ({ children }) => {
  const { profile, isSuperAdmin, loading } = useAuth()

  if (loading) return null

  // Wait for profile to load before deciding
  if (profile && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default SuperAdminRoute
