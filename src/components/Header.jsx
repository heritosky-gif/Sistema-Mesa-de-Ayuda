import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, ChevronDown, CircleUser, LogOut, Menu, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import { useInstitucion } from '../context/institucionContext'
import useNotificaciones from '../hooks/useNotificaciones'
import { ROLES, ROLE_LABELS } from '../data/mockData'
import Avatar from './Avatar'

export default function Header({ onMenuClick }) {
  const { user, dependencia, role, switchRole, logout } = useAuth()
  const oficiosCtx = useOficios()
  const { noLeidas } = useNotificaciones()
  const institucion = useInstitucion()
  const hayCambios = oficiosCtx.hayCambios || institucion.hayCambios
  const restablecerDemo = () => {
    oficiosCtx.restablecerDemo()
    institucion.restablecer()
  }
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Cerrar el menú al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const marca = dependencia?.id === 'dep-01' ? 'BCSnosUNE' : dependencia?.siglas

  return (
    <header className="sticky top-0 z-20 flex h-20 print:hidden items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-7">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-5 sm:gap-7">
        <Link
          to="/notificaciones"
          className="relative rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        >
          <Bell size={20} strokeWidth={1.6} />
          {noLeidas > 0 && <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-white" />}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-1 text-left hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Avatar name={user?.puesto} src={user?.foto} />
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user?.puesto} - {marca}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{dependencia?.nombreCorto}</p>
            </div>
            <ChevronDown
              size={16}
              className={`ml-2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="card absolute right-0 top-full mt-2 w-72 overflow-hidden py-1 shadow-lg"
            >
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.nombre}</p>
                <p className="truncate text-xs text-slate-500">{user?.correo}</p>
              </div>

              <div className="py-1">
                <MenuLink to="/configuracion" icon={CircleUser} onClick={() => setOpen(false)}>
                  Mi perfil y contraseña
                </MenuLink>
              </div>

              {/* Selector de rol — solo para pruebas del maquetado */}
              <div className="border-t border-line py-1">
                <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Rol de demostración
                </p>
                {Object.values(ROLES).map((r) => (
                  <button
                    key={r}
                    role="menuitemradio"
                    aria-checked={role === r}
                    onClick={() => {
                      switchRole(r)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      role === r ? 'font-medium text-primary' : 'text-slate-600'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                    {role === r && <Check size={15} />}
                  </button>
                ))}
                {hayCambios && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      restablecerDemo()
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={15} strokeWidth={1.75} />
                    Restablecer datos de demo
                  </button>
                )}
              </div>

              <div className="border-t border-line py-1">
                <button
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuLink({ to, icon: Icon, onClick, children }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    >
      <Icon size={16} strokeWidth={1.75} />
      {children}
    </Link>
  )
}
