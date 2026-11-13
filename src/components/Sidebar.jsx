import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Bell,
  ChartNoAxesCombined,
  FilePlus,
  Inbox,
  LayoutGrid,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESTADOS_OFICIO } from '../data/mockData'
import { useOficios } from '../context/oficiosContext'
import Avatar from './Avatar'
import BrandLogo from './BrandLogo'

// `permission`: si se define, la opción solo se muestra a roles que lo tengan
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Inicio / Dashboard', icon: LayoutGrid },
  { to: '/oficios', label: 'Buzón de Oficios', icon: Inbox, end: true, badge: 'oficiosActivos' },
  { to: '/oficios/nuevo', label: 'Crear Oficio / Solicitud', icon: FilePlus, permission: 'crear_oficio' },
  { to: '/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined, permission: 'ver_estadisticas' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'gestionar_usuarios' },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { user, dependencia, can, logout, filterOficios } = useAuth()
  const items = NAV_ITEMS.filter((i) => !i.permission || can(i.permission))

  const { oficios } = useOficios()

  // Oficios activos (no resueltos) visibles para el rol
  const badges = useMemo(
    () => ({
      oficiosActivos: filterOficios(oficios).filter((o) => o.estado !== ESTADOS_OFICIO.RESUELTA).length,
    }),
    [filterOficios, oficios]
  )

  return (
    <>
      {/* Fondo oscuro en móvil */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-line bg-surface transition-transform lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative px-4 pb-6 pt-8">
          <BrandLogo />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pt-4">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Gestión institucional
          </p>
          <ul className="space-y-2">
            {items.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-soft font-semibold text-primary'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                      )}
                      <Icon size={20} strokeWidth={1.6} />
                      <span className="flex-1">{label}</span>
                      {badge && badges[badge] > 0 && (
                        <span className="min-w-[22px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight text-white">
                          {badges[badge]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tarjeta de usuario */}
        <div className="border-t border-line px-4 pb-6 pt-5">
          <NavLink to="/configuracion" onClick={onClose} className="flex items-center gap-3 rounded-lg hover:opacity-80">
            <Avatar name={user?.puesto} src={user?.foto} size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.puesto}</p>
              <p className="truncate text-[11px] text-slate-500">{dependencia?.nombreCorto}</p>
            </div>
          </NavLink>
          <button
            onClick={logout}
            className="mt-4 flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:text-primary"
          >
            <LogOut size={18} strokeWidth={1.6} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
