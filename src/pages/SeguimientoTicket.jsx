import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Building,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  MessagesSquare,
  Paperclip,
  Send,
  ShieldLock,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  ESTADOS_OFICIO,
  ESTADO_LABELS,
  FECHA_ACTUAL,
  ROLES,
  getReceptor,
} from '../data/mockData'
import { useOficios } from '../context/oficiosContext'
import { useInstitucion } from '../context/institucionContext'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { formatFechaLarga, formatFechaMensaje, formatFechaSlash } from '../utils/fechas'

// Badge de estado con punto, en tonos del diseño de seguimiento
const ESTADO_TONOS = {
  en_proceso: 'bg-amber-50 text-amber-700',
  prioritaria: 'bg-rose-50 text-rose-700',
  en_revision: 'bg-sky-50 text-sky-700',
  resuelta: 'bg-emerald-50 text-emerald-700',
}

const ETIQUETA_ESTADO = { ...ESTADO_LABELS, en_proceso: 'En Proceso' }

const formatPeso = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

const tipoArchivo = (nombre) => {
  const ext = nombre.split('.').pop().toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'xlsx'
  return ext.slice(0, 4) || 'doc'
}

export default function SeguimientoTicket() {
  const { id } = useParams()
  const { user, role, filterOficios } = useAuth()
  const { oficios, getOficio } = useOficios()
  const oficio = getOficio(id)
  const puedeVer = useMemo(() => filterOficios(oficios).some((o) => o.id === id), [filterOficios, oficios, id])

  if (!oficio) {
    return (
      <EstadoVacio
        titulo="Oficio no encontrado"
        texto={`No existe ningún oficio con el identificador "${id}".`}
      />
    )
  }
  if (!puedeVer) {
    return (
      <EstadoVacio
        titulo="Sin acceso a este oficio"
        texto="Tu rol actual no tiene permiso para consultar el expediente de este oficio."
        restringido
      />
    )
  }

  // `key` reinicia el borrador (texto y adjuntos) al cambiar de oficio o de usuario
  return <Seguimiento key={`${oficio.id}-${user.id}`} oficio={oficio} user={user} role={role} />
}

function Seguimiento({ oficio, user, role }) {
  const { getMensajes, agregarMensaje: guardarMensaje, finalizarOficio } = useOficios()
  const { getDependencia } = useInstitucion()
  const mensajes = getMensajes(oficio.id)
  const estado = oficio.estado
  const [texto, setTexto] = useState('')
  const [archivos, setArchivos] = useState([])
  const [confirmar, setConfirmar] = useState(false)
  const [aviso, setAviso] = useState(null)
  const fileInput = useRef(null)
  const finConversacion = useRef(null)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2800)
    return () => clearTimeout(t)
  }, [aviso])

  const dep = getDependencia(oficio.dependenciaId)
  const receptor = getReceptor(oficio, getDependencia)
  const resuelta = estado === ESTADOS_OFICIO.RESUELTA
  const puedeFinalizar = role !== ROLES.USUARIO_COMUN || user.id === oficio.asignadoAId
  const horasSla = Math.round((new Date(oficio.fechaLimite) - new Date(oficio.fechaCreacion)) / 36e5)
  const sla = horasSla <= 48 ? `SLA ${Math.max(horasSla, 1)}h` : `SLA ${Math.round(horasSla / 24)} días`

  // Quien creó el oficio escribe como emisor; cualquier otro (área receptora, admins) como receptor
  const miLado = user.id === oficio.creadoPorId ? 'emisor' : 'receptor'

  // Agrupar mensajes por día para las barras divisorias
  const grupos = mensajes.reduce((acc, m) => {
    const dia = m.fecha.slice(0, 10)
    const ultimo = acc.at(-1)
    if (ultimo?.dia === dia) ultimo.items.push(m)
    else acc.push({ dia, items: [m] })
    return acc
  }, [])

  const ahoraISO = () => {
    // Hora de la demo + minutos reales transcurridos, para que los mensajes nuevos queden al final
    const ultimo = new Date(mensajes.at(-1)?.fecha ?? FECHA_ACTUAL)
    const base = Math.max(FECHA_ACTUAL.getTime(), ultimo.getTime() + 60000)
    const d = new Date(base)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
  }

  const bajarAlFinal = () =>
    requestAnimationFrame(() => finConversacion.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))

  const agregarMensaje = (m) => {
    guardarMensaje(oficio.id, { fecha: ahoraISO(), ...m })
    bajarAlFinal()
  }

  const enviar = () => {
    if (!texto.trim() && archivos.length === 0) return
    agregarMensaje({
      autorId: user.id,
      lado: miLado,
      texto: texto.trim(),
      adjuntos: archivos.map((f) => ({ nombre: f.name, tipo: tipoArchivo(f.name), bytes: f.size })),
    })
    setTexto('')
    setArchivos([])
  }

  const finalizar = () => {
    finalizarOficio(oficio.id, {
      fecha: ahoraISO(),
      autorId: user.id,
      lado: miLado,
      texto: 'Ticket finalizado. Se da por concluida la atención de este oficio.',
      adjuntos: [],
      sistema: true,
    })
    bajarAlFinal()
    setConfirmar(false)
    setAviso('El ticket se marcó como resuelto.')
  }

  return (
    <>
      {/* Breadcrumb + título */}
      <nav className="flex items-center gap-2 text-[11px]" aria-label="Ruta">
        <span className="font-bold uppercase tracking-wide text-primary">Mesa de ayuda institucional</span>
        <span className="text-slate-300">•</span>
        <Link to="/oficios" className="text-slate-500 hover:text-primary">
          Buzón de Oficios
        </Link>
      </nav>
      <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Seguimiento de Oficio y Chat de Soporte
      </h1>
      <p className="mt-3 text-[15px] text-slate-500">
        Consulte el avance de la solicitud, converse con el área responsable y gestione el expediente digital.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
        {/* ── Columna principal ── */}
        <div className="min-w-0 space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-[150px] rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                #{oficio.folio}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_TONOS[estado]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {ETIQUETA_ESTADO[estado]}
              </span>
            </div>
            <h2 className="mt-4 text-xl text-slate-900 sm:text-[22px]">
              Folio #{oficio.folio}: {oficio.asunto}
            </h2>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
              <div className="flex items-center gap-2.5">
                <MessagesSquare size={19} strokeWidth={1.75} className="text-primary" />
                <h3 className="text-[15px] font-semibold text-slate-900">Conversación</h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {mensajes.length} {mensajes.length === 1 ? 'mensaje' : 'mensajes'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Seguimiento institucional</span>
            </div>

            <div className="px-6 pb-6">
              {grupos.map((g) => (
                <section key={g.dia}>
                  <div className="flex items-center gap-4 py-5" role="separator">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[11px] text-slate-500">{formatFechaLarga(`${g.dia}T00:00:00`)}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <div className="space-y-7">
                    {g.items.map((m) => (
                      <Mensaje key={m.id} mensaje={m} oficio={oficio} onDescargar={(n) => setAviso(`Descarga simulada: ${n}`)} />
                    ))}
                  </div>
                </section>
              ))}
              <div ref={finConversacion} />
            </div>

            {/* Caja de respuesta */}
            <div className="mx-6 border-t border-line px-0 pb-8 pt-6 sm:px-6">
              {resuelta ? (
                <p
                  role="status"
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm text-slate-500"
                >
                  <Lock size={15} strokeWidth={1.75} className="shrink-0 text-slate-400" />
                  Este oficio se encuentra resuelto. El chat está en modo de solo lectura.
                </p>
              ) : (
                <>
                  <label htmlFor="respuesta" className="text-sm font-semibold text-slate-900">
                    Responder o agregar nota de seguimiento...
                  </label>
                  <textarea
                    id="respuesta"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && enviar()}
                    placeholder="Escriba su respuesta para continuar con la atención del oficio..."
                    rows={5}
                    className="mt-4 w-full resize-y rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  {archivos.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {archivos.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-2 rounded-md border border-line bg-slate-50 py-1 pl-2.5 pr-1 text-xs text-slate-600"
                        >
                          <Paperclip size={12} />
                          {f.name} · {formatPeso(f.size)}
                          <button
                            onClick={() => setArchivos((prev) => prev.filter((_, j) => j !== i))}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            aria-label={`Quitar ${f.name}`}
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fileInput.current?.click()}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                        aria-label="Adjuntar archivo"
                      >
                        <Paperclip size={19} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => fileInput.current?.click()} className="btn-secondary text-primary">
                        Adjuntar Documento
                      </button>
                      <input
                        ref={fileInput}
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => {
                          setArchivos((prev) => [...prev, ...e.target.files])
                          e.target.value = ''
                        }}
                      />
                    </div>
                    <button
                      onClick={enviar}
                      disabled={!texto.trim() && archivos.length === 0}
                      className="btn-primary px-6 py-2.5"
                    >
                      Enviar Respuesta <Send size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Columna lateral ── */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-slate-900">Ficha Técnica y Expediente del Oficio</h2>

          <div className="card -mt-1">
            <div className="flex items-center gap-3 border-b border-line px-6 py-5">
              <ClipboardList size={18} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-sm font-semibold text-slate-900">Detalles del Registro</h3>
            </div>
            <dl className="space-y-6 px-6 py-6">
              <Detalle icon={Building} etiqueta="Emisor" valor={dep?.nombre} />
              <Detalle icon={Building} etiqueta="Receptor" valor={receptor} />
              <div className="border-t border-line pt-6">
                <Detalle
                  icon={CalendarDays}
                  etiqueta="Fecha Límite"
                  valor={`${formatFechaSlash(oficio.fechaLimite)} (${sla})`}
                />
              </div>
            </dl>
          </div>

          {resuelta ? (
            // Indicador fijo: ya no es un botón
            <div
              role="status"
              className="flex w-full items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm font-semibold text-emerald-700"
            >
              <CircleCheck size={20} strokeWidth={1.75} />
              Ticket Finalizado
            </div>
          ) : (
            puedeFinalizar && (
              <button
                onClick={() => setConfirmar(true)}
                className="flex w-full items-center gap-3 rounded-card border border-primary bg-white px-5 py-5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                <CircleCheck size={20} strokeWidth={1.75} />
                Finalizar Ticket
              </button>
            )
          )}
        </aside>
      </div>

      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title="¿Finalizar este ticket?"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={finalizar}>
              Sí, finalizar
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          El oficio <span className="font-semibold text-slate-900">#{oficio.folio}</span> se marcará como
          resuelto y la conversación quedará cerrada.
        </p>
      </Modal>

      {aviso && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
        >
          {aviso}
        </div>
      )}
    </>
  )
}

function Mensaje({ mensaje, oficio, onDescargar }) {
  const { getUsuario, getDependencia } = useInstitucion()
  const autor = getUsuario(mensaje.autorId)
  const esReceptor = mensaje.lado === 'receptor'
  const etiqueta = esReceptor ? oficio.subarea : getDependencia(autor?.dependenciaId)?.nombreCorto

  return (
    <article className="flex gap-3">
      <Avatar name={autor?.nombre} src={autor?.foto} tone={esReceptor ? 'primary' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{autor?.nombre}</p>
            <span
              className={`mt-1.5 inline-block rounded px-2 py-0.5 text-[11px] ${
                esReceptor ? 'bg-primary-soft text-primary' : 'bg-slate-50 text-slate-500'
              }`}
            >
              {etiqueta}
            </span>
          </div>
          <time className="text-[11px] text-slate-500" dateTime={mensaje.fecha}>
            {formatFechaMensaje(mensaje.fecha)}
          </time>
        </div>

        <div
          className={`mt-3 rounded-lg border p-4 text-sm leading-relaxed text-slate-800 ${
            esReceptor ? 'border-primary/25 bg-primary-soft' : 'border-line bg-slate-50'
          } ${mensaje.sistema ? 'italic' : ''}`}
        >
          {mensaje.texto && <p className="whitespace-pre-line">{mensaje.texto}</p>}
          {mensaje.adjuntos.length > 0 && (
            <ul className={`space-y-2 ${mensaje.texto ? 'mt-4' : ''}`}>
              {mensaje.adjuntos.map((a) => (
                <Adjunto key={a.nombre} archivo={a} onDescargar={onDescargar} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}

function Adjunto({ archivo, onDescargar }) {
  const estilos = {
    pdf: { icon: FileText, caja: 'bg-primary-soft text-primary' },
    xlsx: { icon: FileSpreadsheet, caja: 'bg-emerald-50 text-emerald-700' },
  }[archivo.tipo] ?? { icon: FileText, caja: 'bg-slate-100 text-slate-600' }
  const Icon = estilos.icon

  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 not-italic">
      <div className={`flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-md ${estilos.caja}`}>
        <Icon size={17} strokeWidth={1.75} />
        <span className="mt-0.5 text-[8px] font-bold uppercase leading-none">{archivo.tipo}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-900">{archivo.nombre}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatPeso(archivo.bytes)}</p>
      </div>
      <button
        onClick={() => onDescargar(archivo.nombre)}
        className="rounded-md p-1.5 text-primary hover:bg-primary-soft"
        aria-label={`Descargar ${archivo.nombre}`}
      >
        <Download size={17} strokeWidth={1.75} />
      </button>
    </li>
  )
}

function Detalle({ icon: Icon, etiqueta, valor }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-slate-500" />
      <div>
        <dt className="text-[11px] text-slate-500">{etiqueta}</dt>
        <dd className="mt-1 text-sm text-slate-900">{valor}</dd>
      </div>
    </div>
  )
}

function EstadoVacio({ titulo, texto, restringido = false }) {
  const Icon = restringido ? ShieldLock : FileText
  return (
    <div className="card mx-auto mt-10 flex max-w-lg flex-col items-center px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon size={22} />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">{texto}</p>
      <Link to="/oficios" className="btn-primary mt-6">
        Volver al Buzón
      </Link>
    </div>
  )
}
