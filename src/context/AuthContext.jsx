import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEMO_USERS_BY_ROLE, ROLES } from '../data/mockData'
import { useInstitucion } from './institucionContext'
import { clave } from '../utils/texto'

const AuthContext = createContext(null)
const STORAGE_KEY = 'helpdesk.session'

// ─── Permisos por rol ─────────────────────────────────────────
// Para agregar un permiso nuevo, añádelo aquí y consúltalo con can('permiso').
const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio', 'ver_todas_dependencias'],
  [ROLES.ADMIN_DEPENDENCIA]: ['ver_estadisticas', 'gestionar_usuarios', 'crear_oficio'],
  [ROLES.USUARIO_COMUN]: ['crear_oficio'],
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw).userId ?? null : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const { usuarios, getUsuario, getDependencia } = useInstitucion()
  // Solo se guarda el id: los datos del usuario se leen en vivo del catálogo institucional
  const [userId, setUserId] = useState(loadSession)
  const user = userId ? getUsuario(userId) ?? null : null

  useEffect(() => {
    try {
      if (userId) localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId }))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }, [userId])

  // Login simulado: acepta cualquier contraseña si el correo existe y la cuenta está activa.
  // Si el correo no existe, entra como el usuario demo del rol indicado.
  const login = useCallback(
    (correo, _password, fallbackRole = ROLES.SUPER_ADMIN) => {
      const found = correo?.trim() ? usuarios.find((u) => clave(u.correo) === clave(correo)) : null
      if (found && !found.activo) {
        return { ok: false, error: 'Esta cuenta está dada de baja. Contacte al administrador.' }
      }
      setUserId(found?.id ?? DEMO_USERS_BY_ROLE[fallbackRole])
      return { ok: true }
    },
    [usuarios]
  )

  const logout = useCallback(() => setUserId(null), [])

  // Selector del Header: cambia al usuario demo del rol elegido
  const switchRole = useCallback((role) => {
    if (DEMO_USERS_BY_ROLE[role]) setUserId(DEMO_USERS_BY_ROLE[role])
  }, [])

  const role = user?.rol ?? null

  const can = useCallback((permission) => !!role && PERMISSIONS[role].includes(permission), [role])

  // ─── Filtros de visibilidad de datos ────────────────────────
  const filterOficios = useCallback(
    (lista) => {
      if (!user) return []
      switch (user.rol) {
        case ROLES.SUPER_ADMIN:
          return lista
        case ROLES.ADMIN_DEPENDENCIA:
          // Los de su dependencia y los que otras dependencias le dirigen
          return lista.filter(
            (o) => o.dependenciaId === user.dependenciaId || o.dependenciaDestinoId === user.dependenciaId
          )
        case ROLES.USUARIO_COMUN:
          return lista.filter((o) => o.creadoPorId === user.id || o.asignadoAId === user.id)
        default:
          return []
      }
    },
    [user]
  )

  const filterUsuarios = useCallback(
    (lista) => {
      if (!user) return []
      switch (user.rol) {
        case ROLES.SUPER_ADMIN:
          return lista
        case ROLES.ADMIN_DEPENDENCIA:
          return lista.filter((u) => u.dependenciaId === user.dependenciaId)
        default:
          return lista.filter((u) => u.id === user.id)
      }
    },
    [user]
  )

  const value = useMemo(
    () => ({
      user,
      role,
      dependencia: user ? getDependencia(user.dependenciaId) : null,
      isAuthenticated: !!user,
      login,
      logout,
      switchRole,
      can,
      filterOficios,
      filterUsuarios,
    }),
    [user, role, getDependencia, login, logout, switchRole, can, filterOficios, filterUsuarios]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
