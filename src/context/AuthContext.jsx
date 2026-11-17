import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axiosClient from '../api/axiosClient' // <-- Tu cliente real conectado a Spring Boot

const AuthContext = createContext(null)
const STORAGE_KEY = 'helpdesk.user'
const TOKEN_KEY = 'jwt_token'

// Ajusta estos roles para que coincidan EXACTAMENTE con los que devuelve tu Spring Boot
const ROLES = {
  SUPER_ADMIN: 'ADMIN',
  ADMIN_DEPENDENCIA: 'ADMIN_DEP', 
  USUARIO_COMUN: 'USUARIO'
}

// ─── Permisos por rol ─────────────────────────────────────────
const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio', 'ver_todas_dependencias'],
  [ROLES.ADMIN_DEPENDENCIA]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio'],
  [ROLES.USUARIO_COMUN]: ['crear_oficio'],
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
  // Ahora guardamos el objeto completo del usuario real que nos manda el backend
  const [user, setUser] = useState(loadSession)

  // Persistencia: si el usuario cambia, lo guardamos o borramos de localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [user])

  // ─── LOGIN REAL CON SPRING BOOT ─────────────────────────────
  const login = useCallback(async (correo, password) => {
    try {
      // Le pegamos al endpoint real de tu backend
      const response = await axiosClient.post('/auth/login', { correo, password })
      
      // Asumimos que tu backend devuelve { token: "ey...", usuario: { id, nombre, rol... } }
      const { token, usuario } = response.data 

      if (token) {
        localStorage.setItem(TOKEN_KEY, token) // Guardamos el JWT
        setUser(usuario) // Guardamos los datos del usuario real
        return { ok: true }
      } else {
        return { ok: false, error: 'Respuesta inválida del servidor.' }
      }
    } catch (error) {
      // Si Spring Boot rechaza las credenciales (HTTP 401/403/400)
      console.error("Error de autenticación:", error)
      const mensaje = error.response?.data?.message || 'Credenciales incorrectas o servidor caído.'
      return { ok: false, error: mensaje }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const role = user?.rol ?? null
  const can = useCallback((permission) => !!role && PERMISSIONS[role]?.includes(permission), [role])

  // ─── Filtros de visibilidad (Adaptados al usuario real) ─────
  const filterOficios = useCallback((lista) => {
      if (!user) return []
      switch (user.rol) {
        case ROLES.SUPER_ADMIN:
          return lista
        case ROLES.ADMIN_DEPENDENCIA:
          return lista.filter(o => o.dependenciaId === user.dependenciaId || o.dependenciaDestinoId === user.dependenciaId)
        case ROLES.USUARIO_COMUN:
          return lista.filter(o => o.creadoPorId === user.id || o.asignadoAId === user.id)
        default:
          return []
      }
    }, [user]
  )

  const filterUsuarios = useCallback((lista) => {
      if (!user) return []
      switch (user.rol) {
        case ROLES.SUPER_ADMIN:
          return lista
        case ROLES.ADMIN_DEPENDENCIA:
          return lista.filter((u) => u.dependenciaId === user.dependenciaId)
        default:
          return lista.filter((u) => u.id === user.id)
      }
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