import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ChevronDown, CircleCheck, CircleExclamationPoint, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import Avatar from '../components/Avatar'
import RutaConfiguracion from '../components/RutaConfiguracion'
import { tituloNivelAcceso } from '../utils/nivelAcceso'
import { REGLA_PASSWORD, validarPassword } from '../utils/password'
import { reducirImagen } from '../utils/imagen'

const MAX_FOTO = 5 * 1024 * 1024

/**
 * Autoservicio del usuario en sesión: nombre, fotografía y contraseña.
 * Es independiente de la gestión de usuarios (/usuarios): aquí no se puede cambiar
 * el rol, la dependencia, el área ni el correo.
 */
export default function Configuracion() {
  const { user } = useAuth()
  // `key`: al cambiar de usuario (selector de rol) el formulario se reinicia con sus datos
  return <PerfilForm key={user.id} />
}

function PerfilForm() {
  const { user, dependencia } = useAuth()
  const { actualizarPerfil } = useInstitucion()

  const inicial = () => ({ nombre: user.nombre, foto: user.foto ?? null, actual: '', nueva: '', confirmacion: '' })
  const [form, setForm] = useState(inicial)
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorFoto, setErrorFoto] = useState(null)
  const [aviso, setAviso] = useState(null)
  const fileInput = useRef(null)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const cambiaPassword = !!(form.actual || form.nueva || form.confirmacion)
  const hayCambios = form.nombre.trim() !== user.nombre || form.foto !== (user.foto ?? null) || cambiaPassword

  const errores = {}
  if (intentado) {
    if (form.nombre.trim().length < 3) errores.nombre = 'Escriba su nombre completo.'
    if (cambiaPassword) {
      if (!form.actual) errores.actual = 'Escriba su contraseña actual.'
      if (!validarPassword(form.nueva)) errores.nueva = REGLA_PASSWORD
      else if (form.nueva === form.actual) errores.nueva = 'La nueva contraseña debe ser distinta a la actual.'
      if (!errores.nueva && form.confirmacion !== form.nueva) errores.confirmacion = 'Las contraseñas no coinciden.'
    }
  }

  const elegirFoto = async (archivo) => {
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) return setErrorFoto('Seleccione una imagen (JPG o PNG).')
    if (archivo.size > MAX_FOTO) return setErrorFoto('La imagen supera los 5 MB.')
    try {
      set('foto')(await reducirImagen(archivo))
      setErrorFoto(null)
    } catch (e) {
      setErrorFoto(e.message)
    }
  }

  const cancelar = () => {
    setForm(inicial())
    setIntentado(false)
    setErrorFoto(null)
  }

  const guardar = (e) => {
    e.preventDefault()
    setIntentado(true)
    // Se recalculan los errores con el estado actual (no con los de la última renderización)
    const invalido =
      form.nombre.trim().length < 3 ||
      (cambiaPassword &&
        (!form.actual || !validarPassword(form.nueva) || form.nueva === form.actual || form.confirmacion !== form.nueva))
    if (invalido) return

    setGuardando(true)
    // Simula la latencia del servidor
    setTimeout(() => {
      const r = actualizarPerfil(user.id, { nombre: form.nombre, foto: form.foto, nuevaPassword: cambiaPassword })
      setGuardando(false)
      if (!r.ok) return setAviso({ error: true, texto: r.error })
      setForm((f) => ({ ...f, nombre: f.nombre.trim(), actual: '', nueva: '', confirmacion: '' }))
      setIntentado(false)
      setAviso({ texto: cambiaPassword ? 'Perfil y contraseña actualizados correctamente.' : 'Su perfil se actualizó correctamente.' })
    }, 700)
  }

  return (
    <div className="mx-auto max-w-[800px] pt-4">
      <RutaConfiguracion pasos={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Mi Perfil' }]} />
      <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Configuración de Mi Perfil
      </h1>
      <p className="mb-7 mt-3 text-[15px] text-slate-500">
        Gestione sus datos personales de contacto y actualice su contraseña de acceso institucional.
      </p>

      <form noValidate onSubmit={guardar} className="card">
        <div className="divide-y divide-line px-6 sm:px-8">
          {/* ── Información personal ── */}
          <section className="py-8">
            <h2 className="text-base font-semibold text-slate-900">Información Personal y Fotografía</h2>

            <div className="mt-8 flex items-end">
              <Avatar name={form.nombre || user.nombre} src={form.foto} size="xl" />
              {/* El botón se encima sobre la esquina inferior derecha del avatar */}
              <div className="-ml-7 flex flex-wrap items-center gap-3 pb-0.5">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-primary-soft"
                >
                  <Camera size={14} /> Cambiar Fotografía
                </button>
                {form.foto && (
                  <button type="button" onClick={() => set('foto')(null)} className="text-xs text-slate-500 hover:text-rose-600">
                    Quitar fotografía
                  </button>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  elegirFoto(e.target.files[0])
                  e.target.value = ''
                }}
              />
            </div>
            {errorFoto && <Error texto={errorFoto} />}

            <div className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2">
              <Campo id="perfil-nombre" etiqueta="Nombre Completo" error={errores.nombre}>
                <input
                  id="perfil-nombre"
                  value={form.nombre}
                  onChange={(e) => set('nombre')(e.target.value)}
                  className={control(errores.nombre)}
                />
              </Campo>
              <Campo id="perfil-correo" etiqueta="Correo Institucional">
                <Bloqueado id="perfil-correo" valor={user.correo} />
              </Campo>
            </div>
          </section>

          {/* ── Adscripción (lectura) ── */}
          <section className="py-8">
            <h2 className="text-base font-semibold text-slate-900">Adscripción Institucional (Información de Lectura)</h2>
            <p className="mt-2 text-sm text-slate-500">
              Esta información es administrada por la Dirección de Recursos Humanos y el Administrador del Sistema.
            </p>
            <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
              <Campo id="perfil-dependencia" etiqueta="Dependencia / Sector">
                <Bloqueado id="perfil-dependencia" valor={dependencia?.nombre} desplegable />
              </Campo>
              <Campo id="perfil-area" etiqueta="Área / Departamento">
                <Bloqueado id="perfil-area" valor={user.area} desplegable />
              </Campo>
              <div className="md:col-span-2">
                <Campo id="perfil-rol" etiqueta="Rol de Acceso Asignado">
                  <div
                    id="perfil-rol"
                    aria-readonly="true"
                    className="flex h-12 items-center gap-3 rounded-lg border border-line bg-slate-100/70 px-3.5"
                  >
                    <Lock size={15} className="shrink-0 text-slate-500" aria-label="Campo bloqueado" />
                    <span className="min-w-[240px] rounded-md bg-slate-200/70 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                      {tituloNivelAcceso(user)}
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{user.nivel}</span>
                  </div>
                </Campo>
              </div>
            </div>
          </section>

          {/* ── Contraseña ── */}
          <section className="py-8">
            <h2 className="text-base font-semibold text-slate-900">Cambiar Contraseña de Acceso</h2>
            <p className="mt-2 text-xs text-slate-500">Déjelo en blanco si no desea cambiarla. {REGLA_PASSWORD}</p>
            <div className="mt-6 space-y-5">
              <Campo id="perfil-actual" etiqueta="Contraseña Actual" error={errores.actual}>
                <InputPassword id="perfil-actual" value={form.actual} onChange={set('actual')} error={errores.actual} autoComplete="current-password" />
              </Campo>
              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <Campo id="perfil-nueva" etiqueta="Nueva Contraseña" error={errores.nueva}>
                  <InputPassword id="perfil-nueva" value={form.nueva} onChange={set('nueva')} error={errores.nueva} />
                </Campo>
                <Campo id="perfil-confirmacion" etiqueta="Confirmar Nueva Contraseña" error={errores.confirmacion}>
                  <InputPassword id="perfil-confirmacion" value={form.confirmacion} onChange={set('confirmacion')} error={errores.confirmacion} />
                </Campo>
              </div>
            </div>
          </section>
        </div>

        {/* ── Pie ── */}
        <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-6 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={cancelar} disabled={!hayCambios || guardando} className="btn-secondary h-11 px-5 font-semibold text-slate-900">
            Cancelar
          </button>
          <button type="submit" disabled={!hayCambios || guardando} className="btn-primary h-11 px-6 font-semibold">
            {guardando ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
            {guardando ? 'Guardando…' : 'Actualizar Mi Perfil'}
          </button>
        </div>
      </form>

      {aviso && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            aviso.error ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {aviso.error ? <CircleExclamationPoint size={16} /> : <CircleCheck size={16} className="text-emerald-400" />}
          {aviso.texto}
        </div>
      )}
    </div>
  )
}

const control = (error) =>
  `w-full h-12 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    error ? 'border-rose-400 focus:ring-rose-200' : 'border-line focus:border-primary focus:ring-primary/20'
  }`

function Campo({ id, etiqueta, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {etiqueta}
      </label>
      {children}
      {error && <Error texto={error} />}
    </div>
  )
}

function Error({ texto }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600">
      <CircleExclamationPoint size={13} /> {texto}
    </p>
  )
}

/** Campo de solo lectura con candado (y flecha si representa un selector) */
function Bloqueado({ id, valor, desplegable = false }) {
  return (
    <div
      id={id}
      aria-readonly="true"
      className="flex h-12 items-center gap-2.5 rounded-lg border border-line bg-slate-100/70 px-3.5 text-sm text-slate-600"
    >
      <Lock size={15} className="shrink-0 text-slate-500" aria-label="Campo bloqueado" />
      <span className="flex-1 truncate">{valor || '—'}</span>
      {desplegable && <ChevronDown size={16} className="shrink-0 text-slate-500" />}
    </div>
  )
}

function InputPassword({ id, value, onChange, error, autoComplete = 'new-password' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${control(error)} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}
