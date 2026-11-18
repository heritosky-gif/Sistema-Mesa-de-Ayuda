import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldLock, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'
import UsuarioForm from '../components/UsuarioForm'
import RutaConfiguracion from '../components/RutaConfiguracion'
import Modal from '../components/Modal'

export default function EditarUsuario() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    axiosClient.get(`/api/usuarios/${id}`)
      .then(res => {
        setUsuario(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error al cargar expediente:", err)
        setLoading(false)
      })
  }, [id])

  if (loading) return <p className="mt-10 text-center text-sm text-slate-500">Cargando expediente...</p>

  if (!usuario) {
    return <Aviso icon={UserRound} titulo="Usuario no encontrado" texto={`No existe ninguna cuenta con el identificador "${id}".`} />
  }

  //Solo el ADMIN o el mismo usuario pueden editar esta pantalla
  const rolUsuarioActual = String(user.rol || '').toUpperCase()
  const esAdmin = rolUsuarioActual === 'ADMIN'
  const esYo = (usuario.idUsuario || usuario.id) == (user.idUsuario || user.id)

  if (!esAdmin && !esYo) {
    return <Aviso icon={ShieldLock} titulo="Acceso denegado" texto="Solo los administradores pueden editar otras cuentas." />
  }

  const guardar = async (datos) => {
    try {
      const paqueteLimpio = {
        nombreCompleto: datos.nombreCompleto || datos.nombre, // Cubrimos ambas variables por si acaso
        correo: datos.correo,
        rol: datos.rol
      };

      await axiosClient.put(`/api/usuarios/${id}`, paqueteLimpio)
      
      navigate('/usuarios', { state: { aviso: `Se actualizó el expediente de ${paqueteLimpio.nombreCompleto}.` } })
      return { ok: true }
    } catch (error) {
      console.error(error)
      return { ok: false, error: 'Error al actualizar en la base de datos.' }
    }
  }

  //Cambiar estado / Baja lógica
  const cambiarCuenta = async () => {
    try {
      await axiosClient.put(`/api/usuarios/${id}/estatus`, { activo: !usuario.activo })
      setConfirmar(false)
      navigate('/usuarios', { state: { aviso: `La cuenta ha sido ${usuario.activo ? 'dada de baja' : 'reactivada'}.` } })
    } catch (error) {
      console.error(error)
    }
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
        Modifique la información del servidor público, reasigne su área o actualice sus permisos de acceso.
      </p>

      <UsuarioForm
        key={usuario.idUsuario || usuario.id}
        modo="editar"
        inicial={usuario}
        onGuardar={guardar}
        onCancelar={() => navigate('/usuarios')}
        accionesCuenta={accionesCuenta}
      />

      <Modal open={confirmar} onClose={() => setConfirmar(false)} size="sm" title={usuario.activo ? '¿Dar de baja esta cuenta?' : '¿Reactivar esta cuenta?'} footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="btn-primary" onClick={cambiarCuenta}>{usuario.activo ? 'Sí, dar de baja' : 'Sí, reactivar'}</button>
          </>
        }>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{usuario.nombreCompleto || usuario.nombre}</span>{' '}
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon size={22} /></div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">{texto}</p>
      <Link to="/usuarios" className="btn-primary mt-6">Volver a Usuarios</Link>
    </div>
  )
}