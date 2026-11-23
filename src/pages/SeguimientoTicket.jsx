import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Building,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Lock,
  MessagesSquare,
  Paperclip,
  PlayCircle,
  Send,
  ShieldLock,
  FileText,
  UserCheck,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import axiosClient from '../api/axiosClient'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { formatFechaLarga, formatFechaMensaje, formatFechaSlash } from '../utils/fechas'

const ESTADO_TONOS = {
  PENDIENTE: 'bg-rose-50 text-rose-700',
  EN_PROCESO: 'bg-amber-50 text-amber-700',
  RESUELTO: 'bg-emerald-50 text-emerald-700',
}

const normalizarFecha = (fecha) => {
  if (!fecha) return null
  if (typeof fecha === 'string') return fecha
  if (typeof fecha === 'number') return new Date(fecha).toISOString()
  if (Array.isArray(fecha)) {
    const [y, M, d, h = 0, mnt = 0, s = 0] = fecha
    return new Date(y, M - 1, d, h, mnt, s).toISOString()
  }
  return null
}

export default function SeguimientoTicket() {
  const { id } = useParams()
  const { user, role, filterOficios } = useAuth()
  const { oficios, getOficio } = useOficios()

  const oficio = getOficio(Number(id) || id)
  const puedeVer = useMemo(() => filterOficios(oficios).some((o) => (o.idTicket || o.id) == id), [filterOficios, oficios, id])

  if (!oficio) {
    return <EstadoVacio titulo="Oficio no encontrado" texto={`No existe ningún oficio con el identificador "${id}".`} />
  }
  if (!puedeVer) {
    return <EstadoVacio titulo="Sin acceso a este oficio" texto="Tu rol actual no tiene permiso para consultar el expediente de este oficio." restringido />
  }

  return <Seguimiento key={`${oficio.idTicket || oficio.id}-${user.idUsuario || user.id}`} oficio={oficio} user={user} role={role} />
}

function Seguimiento({ oficio, user, role }) {
  const { finalizarOficio } = useOficios()
  const idReal = oficio.idTicket || oficio.id
  const folioVisible = oficio.folio || `#${idReal}`

  const [mensajes, setMensajes] = useState([])
  const [evidencias, setEvidencias] = useState([])
  const [texto, setTexto] = useState('')
  const [archivoAdjunto, setArchivoAdjunto] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [aviso, setAviso] = useState(null)

  const [areas, setAreas] = useState([])
  const [areaSeleccionada, setAreaSeleccionada] = useState(
    oficio.area?.idArea || oficio.area?.id || ''
  )
  const [areaActual, setAreaActual] = useState(oficio.area || null)

  const [todosTecnicos, setTodosTecnicos] = useState([])
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState(
    oficio.tecnico?.idUsuario || oficio.tecnicoAsignado?.idUsuario || ''
  )
  const [tecnicoActual, setTecnicoActual] = useState(
    oficio.tecnico || oficio.tecnicoAsignado || null
  )
  const [asignando, setAsignando] = useState(false)

  const finConversacion = useRef(null)
  const inputArchivoRef = useRef(null)

  const [estado, setEstado] = useState((oficio.estatus || oficio.estado || 'PENDIENTE').toUpperCase())
  const resuelta = estado === 'RESUELTO' || estado === 'FINALIZADO'
  const esPendiente = ['PENDIENTE', 'ABIERTO', 'NUEVO', 'SIN_ASIGNAR'].includes(estado)
  const puedeFinalizar = role === 'ADMIN' || role === 'TECNICO'
  const puedeAsignar = role === 'ADMIN' || role === 'INTERMEDIARIO'
  const areaResponsable = areaActual?.nombre || 'Por asignar'

  const nombreSolicitante =
    oficio.solicitante?.nombreCompleto ||
    oficio.solicitante?.nombre ||
    (String(oficio.solicitante?.idUsuario) === String(user.idUsuario || user.id)
      ? (user.nombreCompleto || user.nombre)
      : 'Usuario')

  useEffect(() => {
    axiosClient.get(`/api/comentarios/ticket/${idReal}`)
      .then(res => {
        setMensajes(res.data)
        bajarAlFinal()
      })
      .catch(err => console.error('Error al cargar comentarios:', err))
  }, [idReal])

  useEffect(() => {
    axiosClient.get(`/api/tickets/${idReal}/evidencias`)
      .then(res => setEvidencias(res.data))
      .catch(err => console.error('Error al cargar evidencias:', err))
  }, [idReal])

  useEffect(() => {
    if (!puedeAsignar) return

    axiosClient.get('/api/areas/todas')
      .then((res) => setAreas(res.data.filter((a) => a.activo !== false)))
      .catch((err) => console.error('Error al cargar áreas:', err))

    axiosClient.get('/api/usuarios/todos')
      .then((res) => {
        const soloTecnicos = res.data.filter(
          (u) => String(u.rol).toUpperCase() === 'TECNICO' && u.activo !== false
        )
        setTodosTecnicos(soloTecnicos)
      })
      .catch((err) => console.error('Error al cargar técnicos:', err))
  }, [puedeAsignar])

  const tecnicosFiltrados = useMemo(() => {
    if (!areaSeleccionada) return []
    return todosTecnicos.filter((u) => {
      const areaTecId = u.area?.idArea || u.area?.id
      return String(areaTecId) === String(areaSeleccionada)
    })
  }, [todosTecnicos, areaSeleccionada])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2800)
    return () => clearTimeout(t)
  }, [aviso])

  const mapaAutores = useMemo(() => {
    const mapa = {}
    const registrar = (u) => {
      if (u && typeof u === 'object' && (u.idUsuario || u.id) && (u.nombreCompleto || u.nombre)) {
        mapa[String(u.idUsuario || u.id)] = u
      }
    }

    registrar(user)
    registrar(oficio.solicitante)
    registrar(oficio.tecnico)
    registrar(oficio.tecnicoAsignado)
    registrar(tecnicoActual)
    mensajes.forEach((m) => registrar(m.autor))

    return mapa
  }, [mensajes, oficio, user, tecnicoActual])

  const grupos = mensajes.reduce((acc, m) => {
    const fechaRaw = m.fechaCreacion || m.fecha_creacion || m.fecha || m.createdAt
    const fechaSegura = normalizarFecha(fechaRaw)
    const dia = fechaSegura ? fechaSegura.slice(0, 10) : 'sin-fecha'

    const autorId = typeof m.autor === 'object' ? (m.autor?.idUsuario || m.autor?.id) : m.autor
    const autorResuelto =
      (typeof m.autor === 'object' && (m.autor?.nombreCompleto || m.autor?.nombre) && m.autor) ||
      mapaAutores[String(autorId)] ||
      (typeof m.autor === 'object' ? m.autor : { idUsuario: autorId })

    const msgNorm = { ...m, fechaSegura, autor: autorResuelto }

    const ultimo = acc.at(-1)
    if (ultimo?.dia === dia) ultimo.items.push(msgNorm)
    else acc.push({ dia, items: [msgNorm] })
    return acc
  }, [])

  const bajarAlFinal = () =>
    requestAnimationFrame(() => finConversacion.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))

  const abrirEvidencia = async (ev) => {
    try {
      let ruta = ev.rutaArchivo || ev.url || ev.nombreArchivo || ''
      if (ruta && !ruta.startsWith('/uploads/') && !ruta.startsWith('http')) {
        const soloNombre = ruta.split(/[\\/]/).pop()
        ruta = `/uploads/${soloNombre}`
      }
      const res = await axiosClient.get(ruta, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error al abrir evidencia:', error)
      setAviso('No se pudo abrir el archivo adjunto.')
    }
  }

  const asignarTecnico = async () => {
    if (!tecnicoSeleccionado) return
    setAsignando(true)
    try {
      const res = await axiosClient.put(`/api/tickets/${idReal}/asignar/${tecnicoSeleccionado}`)
      const nuevoTec =
        res.data?.tecnico ||
        res.data?.tecnicoAsignado ||
        todosTecnicos.find((t) => String(t.idUsuario) === String(tecnicoSeleccionado))
      const nuevaArea =
        res.data?.area ||
        nuevoTec?.area ||
        areas.find((a) => String(a.idArea || a.id) === String(areaSeleccionada))

      setTecnicoActual(nuevoTec)
      if (nuevaArea) setAreaActual(nuevaArea)
      setAviso(`Ticket asignado a ${nuevoTec?.nombreCompleto || 'técnico'}.`)
    } catch (error) {
      console.error('Error al asignar técnico:', error)
      setAviso('No se pudo asignar el técnico. Revisa los permisos o la consola.')
    } finally {
      setAsignando(false)
    }
  }

  const enviar = async () => {
    if (!texto.trim() && !archivoAdjunto) return
    setSubiendo(true)

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

      const res = await axiosClient.post(`/api/comentarios/ticket/${idReal}`, payload)
      const nuevoMensaje = {
        ...res.data,
        fechaCreacion: res.data?.fechaCreacion || new Date().toISOString(),
        autor: res.data?.autor?.nombreCompleto ? res.data.autor : user,
      }
      setMensajes(prev => [...prev, nuevoMensaje])
      setTexto('')
      setArchivoAdjunto(null)
      if (inputArchivoRef.current) inputArchivoRef.current.value = ''
      bajarAlFinal()
    } catch (error) {
      console.error('Error al guardar comentario o archivo:', error)
      setAviso('Error al enviar el mensaje o adjunto.')
    } finally {
      setSubiendo(false)
    }
  }

  const iniciarSeguimiento = async () => {
    const comentarioInicio = 'El técnico ha iniciado el seguimiento y atención de este oficio.'
    setIniciando(true)
    try {
      await axiosClient.put(`/api/tickets/${idReal}/estado`, null, {
        params: {
          nuevoEstado: 'EN_PROCESO',
          comentario: comentarioInicio,
          idUsuario: user.idUsuario || user.id,
        },
      })

      const payload = {
        texto: comentarioInicio,
        autor: { idUsuario: user.idUsuario || user.id },
      }
      const res = await axiosClient.post(`/api/comentarios/ticket/${idReal}`, payload)
      const nuevoMensaje = {
        ...res.data,
        fechaCreacion: res.data?.fechaCreacion || new Date().toISOString(),
        autor: res.data?.autor?.nombreCompleto ? res.data.autor : user,
      }

      setMensajes((prev) => [...prev, nuevoMensaje])
      setEstado('EN_PROCESO')
      bajarAlFinal()
      setAviso('El ticket ahora está en seguimiento.')
    } catch (error) {
      console.error('Error al iniciar seguimiento:', error)
      setAviso('No se pudo cambiar el estado a En Seguimiento.')
    } finally {
      setIniciando(false)
    }
  }

  const finalizar = async () => {
    const comentarioCierre = 'Ticket finalizado. Se da por concluida la atención de este oficio.'
    try {
      await axiosClient.put(`/api/tickets/${idReal}/estado`, null, {
        params: {
          nuevoEstado: 'RESUELTO',
          comentario: comentarioCierre,
          idUsuario: user.idUsuario || user.id,
        },
      })
      const payload = {
        texto: comentarioCierre,
        autor: { idUsuario: user.idUsuario || user.id }
      }
      const res = await axiosClient.post(`/api/comentarios/ticket/${idReal}`, payload)
      const nuevoMensaje = {
        ...res.data,
        fechaCreacion: res.data?.fechaCreacion || new Date().toISOString(),
        autor: res.data?.autor?.nombreCompleto ? res.data.autor : user,
      }
      setMensajes(prev => [...prev, nuevoMensaje])
      setEstado('RESUELTO')
      if (typeof finalizarOficio === 'function') finalizarOficio(idReal)
      bajarAlFinal()
      setConfirmar(false)
      setAviso('El ticket se marcó como resuelto.')
    } catch (error) {
      console.error('Error al finalizar ticket:', error)
      setAviso('No se pudo finalizar el ticket. Revisa la consola.')
    }
  }

  const fechaCreacionTicket = normalizarFecha(oficio.fechaCreacion)

  return (
    <>
      <nav className="flex items-center gap-2 text-[11px]" aria-label="Ruta">
        <span className="font-bold uppercase tracking-wide text-primary">Mesa de ayuda institucional</span>
        <span className="text-slate-300">•</span>
        <Link to="/oficios" className="text-slate-500 hover:text-primary">Buzón de Oficios</Link>
      </nav>
      <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Seguimiento de Oficio y Chat de Soporte
      </h1>
      <p className="mt-3 text-[15px] text-slate-500">
        Consulte el avance de la solicitud, converse con el área responsable y gestione el expediente digital.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-[150px] rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {folioVisible}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_TONOS[estado] || ESTADO_TONOS.PENDIENTE}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {estado}
              </span>
            </div>
            <h2 className="mt-4 text-xl text-slate-900 sm:text-[22px]">
              Folio {folioVisible}: {oficio.titulo || oficio.asunto}
            </h2>
            <p className="mt-4 text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-line">
              {oficio.descripcion}
            </p>

            {evidencias.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Archivos adjuntos ({evidencias.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {evidencias.map((ev) => (
                    <button
                      key={ev.idEvidencia || ev.id}
                      type="button"
                      onClick={() => abrirEvidencia(ev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      <FileText size={15} className="shrink-0" />
                      <span className="max-w-[220px] truncate">
                        {ev.nombreOriginal || ev.nombreArchivo || 'Ver archivo adjunto'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            </div>

            <div className="px-6 pb-6">
              {grupos.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">Aún no hay mensajes en este ticket. Sé el primero en escribir.</p>
              )}
              {grupos.map((g) => (
                <section key={g.dia}>
                  <div className="flex items-center gap-4 py-5" role="separator">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[11px] text-slate-500">
                      {g.dia === 'sin-fecha' ? 'Sin fecha registrada' : formatFechaLarga(`${g.dia}T00:00:00`)}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <div className="space-y-7">
                    {g.items.map((m) => (
                      <Mensaje key={m.idComentario || m.id || Math.random()} mensaje={m} oficio={oficio} areaActual={areaActual} />
                    ))}
                  </div>
                </section>
              ))}
              <div ref={finConversacion} />
            </div>

            <div className="mx-6 border-t border-line px-0 pb-8 pt-6 sm:px-6">
              {resuelta ? (
                <p role="status" className="flex items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm text-slate-500">
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
                    rows={4}
                    className="mt-4 w-full resize-y rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  {archivoAdjunto && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/25 bg-primary-soft px-3 py-2 text-xs text-primary">
                      <span className="flex items-center gap-2 truncate font-medium">
                        <Paperclip size={14} className="shrink-0" />
                        <span className="truncate">{archivoAdjunto.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setArchivoAdjunto(null)
                          if (inputArchivoRef.current) inputArchivoRef.current.value = ''
                        }}
                        className="ml-2 rounded p-0.5 hover:bg-primary/10"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <input
                        ref={inputArchivoRef}
                        type="file"
                        hidden
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={(e) => setArchivoAdjunto(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => inputArchivoRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Paperclip size={15} /> Adjuntar archivo
                      </button>
                    </div>

                    <button
                      onClick={enviar}
                      disabled={subiendo || (!texto.trim() && !archivoAdjunto)}
                      className="btn-primary px-6 py-2.5 disabled:opacity-50"
                    >
                      {subiendo ? 'Enviando...' : <>Enviar Mensaje <Send size={16} /></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-slate-900">Ficha Técnica</h2>
          <div className="card -mt-1">
            <div className="flex items-center gap-3 border-b border-line px-6 py-5">
              <ClipboardList size={18} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-sm font-semibold text-slate-900">Detalles del Registro</h3>
            </div>
            <dl className="space-y-6 px-6 py-6">
              <Detalle icon={Building} etiqueta="Solicitante" valor={nombreSolicitante} />
              <Detalle icon={Building} etiqueta="Área Asignada" valor={areaResponsable} />
              <Detalle
                icon={UserCheck}
                etiqueta="Técnico Asignado"
                valor={tecnicoActual?.nombreCompleto || 'Sin asignar'}
              />
              <div className="border-t border-line pt-6">
                <Detalle
                  icon={CalendarDays}
                  etiqueta="Fecha de Creación"
                  valor={fechaCreacionTicket ? formatFechaSlash(fechaCreacionTicket) : 'Sin fecha'}
                />
              </div>
            </dl>
          </div>

          {!resuelta && puedeAsignar && (
            <div className="card p-6">
              <div className="flex items-center gap-2.5">
                <UserCheck size={18} strokeWidth={1.75} className="text-primary" />
                <h3 className="text-sm font-semibold text-slate-900">Asignar Área y Técnico</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Elija el área destinataria y al técnico responsable de atender este oficio.
              </p>

              <label className="mt-4 block text-xs font-medium text-slate-600">Área</label>
              <select
                value={areaSeleccionada}
                onChange={(e) => {
                  setAreaSeleccionada(e.target.value)
                  setTecnicoSeleccionado('')
                }}
                className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleccione un área...</option>
                {areas.map((a) => (
                  <option key={a.idArea || a.id} value={a.idArea || a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-medium text-slate-600">Técnico</label>
              <select
                value={tecnicoSeleccionado}
                onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                disabled={!areaSeleccionada}
                className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!areaSeleccionada
                    ? 'Primero seleccione un área...'
                    : tecnicosFiltrados.length === 0
                      ? 'No hay técnicos en esta área'
                      : 'Seleccione un técnico...'}
                </option>
                {tecnicosFiltrados.map((t) => (
                  <option key={t.idUsuario} value={t.idUsuario}>
                    {t.nombreCompleto}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={asignarTecnico}
                disabled={asignando || !tecnicoSeleccionado}
                className="btn-primary mt-4 w-full py-2.5 text-sm disabled:opacity-50"
              >
                {asignando ? 'Asignando...' : tecnicoActual ? 'Reasignar Técnico' : 'Asignar Técnico'}
              </button>
            </div>
          )}

          {resuelta ? (
            <div role="status" className="flex w-full items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm font-semibold text-emerald-700">
              <CircleCheck size={20} strokeWidth={1.75} /> Ticket Finalizado
            </div>
          ) : (
            puedeFinalizar && (
              <div className="space-y-3">
                {esPendiente && (
                  <button
                    type="button"
                    onClick={iniciarSeguimiento}
                    disabled={iniciando}
                    className="flex w-full items-center gap-3 rounded-card border border-amber-300 bg-amber-50 px-5 py-4 text-left text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                  >
                    <PlayCircle size={20} strokeWidth={1.75} />
                    {iniciando ? 'Actualizando...' : 'Iniciar Seguimiento'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmar(true)}
                  className="flex w-full items-center gap-3 rounded-card border border-primary bg-white px-5 py-4 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
                >
                  <CircleCheck size={20} strokeWidth={1.75} /> Finalizar Ticket
                </button>
              </div>
            )
          )}
        </aside>
      </div>

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="¿Finalizar este ticket?" size="sm" footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="btn-primary" onClick={finalizar}>Sí, finalizar</button>
          </>
        }>
        <p className="text-sm text-slate-600">
          El oficio <span className="font-semibold text-slate-900">{folioVisible}</span> se marcará como resuelto y la conversación quedará cerrada.
        </p>
      </Modal>

      {aviso && <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{aviso}</div>}
    </>
  )
}

function Mensaje({ mensaje, oficio, areaActual }) {
  const autor = mensaje.autor || {}

  const esSoporte = autor.idUsuario !== oficio.solicitante?.idUsuario
  const etiqueta = esSoporte ? (areaActual?.nombre || oficio.area?.nombre || 'Soporte Técnico') : 'Solicitante'
  const nombreVisible = autor.nombreCompleto || autor.nombre || 'Sistema'

  const abrirArchivo = async () => {
    try {
      const res = await axiosClient.get(mensaje.archivoUrl, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error al abrir archivo:', error)
    }
  }

  return (
    <article className="flex gap-3">
      <Avatar name={nombreVisible} src={autor.foto} tone={esSoporte ? 'primary' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{nombreVisible}</p>
            <span className={`mt-1.5 inline-block rounded px-2 py-0.5 text-[11px] ${esSoporte ? 'bg-primary-soft text-primary' : 'bg-slate-50 text-slate-500'}`}>
              {etiqueta}
            </span>
          </div>
          <time className="text-[11px] text-slate-500" dateTime={mensaje.fechaSegura || ''}>
            {mensaje.fechaSegura ? formatFechaMensaje(mensaje.fechaSegura) : 'Sin fecha'}
          </time>
        </div>
        <div className={`mt-3 rounded-lg border p-4 text-sm leading-relaxed text-slate-800 ${esSoporte ? 'border-primary/25 bg-primary-soft' : 'border-line bg-slate-50'}`}>
          {mensaje.texto && <p className="whitespace-pre-line">{mensaje.texto}</p>}
          {mensaje.archivoUrl && (
            <button
              type="button"
              onClick={abrirArchivo}
              className={`inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-slate-50 ${mensaje.texto ? 'mt-3' : ''}`}
            >
              <FileText size={15} className="shrink-0" />
              <span className="truncate">{mensaje.archivoNombre || 'Ver archivo adjunto'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
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
      <Link to="/oficios" className="btn-primary mt-6">Volver al Buzón</Link>
    </div>
  )
}