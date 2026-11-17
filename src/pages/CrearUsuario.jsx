import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstitucion } from '../context/institucionContext'
import { CircleExclamationPoint } from 'lucide-react'
import UsuarioForm from '../components/UsuarioForm'
import RutaConfiguracion from '../components/RutaConfiguracion'

export default function CrearUsuario() {
  const { crearUsuario } = useInstitucion()
  const navigate = useNavigate()
  const [errorServer, setErrorServer] = useState(null)

  const guardar = async (datos) => {
    setErrorServer(null)

    const payloadSpring = {
      nombreCompleto: datos.nombre,
      correo: datos.correo,
      password: datos.password || 'MesaAyuda2026*', 
      rol: datos.rol,
      puesto: datos.puesto,
      nivel: datos.nivel,
      activo: true,
      area: { idArea: parseInt(datos.area || datos.areaId || 1) } 
    }

    const r = await crearUsuario(payloadSpring)
    
    if (r.ok) {
      navigate('/usuarios', { state: { aviso: `Se registró la cuenta de ${payloadSpring.nombreCompleto} exitosamente.` } })
    } else {
      setErrorServer(r.error)
    }
    
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

      {errorServer && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <CircleExclamationPoint size={18} /> {errorServer}
        </div>
      )}

      <UsuarioForm modo="crear" onGuardar={guardar} onCancelar={() => navigate('/usuarios')} />
    </div>
  )
}