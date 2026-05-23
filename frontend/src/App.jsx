import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Layout from './components/Layout'

import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Inventory from './pages/Inventory'
import Alerts from './pages/Alerts'
import Forecast from './pages/Forecast'
import Segmentation from './pages/Segmentation'
import Staffing from './pages/Staffing'

import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d0f14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#475569', fontSize: '14px' }}>
          Loading...
        </div>
      </div>
    )
  }

  // Redirect to landing page instead of login
  if (!user) return <Navigate to="/home" replace />

  return children
}

function AppRoutes() {
  return (
    <Routes>

      {/* Public landing page */}
      <Route path="/home" element={<Landing />} />

      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="segmentation" element={<Segmentation />} />
        <Route path="staffing" element={<Staffing />} />
      </Route>

    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}