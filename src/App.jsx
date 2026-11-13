import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Estadisticas from './pages/Estadisticas'
import BuzonOficios from './pages/BuzonOficios'
import CrearOficio from './pages/CrearOficio'
import SeguimientoTicket from './pages/SeguimientoTicket'
import Usuarios from './pages/Usuarios'
import CrearUsuario from './pages/CrearUsuario'
import EditarUsuario from './pages/EditarUsuario'
import Notificaciones from './pages/Notificaciones'
import Configuracion from './pages/Configuracion'

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/oficios" element={<BuzonOficios />} />
          <Route path="/oficios/:id" element={<SeguimientoTicket />} />
          <Route element={<ProtectedRoute permission="crear_oficio" />}>
            <Route path="/oficios/nuevo" element={<CrearOficio />} />
          </Route>

          <Route element={<ProtectedRoute permission="ver_estadisticas" />}>
            <Route path="/estadisticas" element={<Estadisticas />} />
          </Route>

          <Route element={<ProtectedRoute permission="gestionar_usuarios" />}>
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/usuarios/nuevo" element={<CrearUsuario />} />
            <Route path="/usuarios/:id/editar" element={<EditarUsuario />} />
          </Route>

          {/* "Mi Perfil" vive en /configuracion (ajustes personales del usuario en sesión) */}
          <Route path="/perfil" element={<Navigate to="/configuracion" replace />} />
          <Route path="/notificaciones" element={<Notificaciones />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
