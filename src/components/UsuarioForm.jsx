import { useState } from 'react'
import { Check, ChevronDown, CircleExclamationPoint, Eye, EyeOff, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import { ROLES } from '../data/mockData'
import { puedeAdministrarCatalogo, rolesAsignables } from '../utils/permisosUsuarios'
import { NIVELES_ACCESO, grupoDe } from '../utils/nivelAcceso'
import { validarPassword } from '../utils/password'
import Avatar from './Avatar'

const NUEVA = '__nueva__'

function validar(f, { validarCorreo, exceptoId, crear }) {
  const e = {}
  if (f.nombre.trim().length < 3) e.nombre = 'Escriba el nombre completo.'
  const errorCorreo = validarCorreo(f.correo, exceptoId)
  if (errorCorreo) e.correo = errorCorreo
  if (!f.puesto.trim()) e.puesto = 'Escriba el cargo u oficio.'
  if (crear || f.password || f.confirmacion) {
    if (!validarPassword(f.password)) e.password = 'Mínimo 8 caracteres, con al menos una letra y un número.'
    else if (f.password !== f.confirmacion) e.confirmacion = 'Las contraseñas no coinciden.'
  }
  if (!f.dependenciaId) e.dependenciaId = 'Seleccione la dependencia.'
  if (!f.area) e.area = 'Seleccione el área o departamento.'
  return e
}

/**
 * Formulario de alta / edición de usuarios, según los diseños de Figma.
 * modo: 'crear' | 'editar'. onGuardar(datos) devuelve { ok, error? }.
 * En edición, `accionesCuenta` se muestra antes del pie (botón de baja / reactivación).
 */
export default function UsuarioForm({ modo, inicial, onGuardar, onCancelar, accionesCuenta }) {
  const crear = modo === 'crear'
  const { user: actor } = useAuth()
  const { dependencias, areasDe, crearArea, crearDependencia, validarCorreo } = useInstitucion()

  const esSuper = actor.rol === ROLES.SUPER_ADMIN
  const esMismaCuenta = inicial?.id === actor.id
  const rolesPermitidos = rolesAsignables(actor)
  const catalogo = puedeAdministrarCatalogo(actor)
  // La tarjeta de Administrador Estatal solo la ve quien puede asignarla (o si la cuenta ya lo es)
  const tarjetas = NIVELES_ACCESO.filter((g) => g.rol !== ROLES.SUPER_ADMIN || esSuper || inicial?.rol === ROLES.SUPER_ADMIN)

  const [form, setForm] = useState(() => ({
    nombre: inicial?.nombre ?? '',
    correo: inicial?.correo ?? '',
    puesto: inicial?.puesto ?? '',
    password: '',
    confirmacion: '',
    requiereCambioPassword: false,
    dependenciaId: inicial?.dependenciaId ?? (esSuper ? '' : actor.dependenciaId),
    area: inicial?.area ?? '',
    grupo: grupoDe(inicial),
    nivel: inicial?.nivel ?? NIVELES_ACCESO[0].niveles[0],
  }))
  const [intentado, setIntentado] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState(null)
  const [nuevaArea, setNuevaArea] = useState(null)
  const [nuevaDep, setNuevaDep] = useState(null)
  const [errorCatalogo, setErrorCatalogo] = useState(null)

  const opciones = { validarCorreo, exceptoId: inicial?.id, crear }
  const errores = intentado ? validar(form, opciones) : {}
  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const areas = form.dependenciaId ? areasDe(form.dependenciaId) : []
  const grupoActual = NIVELES_ACCESO.find((g) => g.id === form.grupo)

  const elegirGrupo = (g) =>
    setForm((f) => ({ ...f, grupo: g.id, nivel: g.niveles.includes(f.nivel) ? f.nivel : g.niveles[0] }))

  const cambiarDependencia = (valor) => {
    if (valor === NUEVA) return setNuevaDep({ nombre: '', siglas: '' })
    setForm((f) => ({ ...f, dependenciaId: valor, area: '' }))
  }
  const cambiarArea = (valor) => (valor === NUEVA ? setNuevaArea('') : set('area')(valor))

  const agregarDependencia = () => {
    const r = crearDependencia({ nombre: nuevaDep.nombre, nombreCorto: nuevaDep.nombre, siglas: nuevaDep.siglas }, actor.id)
    if (!r.ok) return setErrorCatalogo(r.error)
    setErrorCatalogo(null)
    setNuevaDep(null)
    setForm((f) => ({ ...f, dependenciaId: r.id, area: '' }))
    setNuevaArea('') // una dependencia nueva necesita al menos un área
  }
  const agregarArea = () => {
    const r = crearArea(form.dependenciaId, nuevaArea, actor.id)
    if (!r.ok) return setErrorCatalogo(r.error)
    setErrorCatalogo(null)
    setNuevaArea(null)
    set('area')(r.nombre)
  }

  const enviar = (e) => {
    e.preventDefault()
    setIntentado(true)
    const errs = validar(form, opciones)
    const primero = Object.keys(errs)[0]
    if (primero) return document.getElementById(`usr-${primero}`)?.focus()

    // La contraseña no se guarda en el navegador: en producción se enviará a la API para cifrarse
    const datos = {
      nombre: form.nombre.trim(),
      correo: form.correo,
      puesto: form.puesto.trim(),
      dependenciaId: form.dependenciaId,
      area: form.area,
      rol: grupoActual.rol,
      nivel: form.nivel,
    }
    if (form.password) {
      datos.nuevaPassword = true // el Provider registra la fecha del cambio
      datos.requiereCambioPassword = form.requiereCambioPassword
    } else if (!crear && form.requiereCambioPassword) {
      datos.requiereCambioPassword = true
    }
    const r = onGuardar(datos)
    if (r && !r.ok) setErrorGeneral(r.error)
  }

  const camposPassword = (
    <>
      <Campo id="usr-password" etiqueta={crear ? 'Contraseña Temporal' : 'Asignar Nueva Contraseña Temporal'} error={errores.password}>
        <InputPassword
          id="usr-password"
          value={form.password}
          onChange={set('password')}
          error={errores.password}
          placeholder={crear ? 'Mínimo 8 caracteres' : 'Dejar en blanco para conservar la actual'}
        />
      </Campo>
      <Campo id="usr-confirmacion" etiqueta={crear ? 'Confirmar Contraseña' : 'Confirmar Nueva Contraseña'} error={errores.confirmacion}>
        <InputPassword
          id="usr-confirmacion"
          value={form.confirmacion}
          onChange={set('confirmacion')}
          error={errores.confirmacion}
          placeholder="Repita la contraseña"
        />
      </Campo>
    </>
  )

  const checkboxPassword = (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={form.requiereCambioPassword}
        onChange={(e) => set('requiereCambioPassword')(e.target.checked)}
        className="h-5 w-5 cursor-pointer rounded border-line accent-primary"
      />
      {crear
        ? 'Exigir cambio de contraseña en el primer inicio de sesión'
        : 'Forzar al usuario a cambiar contraseña en su próximo inicio de sesión'}
    </label>
  )

  return (
    <form noValidate onSubmit={enviar} className="card">
      <div className="divide-y divide-line px-6 sm:px-8">
        {/* ── Datos generales ── */}
        <section className="py-8">
          <h2 className="text-base font-semibold text-slate-900">
            {crear ? 'Datos Personales e Identificación' : 'Información General y Estado de la Cuenta'}
          </h2>

          {!crear && inicial && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-4">
                <Avatar name={inicial.nombre} src={inicial.foto} size="ml" tone={inicial.activo ? 'primary' : 'neutral'} />
                <div>
                  <p className="text-[15px] font-semibold text-slate-900">{inicial.nombre}</p>
                  <p className="mt-1 text-xs text-slate-500">{inicial.nivel}</p>
                </div>
              </div>
              <EstadoCuenta activo={inicial.activo} />
            </div>
          )}

          <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Campo id="usr-nombre" etiqueta="Nombre Completo" error={errores.nombre}>
              <input
                id="usr-nombre"
                value={form.nombre}
                onChange={(e) => set('nombre')(e.target.value)}
                placeholder="Ej. Lic. Ana Sofía Martínez"
                className={control(errores.nombre)}
              />
            </Campo>
            <Campo id="usr-correo" etiqueta="Correo Institucional" error={errores.correo}>
              <input
                id="usr-correo"
                type="email"
                value={form.correo}
                onChange={(e) => set('correo')(e.target.value)}
                placeholder="ejemplo@bcs.gob.mx"
                className={control(errores.correo)}
              />
            </Campo>
            <Campo id="usr-puesto" etiqueta="Cargo u Oficio" error={errores.puesto}>
              <input
                id="usr-puesto"
                value={form.puesto}
                onChange={(e) => set('puesto')(e.target.value)}
                placeholder="Ej. Coordinador de Informática"
                className={control(errores.puesto)}
              />
            </Campo>
            {crear && (
              <>
                <div className="hidden md:block" />
                {camposPassword}
                <div className="md:col-span-2">{checkboxPassword}</div>
              </>
            )}
          </div>
        </section>

        {/* ── Adscripción ── */}
        <section className="py-8">
          <h2 className="text-base font-semibold text-slate-900">
            {crear ? 'Adscripción Institucional (Dependencia y Área)' : 'Reasignación de Dependencia y Área Operativa'}
          </h2>
          {errorCatalogo && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorCatalogo}
            </p>
          )}
          <div className={`mt-6 grid gap-x-6 gap-y-5 ${crear ? 'md:grid-cols-2' : 'md:grid-cols-[1fr_1.45fr]'}`}>
            <Campo id="usr-dependenciaId" etiqueta="Dependencia / Sector" error={errores.dependenciaId}>
              {nuevaDep ? (
                <div className="space-y-2 rounded-lg border border-line bg-slate-50 p-3">
                  <input
                    autoFocus
                    value={nuevaDep.nombre}
                    onChange={(e) => setNuevaDep({ ...nuevaDep, nombre: e.target.value })}
                    placeholder="Nombre oficial de la dependencia"
                    className="input"
                    aria-label="Nombre de la nueva dependencia"
                  />
                  <div className="flex gap-2">
                    <input
                      value={nuevaDep.siglas}
                      onChange={(e) => setNuevaDep({ ...nuevaDep, siglas: e.target.value })}
                      placeholder="Siglas"
                      className="input uppercase"
                      aria-label="Siglas"
                    />
                    <button type="button" onClick={() => setNuevaDep(null)} className="btn-secondary shrink-0 px-3">
                      Cancelar
                    </button>
                    <button type="button" onClick={agregarDependencia} disabled={!nuevaDep.nombre.trim()} className="btn-primary shrink-0 px-3">
                      Agregar
                    </button>
                  </div>
                </div>
              ) : (
                <Select
                  id="usr-dependenciaId"
                  value={form.dependenciaId}
                  onChange={cambiarDependencia}
                  invalido={!!errores.dependenciaId}
                  deshabilitado={!esSuper}
                >
                  <option value="">Seleccione la dependencia</option>
                  {dependencias
                    // Las dependencias dadas de baja no se ofrecen (salvo la que ya tiene la cuenta)
                    .filter((d) => (esSuper || d.id === actor.dependenciaId) && (d.activa || d.id === inicial?.dependenciaId))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  {catalogo && <option value={NUEVA}>＋ Registrar nueva dependencia…</option>}
                </Select>
              )}
            </Campo>

            <Campo id="usr-area" etiqueta="Área / Departamento Específico" error={errores.area}>
              {nuevaArea != null ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={nuevaArea}
                    onChange={(e) => setNuevaArea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        agregarArea()
                      }
                    }}
                    placeholder="Nombre de la nueva área"
                    className="input h-[46px]"
                    aria-label="Nombre de la nueva área"
                  />
                  <button type="button" onClick={() => setNuevaArea(null)} className="btn-secondary shrink-0 px-3">
                    Cancelar
                  </button>
                  <button type="button" onClick={agregarArea} disabled={!nuevaArea.trim()} className="btn-primary shrink-0 px-3" aria-label="Agregar área">
                    <Plus size={15} />
                  </button>
                </div>
              ) : (
                <Select id="usr-area" value={form.area} onChange={cambiarArea} invalido={!!errores.area} deshabilitado={!form.dependenciaId}>
                  <option value="">{form.dependenciaId ? 'Seleccione el área' : 'Primero elija la dependencia'}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.nombre}>
                      {a.nombre}
                    </option>
                  ))}
                  {catalogo && form.dependenciaId && <option value={NUEVA}>＋ Agregar nueva área…</option>}
                </Select>
              )}
            </Campo>
          </div>
        </section>

        {/* ── Rol y nivel ── */}
        <section className="py-8">
          <h2 className="text-base font-semibold text-slate-900">Rol y Nivel de Acceso</h2>
          <div role="radiogroup" aria-label="Rol y nivel de acceso" className="mt-6 space-y-3">
            {tarjetas.map((g) => {
              const activa = form.grupo === g.id
              const permitida = rolesPermitidos.includes(g.rol) && (!esMismaCuenta || activa)
              return (
                <div
                  key={g.id}
                  className={`rounded-lg border transition-colors ${
                    activa ? 'border-primary bg-primary-soft' : 'border-line bg-white'
                  } ${permitida ? '' : 'opacity-50'}`}
                >
                  <label className={`flex items-center gap-4 px-4 py-5 ${permitida ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="grupo"
                      checked={activa}
                      disabled={!permitida}
                      onChange={() => elegirGrupo(g)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                        activa ? 'border-primary' : 'border-slate-300'
                      }`}
                      aria-hidden="true"
                    >
                      {activa && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${activa ? 'text-primary' : 'text-slate-900'}`}>{g.titulo}</span>
                      <span className="mt-1 block text-xs text-slate-500">{g.descripcion}</span>
                    </span>
                  </label>
                  {/* Nivel específico dentro de la tarjeta elegida */}
                  {activa && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pl-[54px]">
                      <span className="text-[11px] text-slate-500">Nivel:</span>
                      {g.niveles.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => set('nivel')(n)}
                          disabled={!permitida}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                            form.nivel === n
                              ? 'border-primary bg-white text-primary'
                              : 'border-transparent text-slate-500 hover:border-line hover:bg-white'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {esMismaCuenta && <p className="mt-3 text-xs text-slate-500">No puede cambiar el nivel de acceso de su propia cuenta.</p>}
        </section>

        {/* ── Contraseña y acciones (solo edición) ── */}
        {!crear && (
          <section className="space-y-5 py-8">
            {camposPassword}
            {checkboxPassword}
            {accionesCuenta}
          </section>
        )}
      </div>

      {/* ── Pie ── */}
      <div className="flex flex-col-reverse gap-4 border-t border-line px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          {errorGeneral ? (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-rose-600">
              <CircleExclamationPoint size={15} /> {errorGeneral}
            </p>
          ) : (
            crear && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Estatus: Cuenta Activa por defecto
              </span>
            )
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onCancelar} className="btn-secondary h-11 px-5 font-semibold text-slate-900">
            Cancelar
          </button>
          <button type="submit" className="btn-primary h-11 px-6 font-semibold">
            {crear ? <UserPlus size={16} /> : <Check size={16} />}
            {crear ? 'Guardar y Crear Usuario' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}

function EstadoCuenta({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Cuenta Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Cuenta Inactiva
    </span>
  )
}

const control = (error) =>
  `w-full h-[46px] rounded-lg border bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    error ? 'border-rose-400 focus:ring-rose-200' : 'border-line focus:border-primary focus:ring-primary/20'
  }`

function Campo({ id, etiqueta, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600">
          <CircleExclamationPoint size={13} /> {error}
        </p>
      )}
    </div>
  )
}

function InputPassword({ id, value, onChange, error, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
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

function Select({ id, value, onChange, invalido, deshabilitado = false, children }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={deshabilitado}
        aria-invalid={invalido}
        className={`${control(invalido)} cursor-pointer appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 [&_option]:text-slate-800 ${
          value ? '' : 'text-slate-400'
        }`}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
    </div>
  )
}
