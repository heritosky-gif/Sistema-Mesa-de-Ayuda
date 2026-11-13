import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import UsuarioForm from '../components/UsuarioForm'
import RutaConfiguracion from '../components/RutaConfiguracion'

export default function CrearUsuario() {
  const { user } = useAuth()
  const { crearUsuario } = useInstitucion()
  const navigate = useNavigate()

  const guardar = (datos) => {
    const r = crearUsuario(datos, user.id)
    if (r.ok) navigate('/usuarios', { state: { aviso: `Se registró la cuenta de ${datos.nombre}.` } })
    return r
  }

  return (
    <div className="mx-auto max-w-[800px] pt-4">
      <RutaConfiguracion pasos={[{ label: 'Configuración', to: '/usuarios' }, { label: 'Crear Nuevo Usuario' }]} />
      <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Registrar Nuevo Usuario Institucional
      </h1>
      <p className="mb-7 mt-3 text-[15px] leading-relaxed text-slate-500">
        Ingrese los datos del servidor público, asigne la dependencia, área operativa y seleccione el nivel de rol para
        configurar sus accesos.
      </p>
      <UsuarioForm modo="crear" onGuardar={guardar} onCancelar={() => navigate('/usuarios')} />
    </div>
  )
}
