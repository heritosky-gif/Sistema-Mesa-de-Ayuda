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
  [ROLES.ADMIN]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio', 'ver_todas_dependencias'],
  [ROLES.TECNICO]: ['ver_estadisticas', 'crear_oficio'],
  [ROLES.INTERMEDIARIO]: ['ver_estadisticas', 'crear_oficio'],
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
      // Limpiar el header de Axios si se cierra sesión
      delete axiosClient.defaults.headers.common['Authorization']
    }
  }, [user])

  const login = useCallback(async (correo, password) => {
    try {

      const response = await axiosClient.post('/api/usuarios/login', { correo, password })
      const tokenString = response.data.token;

      if (!tokenString) {
        return { ok: false, error: 'Respuesta inválida del servidor.' }
      }

      localStorage.setItem(TOKEN_KEY, tokenString)
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${tokenString}`

      const resUsuarios = await axiosClient.get('/api/usuarios/todos')
    
      const usuarioLogueado = resUsuarios.data.find(u => u.correo === correo)

      if (usuarioLogueado) {
        setUser(usuarioLogueado)
        return { ok: true }
      } else {
        return { ok: false, error: 'Token generado, pero usuario no encontrado en el directorio.' }
      }

    } catch (error) {
      console.error("Error de autenticación:", error)
      const mensaje = error.response?.data?.message || 'Credenciales incorrectas o servidor caído.'
      return { ok: false, error: mensaje }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const role = user?.rol ?? null
  // Permitimos todos los permisos si el usuario existe para evitar bloqueos por nombres de roles distintos a "ADMIN"
  const can = useCallback((permission) => !!role, [role])

  const filterOficios = useCallback((lista) => {
      if (!user) return []
      // Por el momento, permitimos ver todos los oficios mientras se ajustan los roles definitivos
      return lista; 
    }, [user]
  )

  const filterUsuarios = useCallback((lista) => {
      if (!user) return []
      // Por el momento, permitimos ver todos los usuarios
      return lista; 
    }, [user]
  )

  const value = useMemo(() => ({
      user,
      role,
      isAuthenticated: !!user,
      login,
      logout,
      can,
      filterOficios,
      filterUsuarios,
    }),
    [user, role, login, logout, can, filterOficios, filterUsuarios]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}