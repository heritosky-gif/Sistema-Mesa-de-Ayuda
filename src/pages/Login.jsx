import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLES, ROLE_LABELS } from '../data/mockData'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(ROLES.SUPER_ADMIN)
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const resultado = login(correo, password, role)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }
    navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-12">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            MA
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Mesa de Ayuda</h1>
          <p className="mt-1 text-sm text-slate-500">Sistema de gestión de oficios</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo institucional</label>
            <input
              className="input"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@bcs.gob.mx"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Entrar como (demo)</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full py-2.5">
            <LogIn size={16} /> Iniciar sesión
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Si el correo no existe, se entra con el usuario demo del rol seleccionado.
        </p>
      </div>
    </div>
  )
}
