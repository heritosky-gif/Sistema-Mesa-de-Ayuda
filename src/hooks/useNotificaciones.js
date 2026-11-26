import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import axiosClient from '../api/axiosClient'

export const TIPOS_NOTIFICACION = {
  MENSAJE: 'mensaje',
  SOLICITUD: 'solicitud',
  SLA: 'sla',
}

const LIMITES = { solicitud: 10, mensaje: 10, sla: 5 }
const HORA = 36e5

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

const esResuelto = (o) => {
  const e = String(o.estatus || o.estado || '').toUpperCase()
  return ['RESUELTO', 'RESUELTA', 'FINALIZADO', 'CERRADO'].includes(e)
}

const leerStorage = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave) || '[]')
  } catch {
    return []
  }
}

export default function useNotificaciones() {
  const { user, filterOficios } = useAuth()
  const { oficios } = useOficios()

  const userId = user?.idUsuario || user?.id
  const claveStorage = `notificaciones_leidas_${userId}`

  const [leidasLista, setLeidasLista] = useState(() => (userId ? leerStorage(claveStorage) : []))
  const [ultimosMensajes, setUltimosMensajes] = useState({})

  // Sincronizar leídas entre Header y Notificaciones
  useEffect(() => {
    if (!userId) return
    setLeidasLista(leerStorage(claveStorage))

    const sync = () => setLeidasLista(leerStorage(claveStorage))
    window.addEventListener('notificaciones-actualizadas', sync)
    return () => window.removeEventListener('notificaciones-actualizadas', sync)
  }, [userId, claveStorage])

  const visibles = useMemo(() => (user ? filterOficios(oficios) : []), [user, filterOficios, oficios])

  // Cargar el último comentario de los últimos 12 tickets en 1 sola petición
  useEffect(() => {
    if (!userId || visibles.length === 0) return

    let activo = true
    const ids = [...visibles]
      .sort((a, b) => (normalizarFecha(b.fechaCreacion) || '').localeCompare(normalizarFecha(a.fechaCreacion) || ''))
      .slice(0, 12)
      .map((o) => o.idTicket || o.id)
      .filter(Boolean)

    if (ids.length === 0) return

    axiosClient
      .get('/api/notificaciones/ultimos-comentarios', {
        params: { ids: ids.join(',') },
      })
      .then((res) => {
        if (!activo) return
        setUltimosMensajes(res.data || {})
      })
      .catch(() => {
        if (activo) setUltimosMensajes({})
      })

    return () => {
      activo = false
    }
  }, [userId, visibles])

  const notificaciones = useMemo(() => {
    if (!userId) return []
    const ahora = Date.now()

    // Mensajes de seguimiento escritos por otra persona
    const mensajes = visibles
      .map((o) => {
        const idTicket = o.idTicket || o.id
        return { o, m: ultimosMensajes[String(idTicket)] }
      })
      .filter(({ m }) => {
        if (!m) return false
        const autorId = typeof m.autor === 'object' ? (m.autor?.idUsuario || m.autor?.id) : m.autor
        return String(autorId) !== String(userId)
      })
      .map(({ o, m }) => ({
        id: `msg:${m.idComentario || m.id}`,
        tipo: TIPOS_NOTIFICACION.MENSAJE,
        fecha: normalizarFecha(m.fechaCreacion || m.fecha) || new Date().toISOString(),
        oficio: o,
        mensaje: m,
      }))

    // Solicitudes nuevas (últimos 7 días) o resueltas
    const solicitudes = visibles.flatMap((o) => {
      const items = []
      const idTicket = o.idTicket || o.id
      const fechaCreacion = normalizarFecha(o.fechaCreacion) || new Date().toISOString()
      const creacionMs = new Date(fechaCreacion).getTime()
      const solicitanteId = o.solicitante?.idUsuario || o.solicitante?.id || o.creadoPorId

      if (String(solicitanteId) !== String(userId) && ahora - creacionMs <= 7 * 24 * HORA) {
        items.push({
          id: `new:${idTicket}`,
          tipo: TIPOS_NOTIFICACION.SOLICITUD,
          subtipo: 'nueva',
          fecha: fechaCreacion,
          oficio: o,
        })
      }

      if (esResuelto(o)) {
        const fechaCierre = normalizarFecha(o.fechaCierre) || fechaCreacion
        items.push({
          id: `res:${idTicket}`,
          tipo: TIPOS_NOTIFICACION.SOLICITUD,
          subtipo: 'resuelta',
          fecha: fechaCierre,
          oficio: o,
        })
      }
      return items
    })

    // Alertas SLA: tickets abiertos con prioridad ALTA/CRITICA o con más de 24h abiertos
    const sla = visibles
      .filter((o) => !esResuelto(o))
      .map((o) => {
        const fechaCreacion = normalizarFecha(o.fechaCreacion) || new Date().toISOString()
        const creacionMs = new Date(fechaCreacion).getTime()
        const prioridad = String(o.prioridad || '').toUpperCase()
        const horasLimite = prioridad === 'ALTA' || prioridad === 'CRITICA' ? 24 : 48
        const limiteMs = creacionMs + horasLimite * HORA
        const horasRestantes = (limiteMs - ahora) / HORA
        return { o, fechaCreacion, prioridad, horasRestantes }
      })
      .filter(({ prioridad, horasRestantes }) => prioridad === 'ALTA' || prioridad === 'CRITICA' || horasRestantes <= 24)
      .sort((a, b) => a.horasRestantes - b.horasRestantes)
      .map(({ o, fechaCreacion, horasRestantes }) => ({
        id: `sla:${o.idTicket || o.id}`,
        tipo: TIPOS_NOTIFICACION.SLA,
        fecha: fechaCreacion,
        oficio: o,
        horasRestantes,
      }))

    const ordenarRecientes = (lista, limite) =>
      [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limite)

    return [
      ...ordenarRecientes(mensajes, LIMITES.mensaje),
      ...ordenarRecientes(solicitudes, LIMITES.solicitud),
      ...sla.slice(0, LIMITES.sla),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [userId, visibles, ultimosMensajes])

  const leidasSet = useMemo(() => new Set(leidasLista), [leidasLista])
  const conEstado = useMemo(
    () => notificaciones.map((n) => ({ ...n, leida: leidasSet.has(n.id) })),
    [notificaciones, leidasSet]
  )

  const marcarLeidas = useCallback(
    (ids) => {
      if (!userId || !ids?.length) return
      const actuales = new Set(leerStorage(claveStorage))
      ids.forEach((id) => actuales.add(id))
      const nuevaLista = [...actuales]
      localStorage.setItem(claveStorage, JSON.stringify(nuevaLista))
      setLeidasLista(nuevaLista)
      window.dispatchEvent(new Event('notificaciones-actualizadas'))
    },
    [userId, claveStorage]
  )

  return {
    notificaciones: conEstado,
    noLeidas: conEstado.filter((n) => !n.leida).length,
    marcarLeidas,
  }
}