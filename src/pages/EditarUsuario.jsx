import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldLock, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import UsuarioForm from '../components/UsuarioForm'
import RutaConfiguracion from '../components/RutaConfiguracion'
import Modal from '../components/Modal'
import { puedeGestionar } from '../utils/permisosUsuarios'

export default function EditarUsuario() {
  const { id } = useParams()
  const { user } = useAuth()
  const { getUsuario, editarUsuario, cambiarEstatus } = useInstitucion()
  const navigate = useNavigate()
  const [confirmar, setConfirmar] = useState(false)
  const usuario = getUsuario(id)

  if (!usuario) {
    return <Aviso icon={UserRound} titulo="Usuario no encontrado" texto={`No existe ninguna cuenta con el identificador "${id}".`} />
  }
  if (!puedeGestionar(user, usuario)) {
    return <Aviso icon={ShieldLock} titulo="Sin permiso para editar esta cuenta" texto="Solo puede editar cuentas de su propia dependencia." />
  }

  const esYo = usuario.id === user.id

  const guardar = (datos) => {
    const r = editarUsuario(usuario.id, datos, user.id)
    if (r.ok) navigate('/usuarios', { state: { aviso: `Se actualizó el expediente de ${datos.nombre}.` } })
    return r
  }

  // La baja / reactivación se aplica al confirmar, sin esperar a "Guardar Cambios"
  const cambiarCuenta = () => {
    cambiarEstatus(usuario.id, !usuario.activo, user.id)
    setConfirmar(false)
  }

  const accionesCuenta = (
    <div>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        disabled={esYo}
        className={`h-[46px] w-full rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          usuario.activo
            ? 'border-primary/20 bg-primary-soft text-primary hover:border-primary/40'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
        }`}
      >
        {usuario.activo ? 'Desactivar / Dar de baja esta cuenta' : 'Reactivar esta cuenta'}
      </button>
      {esYo && <p className="mt-2 text-xs text-slate-500">No puede dar de baja su propia cuenta.</p>}
    </div>
  )

  return (
    <div className="mx-auto max-w-[800px] pt-4">
      <RutaConfiguracion
        pasos={[
          { label: 'Configuración', to: '/usuarios' },
          { label: 'Gestión de Usuarios', to: '/usuarios' },
          { label: 'Editar Usuario' },
        ]}
      />
      <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Editar Expediente de Usuario
      </h1>
      <p className="mb-7 mt-3 text-[15px] leading-relaxed text-slate-500">
        Modifique la información del servidor público, reasigne su dependencia o actualice sus permisos de acceso al
        sistema.
      </p>

      {/* `key` reinicia el formulario si se navega a otro usuario */}
      <UsuarioForm
        key={usuario.id}
        modo="editar"
        inicial={usuario}
        onGuardar={guardar}
        onCancelar={() => navigate('/usuarios')}
        accionesCuenta={accionesCuenta}
      />

      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        size="sm"
        title={usuario.activo ? '¿Dar de baja esta cuenta?' : '¿Reactivar esta cuenta?'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={cambiarCuenta}>
              {usuario.activo ? 'Sí, dar de baja' : 'Sí, reactivar'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{usuario.nombre}</span>{' '}
          {usuario.activo
            ? 'ya no podrá iniciar sesión. Sus oficios e historial se conservan.'
            : 'podrá volver a iniciar sesión con su nivel de acceso actual.'}
        </p>
      </Modal>
    </div>
  )
}

function Aviso({ icon: Icon, titulo, texto }) {
  return (
    <div className="card mx-auto mt-10 flex max-w-lg flex-col items-center px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon size={22} />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">{texto}</p>
      <Link to="/usuarios" className="btn-primary mt-6">
        Volver a Usuarios
      </Link>
    </div>
  )
}
