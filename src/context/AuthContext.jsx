import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)
const STORAGE_KEY = 'helpdesk.user'
const TOKEN_KEY = 'jwt_token'

const ROLES = {
  ADMIN: 'ADMIN',
  TECNICO: 'TECNICO',
  INTERMEDIARIO: 'INTERMEDIARIO',
  SOLICITANTE: 'SOLICITANTE'
}

const PERMISSIONS = {
  [ROLES.ADMIN]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio', 'ver_todas_dependencias', 'asignar_tickets'],
  [ROLES.TECNICO]: ['atender_tickets', 'crear_oficio'],
  [ROLES.INTERMEDIARIO]: ['ver_estadisticas', 'crear_oficio', 'ver_todas_dependencias'],
  [ROLES.SOLICITANTE]: ['crear_oficio'],
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)

  // Persistencia de Sesión
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TOKEN_KEY)
      delete axiosClient.defaults.headers.common['Authorization']
    }
  }, [user])

  const login = useCallback(async (correo, password) => {
    try {
      const response = await axiosClient.post('/api/usuarios/login', { correo, password })
      const tokenString = response.data.token

      if (!tokenString) {
        return { ok: false, error: 'Respuesta inválida del servidor.' }
      }

      localStorage.setItem(TOKEN_KEY, tokenString)
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${tokenString}`

      const resUsuarios = await axiosClient.get('/api/usuarios/todos')
      const usuarioLogueado = resUsuarios.data.find((u) => u.correo === correo)

      if (usuarioLogueado) {
        setUser(usuarioLogueado)
        return { ok: true }
      } else {
        return { ok: false, error: 'Token generado, pero usuario no encontrado en el directorio.' }
      }
    } catch (error) {
      console.error('Error de autenticación:', error)
      const mensaje = error.response?.data?.message || 'Credenciales incorrectas o servidor caído.'
      return { ok: false, error: mensaje }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  // Actualiza los datos del usuario en sesión y los guarda automáticamente en localStorage
  const updateUser = useCallback((datosNuevos) => {
    setUser((prev) => (prev ? { ...prev, ...datosNuevos } : prev))
  }, [])

  const role = user?.rol ?? null
  const can = useCallback((permission) => {
    return !!role && PERMISSIONS[role]?.includes(permission)
  }, [role])

  const filterOficios = useCallback((lista = []) => {
    if (!user) return []
    const rolActual = String(user.rol || role || '').toUpperCase()
    const miId = user.idUsuario || user.id

    if (rolActual === 'ADMIN' || rolActual === 'INTERMEDIARIO') {
      return lista
    }

    if (rolActual === 'TECNICO') {
      return lista.filter((o) => {
        const idTec = o.tecnico?.idUsuario || o.tecnicoAsignado?.idUsuario
        return idTec && String(idTec) === String(miId)
      })
    }

    if (rolActual === 'SOLICITANTE') {
      return lista.filter((o) => {
        const idSol = o.solicitante?.idUsuario || o.solicitanteId
        return idSol && String(idSol) === String(miId)
      })
    }

    return []
  }, [user, role])

  const filterUsuarios = useCallback((lista) => {
    if (!user) return []
    return lista
  }, [user])

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated: !!user,
      login,
      logout,
      updateUser,
      can,
      filterOficios,
      filterUsuarios,
    }),
    [user, role, login, logout, updateUser, can, filterOficios, filterUsuarios]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}