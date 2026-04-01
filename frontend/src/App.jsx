import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SuperAdminRoute from './components/SuperAdminRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Competitors from './pages/Competitors'
import Module1 from './pages/Module1'
import Module2 from './pages/Module2'
import Module3 from './pages/Module3'
import UserManagement from './pages/UserManagement'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/competitors" element={<ProtectedRoute><Competitors /></ProtectedRoute>} />
          <Route path="/module1" element={<ProtectedRoute><Module1 /></ProtectedRoute>} />
          <Route path="/module2" element={<ProtectedRoute><Module2 /></ProtectedRoute>} />
          <Route path="/module3" element={<ProtectedRoute><Module3 /></ProtectedRoute>} />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <UserManagement />
                </SuperAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
