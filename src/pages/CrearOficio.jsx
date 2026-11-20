import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building,
  ChevronDown,
  CircleCheck,
  CircleExclamationPoint,
  CloudUpload,
  FileImage,
  FilePenLine,
  FileText,
  LoaderCircle,
  Lock,
  Paperclip,
  Trash,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import axiosClient from '../api/axiosClient'
import { PRIORIDADES } from '../data/mockData'

const FORM_INICIAL = { destino: '', categoria: '', prioridad: PRIORIDADES.MEDIA, titulo: '', descripcion: '' }

const EXTENSIONES = ['pdf', 'docx', 'png', 'jpg', 'jpeg']
const MAX_BYTES = 15 * 1024 * 1024
const MAX_TITULO = 150

const OPCIONES_PRIORIDAD = [
  { value: PRIORIDADES.BAJA, label: 'Baja' },
  { value: PRIORIDADES.MEDIA, label: 'Media' },
  { value: PRIORIDADES.ALTA, label: 'Alta / Prioritaria' },
]

const formatPeso = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

const extension = (nombre) => nombre.split('.').pop().toLowerCase()

function validar(form, puedeElegirArea) {
  const e = {}
  if (puedeElegirArea && !form.destino) e.destino = 'Seleccione el área destinataria.'
  if (!form.categoria) e.categoria = 'Seleccione la categoría del trámite.'
  if (form.titulo.trim().length < 5) e.titulo = 'Escriba un título de al menos 5 caracteres.'
  if (form.descripcion.trim().length < 20) e.descripcion = 'Describa la solicitud con al menos 20 caracteres.'
  return e
}

export default function CrearOficio() {
  const { user } = useAuth()
  return <Formulario key={user.idUsuario || user.id} />
}

function Formulario() {
  const { user, role, dependencia } = useAuth()
  const { crearOficio, getBorrador, guardarBorrador, descartarBorrador } = useOficios()
  const navigate = useNavigate()

  const rolActual = String(role || user?.rol || '').toUpperCase()
  const puedeElegirArea = rolActual === 'ADMIN' || rolActual === 'INTERMEDIARIO'

  const [areasReales, setAreasReales] = useState([])
  const [categoriasReales, setCategoriasReales] = useState([])

  const [borradorInicial] = useState(() => getBorrador(user.idUsuario || user.id))
  const [form, setForm] = useState(() => borradorInicial?.form ?? FORM_INICIAL)
  const [adjuntos, setAdjuntos] = useState(() => borradorInicial?.adjuntos ?? [])
  const [rechazados, setRechazados] = useState([])
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [mostrarAvisoBorrador, setMostrarAvisoBorrador] = useState(!!borradorInicial)
  const [aviso, setAviso] = useState(null)
  const fileInput = useRef(null)

  const errores = intentado ? validar(form, puedeElegirArea) : {}
  const cargando = adjuntos.some((a) => a.progreso < 100)
  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Cargar áreas (solo si puede elegir) y categorías reales desde PostgreSQL
  useEffect(() => {
    if (puedeElegirArea) {
      axiosClient.get('/api/areas/todas')
        .then((res) => setAreasReales(res.data.filter((a) => a.activo !== false)))
        .catch((err) => console.error('Error al cargar áreas:', err))
    }

    axiosClient.get('/api/categorias/todas')
      .then((res) => setCategoriasReales(res.data.filter((c) => c.activo !== false)))
      .catch((err) => console.error('Error al cargar categorías:', err))
  }, [puedeElegirArea])

  useEffect(() => {
    if (!cargando) return
    const t = setInterval(() => {
      setAdjuntos((prev) =>
        prev.map((a) => (a.progreso >= 100 ? a : { ...a, progreso: Math.min(100, a.progreso + 8 + Math.round(Math.random() * 14)) }))
      )
    }, 140)
    return () => clearInterval(t)
  }, [cargando])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2800)
    return () => clearTimeout(t)
  }, [aviso])

  const agregarArchivos = (lista) => {
    const malos = []
    const buenos = []
    for (const f of lista) {
      if (!EXTENSIONES.includes(extension(f.name))) malos.push(`${f.name}: formato no permitido`)
      else if (f.size > MAX_BYTES) malos.push(`${f.name}: supera los 15 MB`)
      else
        buenos.push({
          id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 7)}`,
          nombre: f.name,
          bytes: f.size,
          tipo: extension(f.name) === 'jpeg' ? 'jpg' : extension(f.name),
          progreso: 0,
          archivoFisico: f,
        })
    }
    setRechazados(malos)
    setAdjuntos((prev) => [...prev, ...buenos])
  }

  const onDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    agregarArchivos([...e.dataTransfer.files])
  }

  const guardar = () => {
    guardarBorrador(user.idUsuario || user.id, { form, adjuntos: adjuntos.map((a) => ({ ...a, progreso: 100 })) })
    const ahora = new Date()
    setAviso(`Borrador guardado a las ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`)
  }

  const descartar = () => {
    descartarBorrador(user.idUsuario || user.id)
    setForm(FORM_INICIAL)
    setAdjuntos([])
    setIntentado(false)
    setMostrarAvisoBorrador(false)
  }

  const emitir = async () => {
    setIntentado(true)
    const e = validar(form, puedeElegirArea)
    const camposOrden = puedeElegirArea
      ? ['destino', 'categoria', 'titulo', 'descripcion']
      : ['categoria', 'titulo', 'descripcion']
    const primero = camposOrden.find((k) => e[k])
    if (primero) {
      document.getElementById(`campo-${primero}`)?.focus()
      return
    }
    setEnviando(true)

    try {
      const catSeleccionada = categoriasReales.find((c) => String(c.idCategoria || c.id) === String(form.categoria))

      const payloadTicket = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        prioridad: form.prioridad,
        solicitante: { idUsuario: user.idUsuario || user.id },
        area: puedeElegirArea && form.destino ? { idArea: parseInt(form.destino, 10) } : null,
        categoria: { idCategoria: parseInt(form.categoria, 10) },
        categoriaString: catSeleccionada?.nombre || form.categoria,
      }

      const result = await crearOficio(payloadTicket, adjuntos)
      navigate('/oficios', { state: { creado: result } })
    } catch (error) {
      console.error('Error al crear el ticket:', error)
      setAviso('Error al enviar el ticket. Intente de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-[11px]" aria-label="Ruta">
          <span className="font-bold uppercase tracking-wide text-primary">Mesa de ayuda institucional</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Crear Oficio / Solicitud</span>
        </nav>
      </div>

      <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Generar Nuevo Oficio / Ticket de Atención
      </h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-500">
        Complete el formulario para registrar una solicitud formal y adjuntar documentación de respaldo.
      </p>

      {mostrarAvisoBorrador && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Se recuperó el borrador que guardaste anteriormente.</span>
          <div className="flex items-center gap-4">
            <button onClick={descartar} className="font-semibold hover:underline">
              Descartar borrador
            </button>
            <button onClick={() => setMostrarAvisoBorrador(false)} className="rounded p-0.5 hover:bg-amber-100">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <form noValidate onSubmit={(e) => { e.preventDefault(); emitir() }} className="card mt-6 divide-y divide-line">
        <Seccion icon={Building} titulo="Información General del Oficio" subtitulo="Identifique la categoría y la prioridad de atención.">
          <div className="grid gap-6 md:grid-cols-2">
            <Campo etiqueta="Dependencia / Área Emisora" htmlFor="campo-emisora">
              <div id="campo-emisora" className="flex h-14 items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-4 text-sm text-slate-500" aria-readonly="true">
                <span className="truncate">{user?.area?.nombre || dependencia?.nombre || 'Mi Área'}</span>
                <Lock size={16} strokeWidth={1.75} className="shrink-0" />
              </div>
            </Campo>

            {puedeElegirArea ? (
              <Campo etiqueta="Área Destinataria" htmlFor="campo-destino" error={errores.destino}>
                <Select id="campo-destino" value={form.destino} onChange={set('destino')} invalido={!!errores.destino}>
                  <option value="">Seleccione el área destinataria</option>
                  {areasReales.map((a) => (
                    <option key={a.idArea || a.id} value={a.idArea || a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </Select>
              </Campo>
            ) : (
              <Campo etiqueta="Área Destinataria" htmlFor="campo-destino-auto">
                <div id="campo-destino-auto" className="flex h-14 items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-4 text-sm text-slate-500" aria-readonly="true">
                  <span className="truncate">Por asignar (Intermediario)</span>
                  <Lock size={16} strokeWidth={1.75} className="shrink-0" />
                </div>
              </Campo>
            )}

            <Campo etiqueta="Categoría del Trámite" htmlFor="campo-categoria" error={errores.categoria}>
              <Select id="campo-categoria" value={form.categoria} onChange={set('categoria')} invalido={!!errores.categoria}>
                <option value="">Seleccione una categoría</option>
                {categoriasReales.map((c) => (
                  <option key={c.idCategoria || c.id} value={c.idCategoria || c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Campo>

            <fieldset>
              <legend className="mb-2 text-sm text-slate-800">Nivel de Prioridad / Urgencia</legend>
              <div className="grid grid-cols-[1fr_1fr_1.8fr] gap-2">
                {OPCIONES_PRIORIDAD.map((p) => {
                  const activa = form.prioridad === p.value
                  return (
                    <label key={p.value} className={`flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-primary/30 ${activa ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="prioridad" value={p.value} checked={activa} onChange={() => set('prioridad')(p.value)} className="sr-only" />
                      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${activa ? 'border-primary' : 'border-slate-300'}`}>
                        {activa && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      {p.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>
        </Seccion>

        <Seccion icon={FilePenLine} titulo="Detalle de la Solicitud" subtitulo="Proporcione la información necesaria para dar seguimiento a su oficio.">
          <div className="space-y-6">
            <Campo etiqueta="Título / Asunto del Oficio" htmlFor="campo-titulo" error={errores.titulo} extra={`${form.titulo.length}/${MAX_TITULO}`}>
              <input id="campo-titulo" value={form.titulo} maxLength={MAX_TITULO} onChange={(e) => set('titulo')(e.target.value)} placeholder="Ej. Solicitud de revisión de red..." className={`${claseControl(!!errores.titulo)} h-[52px]`} />
            </Campo>
            <Campo etiqueta="Descripción Detallada / Exposición de Motivos" htmlFor="campo-descripcion" error={errores.descripcion}>
              <textarea id="campo-descripcion" value={form.descripcion} onChange={(e) => set('descripcion')(e.target.value)} rows={6} placeholder="Describa detalladamente la solicitud o el problema a atender..." className={`${claseControl(!!errores.descripcion)} resize-y py-3`} />
            </Campo>
          </div>
        </Seccion>

        <Seccion icon={Paperclip} titulo="Documentos Adjuntos y Anexos" subtitulo="Agregue la documentación de respaldo para su solicitud.">
          <div onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)} onDrop={onDrop} className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${arrastrando ? 'border-primary bg-primary-soft' : 'border-slate-200 bg-slate-50/60'}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-primary">
              <CloudUpload size={20} strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm text-slate-800">
              Arrastre y suelte sus archivos aquí o <button type="button" onClick={() => fileInput.current?.click()} className="font-semibold text-primary hover:underline">Examine en su equipo</button>
            </p>
            <p className="mt-2 text-xs text-slate-500">Formatos permitidos: PDF, DOCX, PNG, JPG (Máximo 15 MB por archivo).</p>
            <input ref={fileInput} type="file" multiple hidden accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(e) => { agregarArchivos([...e.target.files]); e.target.value = '' }} />
          </div>

          {rechazados.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-rose-600" role="alert">
              {rechazados.map((r) => (
                <li key={r} className="flex items-center gap-1.5"><CircleExclamationPoint size={13} /> {r}</li>
              ))}
            </ul>
          )}

          {adjuntos.length > 0 && (
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Archivos adjuntos ({adjuntos.length})</span>
                {cargando ? <span className="flex items-center gap-1.5 text-slate-500"><LoaderCircle size={13} className="animate-spin" /> Cargando archivos…</span> : <span className="flex items-center gap-1.5 text-emerald-700"><CircleCheck size={13} /> Carga completada</span>}
              </div>
              <ul className="space-y-3">
                {adjuntos.map((a) => (
                  <ArchivoCargado key={a.id} archivo={a} onEliminar={() => setAdjuntos((prev) => prev.filter((x) => x.id !== a.id))} />
                ))}
              </ul>
            </div>
          )}
        </Seccion>

        <div className="flex flex-col-reverse gap-3 px-6 py-6 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={guardar} disabled={enviando} className="inline-flex h-12 items-center justify-center rounded-lg border border-primary bg-white px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50">
            Guardar como Borrador
          </button>
          <button type="submit" disabled={enviando || cargando} className="btn-primary h-12 px-6 text-sm font-semibold">
            {enviando ? <><LoaderCircle size={17} className="animate-spin" /> Enviando oficio…</> : <><ArrowRight size={17} /> Emitir y Enviar Oficio</>}
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        ¿Prefieres revisar primero tus oficios? <Link to="/oficios" className="text-primary hover:underline">Ir al Buzón</Link>
      </p>
      {aviso && <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{aviso}</div>}
    </div>
  )
}

const claseControl = (invalido) => `w-full rounded-lg border bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${invalido ? 'border-rose-400 focus:ring-rose-200' : 'border-line focus:border-primary focus:ring-primary/20'}`

function Seccion({ icon: Icon, titulo, subtitulo, children }) {
  return (
    <section className="px-6 py-8 sm:px-8">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg text-slate-900">{titulo}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Campo({ etiqueta, htmlFor, error, extra, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm text-slate-800">{etiqueta}</label>
        {extra && <span className="text-[11px] text-slate-400">{extra}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600"><CircleExclamationPoint size={13} /> {error}</p>}
    </div>
  )
}

function Select({ id, value, onChange, invalido, children }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalido} className={`${claseControl(invalido)} h-14 cursor-pointer appearance-none pr-10 [&_option]:text-slate-800 ${value ? '' : 'text-slate-400'}`}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
    </div>
  )
}

function ArchivoCargado({ archivo, onEliminar }) {
  const esImagen = ['png', 'jpg'].includes(archivo.tipo)
  const Icon = esImagen ? FileImage : FileText
  const caja = archivo.tipo === 'pdf' || archivo.tipo === 'docx' ? 'bg-primary-soft text-primary' : 'bg-sky-50 text-sky-700'

  return (
    <li className="flex items-center gap-4 rounded-lg border border-line bg-white px-4 py-4">
      <div className={`flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-md ${caja}`}>
        <Icon size={17} strokeWidth={1.75} />
        <span className="mt-0.5 text-[8px] font-bold uppercase leading-none">{archivo.tipo}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm text-slate-900">{archivo.nombre}</p>
          <span className="shrink-0 text-xs text-slate-500">{formatPeso(archivo.bytes)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={archivo.progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${archivo.progreso}%` }} />
          </div>
          <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-slate-600">{archivo.progreso}%</span>
        </div>
      </div>
      <button type="button" onClick={onEliminar} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash size={17} strokeWidth={1.75} /></button>
    </li>
  )
}