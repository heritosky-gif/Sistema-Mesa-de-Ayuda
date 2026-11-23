import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BellOff,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  FileCheck,
  FilePlus,
  MessageSquareReply,
  Paperclip,
  Radio,
  TriangleExclamationPoint,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'
import useNotificaciones, { TIPOS_NOTIFICACION } from '../hooks/useNotificaciones'
import Avatar from '../components/Avatar'
import { formatFechaLarga, formatHora12, mismoDia } from '../utils/fechas'

const POR_PAGINA = 4
const MAX_RESPUESTA = 500

const TABS = [
  { id: 'todas', label: 'Todas', match: () => true },
  { id: 'solicitud', label: 'Solicitudes Recientes', match: (n) => n.tipo === TIPOS_NOTIFICACION.SOLICITUD },
  { id: 'mensaje', label: 'Mensajes de Seguimiento', match: (n) => n.tipo === TIPOS_NOTIFICACION.MENSAJE },
  { id: 'sla', label: 'Alertas de Vencimiento SLA', match: (n) => n.tipo === TIPOS_NOTIFICACION.SLA },
]

const FILTROS_FECHA = [
  { value: 'todas', label: 'Todas las fechas', dias: null },
  { value: 'hoy', label: 'Hoy', dias: 1 },
  { value: '3', label: 'Últimos 3 días', dias: 3 },
  { value: '7', label: 'Últimos 7 días', dias: 7 },
]

const PRIORIDAD = {
  ALTA: { texto: 'Alta / Prioritaria', clase: 'bg-primary-soft text-primary' },
  CRITICA: { texto: 'Crítica', clase: 'bg-rose-50 text-rose-700' },
  MEDIA: { texto: 'Media', clase: 'bg-amber-50 text-amber-700' },
  BAJA: { texto: 'Baja', clase: 'bg-slate-100 text-slate-600' },
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIA_MS = 864e5

function tiempoRelativo(fecha) {
  const ahora = new Date()
  const d = new Date(fecha)
  const minutos = Math.round((ahora - d) / 60000)
  if (minutos < 1) return 'Hace un momento'
  if (minutos < 60) return `Hace ${minutos} min`
  if (mismoDia(d, ahora)) return `Hoy, ${formatHora12(d)}`
  if (mismoDia(d, ahora.getTime() - DIA_MS)) return `Ayer, ${formatHora12(d)}`
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}, ${formatHora12(d)}`
}

function etiquetaDia(dia) {
  const ahora = new Date()
  const d = new Date(`${dia}T12:00:00`)
  if (mismoDia(d, ahora)) return 'Hoy'
  if (mismoDia(d, ahora.getTime() - DIA_MS)) return 'Ayer'
  return DIAS_SEMANA[d.getDay()]
}

const esTicketResuelto = (o) => {
  const e = String(o?.estatus || o?.estado || '').toUpperCase()
  return ['RESUELTO', 'RESUELTA', 'FINALIZADO', 'CERRADO'].includes(e)
}

export default function Notificaciones() {
  const { user } = useAuth()
  const { notificaciones, noLeidas, marcarLeidas } = useNotificaciones()

  const [tab, setTab] = useState('todas')
  const [filtroFecha, setFiltroFecha] = useState('todas')
  const [verTodas, setVerTodas] = useState(false)
  const [seleccionId, setSeleccionId] = useState(null)
  const [texto, setTexto] = useState('')
  const [archivoAdjunto, setArchivoAdjunto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const fileInput = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const porFecha = useMemo(() => {
    const dias = FILTROS_FECHA.find((f) => f.value === filtroFecha).dias
    if (!dias) return notificaciones
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    inicio.setDate(inicio.getDate() - (dias - 1))
    return notificaciones.filter((n) => new Date(n.fecha) >= inicio)
  }, [notificaciones, filtroFecha])

  const conteos = Object.fromEntries(TABS.map((t) => [t.id, porFecha.filter(t.match).length]))
  const lista = porFecha.filter(TABS.find((t) => t.id === tab).match)
  const visibles = verTodas ? lista : lista.slice(0, POR_PAGINA)

  const grupos = visibles.reduce((acc, n) => {
    const dia = n.fecha.slice(0, 10)
    const ultimo = acc.at(-1)
    if (ultimo?.dia === dia) ultimo.items.push(n)
    else acc.push({ dia, items: [n] })
    return acc
  }, [])

  const mensajesPendientes = notificaciones.filter((n) => n.tipo === TIPOS_NOTIFICACION.MENSAJE)
  const seleccion = mensajesPendientes.find((n) => n.id === seleccionId) ?? mensajesPendientes[0] ?? null

  const cambiarTab = (id) => {
    setTab(id)
    setVerTodas(false)
  }

  const responder = (n) => {
    setSeleccionId(n.id)
    marcarLeidas([n.id])
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const enviarRespuesta = async () => {
    if (!seleccion || (!texto.trim() && !archivoAdjunto)) return
    const { oficio } = seleccion
    const idTicket = oficio.idTicket || oficio.id
    const folio = oficio.folio || `#${idTicket}`

    setEnviando(true)
    try {
      let archivoUrl = null
      let archivoNombre = null

      if (archivoAdjunto) {
        const formData = new FormData()
        formData.append('archivo', archivoAdjunto)
        const resArchivo = await axiosClient.post('/api/archivos/subir', formData, {
          headers: { 'Content-Type': undefined },
        })
        archivoUrl = resArchivo.data.url
        archivoNombre = resArchivo.data.nombre
      }

      const payload = {
        texto: texto.trim(),
        autor: { idUsuario: user.idUsuario || user.id },
        archivoUrl,
        archivoNombre,
      }

      await axiosClient.post(`/api/comentarios/ticket/${idTicket}`, payload)
      marcarLeidas([seleccion.id])
      setAviso({ texto: `Respuesta enviada en el folio ${folio}.`, oficioId: idTicket })
      setTexto('')
      setArchivoAdjunto(null)
      if (fileInput.current) fileInput.current.value = ''
      setSeleccionId(null)
    } catch (error) {
      console.error('Error al enviar respuesta rápida:', error)
      setAviso({ texto: 'No se pudo enviar la respuesta. Intente de nuevo.', oficioId: idTicket })
    } finally {
      setEnviando(false)
    }
  }

  const autorSeleccion = seleccion?.mensaje?.autor || null
  const nombreAutorSeleccion = autorSeleccion?.nombreCompleto || autorSeleccion?.nombre || 'Usuario'
  const resueltaSeleccion = seleccion ? esTicketResuelto(seleccion.oficio) : false

  return (
    <>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Centro de Notificaciones y Mensajes
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        Control de alertas en tiempo real, cambio de estatus de solicitudes y seguimiento de mensajes institucionales.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Radio size={15} className="text-emerald-600" />
          En tiempo real · Actualizado hace un momento
          {noLeidas > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
              {noLeidas} sin leer
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => marcarLeidas(notificaciones.map((n) => n.id))}
            disabled={noLeidas === 0}
            className="btn-secondary h-10 px-4 font-semibold text-slate-900"
          >
            <CheckCheck size={17} /> Marcar todas como leídas
          </button>
          <label className="relative flex h-10 min-w-[170px] items-center rounded-lg border border-line bg-white pl-3.5 pr-9 text-sm font-medium text-slate-900 focus-within:ring-2 focus-within:ring-primary/20">
            <span className="sr-only">Filtrar por fecha</span>
            <select
              value={filtroFecha}
              onChange={(e) => {
                setFiltroFecha(e.target.value)
                setVerTodas(false)
              }}
              className="w-full cursor-pointer appearance-none bg-transparent focus:outline-none"
            >
              {FILTROS_FECHA.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.value === 'todas' ? 'Filtrar por fecha' : f.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-500" />
          </label>
        </div>
      </div>

      <div role="tablist" className="mt-6 flex gap-8 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const activa = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={activa}
              onClick={() => cambiarTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-1 pb-3.5 pt-1 text-sm transition-colors ${
                activa ? 'border-primary font-semibold text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label} ({conteos[t.id]})
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_388px]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Alertas de Solicitudes y Mensajes Recientes</h2>

          {grupos.map((g) => (
            <section key={g.dia} className="mt-5">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{etiquetaDia(g.dia)}</span>
                <span className="text-slate-500">{formatFechaLarga(`${g.dia}T12:00:00`)}</span>
              </div>
              <div className="space-y-4">
                {g.items.map((n) => (
                  <Tarjeta
                    key={n.id}
                    n={n}
                    onLeer={() => marcarLeidas([n.id])}
                    onResponder={() => responder(n)}
                    seleccionada={seleccion?.id === n.id}
                  />
                ))}
              </div>
            </section>
          ))}

          {lista.length === 0 && (
            <div className="card mt-5 flex flex-col items-center px-6 py-14 text-center">
              <BellOff size={26} className="text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No hay notificaciones</p>
              <p className="mt-1 text-xs text-slate-500">Prueba con otra pestaña o con otro rango de fechas.</p>
            </div>
          )}

          {lista.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Mostrando {visibles.length} de {lista.length} notificaciones
              </p>
              {lista.length > POR_PAGINA && (
                <button
                  onClick={() => setVerTodas((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft"
                >
                  {verTodas ? 'Ver menos' : 'Ver todas'} <ArrowRight size={15} className={verTodas ? '-rotate-90' : ''} />
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-slate-900">Resumen de Actividad &amp; Respuestas Rápidas</h2>
          <div className="card mt-5 p-6">
            <div className="flex items-center gap-3">
              <MessageSquareReply size={19} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-[15px] font-semibold text-slate-900">Atajos e Interacción Rápida</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Responde al seguimiento sin salir del centro de notificaciones.
            </p>

            {seleccion ? (
              <>
                <div className="mt-5 rounded-lg bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">En respuesta a</span>
                    <Link
                      to={`/oficios/${seleccion.oficio.idTicket || seleccion.oficio.id}`}
                      className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-primary hover:border-primary/40"
                    >
                      {seleccion.oficio.folio || `#${seleccion.oficio.idTicket || seleccion.oficio.id}`}
                    </Link>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{nombreAutorSeleccion}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {seleccion.oficio.area?.nombre || 'Mesa de Ayuda'}
                  </p>
                </div>

                {resueltaSeleccion ? (
                  <p className="mt-4 rounded-lg border border-line bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    Este oficio se encuentra resuelto. El chat está en modo de solo lectura.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 rounded-lg border border-line focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <textarea
                        ref={textareaRef}
                        value={texto}
                        maxLength={MAX_RESPUESTA}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && enviarRespuesta()}
                        rows={4}
                        placeholder="Escriba su respuesta…"
                        aria-label={`Respuesta para ${nombreAutorSeleccion}`}
                        className="block w-full resize-none rounded-t-lg bg-transparent px-3 pt-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                      {archivoAdjunto && (
                        <div className="mx-3 mt-1 flex items-center justify-between rounded bg-slate-100 py-1 pl-2 pr-1 text-[11px] text-slate-600">
                          <span className="truncate">{archivoAdjunto.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setArchivoAdjunto(null)
                              if (fileInput.current) fileInput.current.value = ''
                            }}
                            className="rounded p-0.5 hover:bg-slate-200"
                            aria-label="Quitar archivo"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100"
                          aria-label="Adjuntar archivo"
                        >
                          <Paperclip size={16} />
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {texto.length} / {MAX_RESPUESTA}
                        </span>
                        <input
                          ref={fileInput}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.docx"
                          hidden
                          onChange={(e) => setArchivoAdjunto(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={enviarRespuesta}
                      disabled={enviando || (!texto.trim() && !archivoAdjunto)}
                      className="btn-primary mt-4 h-11 w-full font-semibold disabled:opacity-50"
                    >
                      {enviando ? 'Enviando...' : <>Enviar respuesta <ArrowRight size={16} /></>}
                    </button>
                  </>
                )}
              </>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                No hay mensajes de seguimiento pendientes por responder.
              </p>
            )}
          </div>
        </aside>
      </div>

      {aviso && (
        <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {aviso.texto}
          <Link to={`/oficios/${aviso.oficioId}`} className="font-semibold text-white underline underline-offset-2">
            Ver conversación
          </Link>
        </div>
      )}
    </>
  )
}

function Tarjeta({ n, onLeer, onResponder, seleccionada }) {
  const o = n.oficio
  const idTicket = o.idTicket || o.id
  const folio = o.folio || `#${idTicket}`
  const asunto = o.titulo || o.asunto || 'Sin asunto'
  const areaNombre = o.area?.nombre || 'Por asignar'

  const base = `card relative overflow-hidden p-6 transition-shadow ${n.leida ? '' : 'shadow-sm'} ${
    seleccionada ? 'ring-2 ring-primary/20' : ''
  }`
  const marcaNoLeida = !n.leida && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden="true" />

  if (n.tipo === TIPOS_NOTIFICACION.MENSAJE) {
    const autor = n.mensaje?.autor || {}
    const nombreAutor = autor.nombreCompleto || autor.nombre || 'Usuario'
    const prioridadKey = String(o.prioridad || 'BAJA').toUpperCase()
    const prioridad = PRIORIDAD[prioridadKey] ?? PRIORIDAD.BAJA

    return (
      <article className={base} onClick={onLeer}>
        {marcaNoLeida}
        <Cabecera
          color="text-primary"
          titulo="Nuevo Mensaje de Seguimiento"
          punto={!n.leida}
          fecha={n.fecha}
        />
        <div className="mt-4 flex gap-4">
          <Avatar name={nombreAutor} src={autor.foto} size="md" square />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-900">Mensaje de seguimiento en Folio {folio}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {nombreAutor} ({areaNombre})
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-slate-700">
              {n.mensaje.texto || (n.mensaje.archivoNombre ? `Adjuntó el archivo: ${n.mensaje.archivoNombre}` : 'Nuevo mensaje')}
            </p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${prioridad.clase}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> {prioridad.texto}
            </span>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResponder()
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-primary hover:border-primary/40 hover:bg-primary-soft"
              >
                Responder mensaje <ArrowRight size={15} />
              </button>
              <Link
                to={`/oficios/${idTicket}`}
                onClick={onLeer}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Ver expediente completo <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </article>
    )
  }

  let config
  if (n.tipo === TIPOS_NOTIFICACION.SLA) {
    const h = Math.round(Math.abs(n.horasRestantes))
    const plazo = h < 1 ? 'menos de 1 hora' : `${h} ${h === 1 ? 'hora' : 'horas'}`
    config = {
      color: 'text-amber-700',
      titulo: 'Alerta Vencimiento SLA / Prioridad Urgente',
      icono: TriangleExclamationPoint,
      caja: 'bg-amber-50 text-amber-600',
      texto:
        n.horasRestantes >= 0
          ? `Atención requerida: El folio ${folio} (${asunto}) está a ${plazo} de alcanzar el límite de atención (SLA).`
          : `Atención requerida: El folio ${folio} (${asunto}) superó su límite de atención (SLA) hace ${plazo}.`,
      detalle: `Área: ${areaNombre}`,
      badge: { texto: 'Atención Inmediata', clase: 'bg-amber-50 text-amber-700' },
    }
  } else if (n.subtipo === 'resuelta') {
    config = {
      color: 'text-emerald-700',
      titulo: 'Cambio de Estatus de Solicitud',
      icono: FileCheck,
      caja: 'bg-emerald-50 text-emerald-600',
      texto: `El oficio ${folio} (${asunto}) ha cambiado a estatus RESUELTO (${areaNombre}).`,
      detalle: `Solicitante: ${o.solicitante?.nombreCompleto || 'Usuario'}`,
      badge: { texto: 'Resuelto', clase: 'bg-emerald-50 text-emerald-700' },
    }
  } else {
    config = {
      color: 'text-primary',
      titulo: 'Nueva Solicitud Recibida',
      icono: FilePlus,
      caja: 'bg-primary-soft text-primary',
      texto: `Se registró el oficio ${folio} (${asunto}), área: ${areaNombre}.`,
      detalle: `Solicitante: ${o.solicitante?.nombreCompleto || 'Usuario'}`,
      badge: { texto: String(o.estatus || o.estado || 'NUEVO').toUpperCase(), clase: 'bg-slate-100 text-slate-600' },
    }
  }
  const Icono = config.icono

  return (
    <Link to={`/oficios/${idTicket}`} onClick={onLeer} className={`${base} group block hover:shadow-md`}>
      {marcaNoLeida}
      <Cabecera color={config.color} titulo={config.titulo} punto={!n.leida} fecha={n.fecha} />
      <div className="mt-4 flex gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.caja}`}>
          <Icono size={19} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-slate-800">{config.texto}</p>
          <p className="mt-2 text-[11px] text-slate-500">{config.detalle}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${config.badge.clase}`}>{config.badge.texto}</span>
            <ChevronRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function Cabecera({ color, titulo, punto, fecha }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
        {punto && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-label="Sin leer" />}
        {titulo}
      </p>
      <time className="shrink-0 text-[11px] text-slate-500" dateTime={fecha}>
        {tiempoRelativo(fecha)}
      </time>
    </div>
  )
}