import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ConnectionBanner from './components/Common/ConnectionBanner'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Kubernetes from './pages/Kubernetes'
import Compute    from './pages/Compute'
import Databases  from './pages/Databases'
import Logs       from './pages/Logs'
import Alerts     from './pages/Alerts'
import Topology   from './pages/Topology'

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* ConnectionBanner sits outside the router layout so it is visible
          on all pages including Login, independent of the sidebar */}
      <ConnectionBanner />

      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/"          element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
        <Route path="/kubernetes"element={<ProtectedRoute><Kubernetes /></ProtectedRoute>} />
        <Route path="/compute"   element={<ProtectedRoute><Compute    /></ProtectedRoute>} />
        <Route path="/databases" element={<ProtectedRoute><Databases  /></ProtectedRoute>} />
        <Route path="/logs"      element={<ProtectedRoute><Logs       /></ProtectedRoute>} />
        <Route path="/alerts"    element={<ProtectedRoute><Alerts     /></ProtectedRoute>} />
        <Route path="/topology"  element={<ProtectedRoute><Topology   /></ProtectedRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
