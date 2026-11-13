import { useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import { ESTADOS_OFICIO, FECHA_ACTUAL } from '../data/mockData'

export const TIPOS_NOTIFICACION = {
  MENSAJE: 'mensaje',
  SOLICITUD: 'solicitud',
  SLA: 'sla',
}

// Cuántas notificaciones recientes se conservan por tipo (como en el diseño: 5 + 4 + 3)
const LIMITES = { solicitud: 5, mensaje: 4, sla: 3 }

const HORA = 36e5
const iso = (ms) => {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

/**
 * Notificaciones del usuario actual, derivadas de los oficios que su rol puede ver:
 *  - mensaje:   último mensaje de una conversación escrito por otra persona
 *  - solicitud: oficio nuevo recibido (24 h) o resuelto recientemente (48 h)
 *  - sla:       oficio abierto que vence en menos de 24 h o que ya venció
 */
export default function useNotificaciones() {
  const { user, filterOficios } = useAuth()
  const { oficios, getMensajes, getLeidas, marcarLeidas } = useOficios()

  const notificaciones = useMemo(() => {
    if (!user) return []
    const ahora = FECHA_ACTUAL.getTime()
    const visibles = filterOficios(oficios)

    const mensajes = visibles
      .map((o) => ({ o, m: getMensajes(o.id).at(-1) }))
      .filter(({ m }) => m && m.autorId !== user.id)
      .map(({ o, m }) => ({
        id: `msg:${m.id}`,
        tipo: TIPOS_NOTIFICACION.MENSAJE,
        fecha: m.fecha,
        oficio: o,
        mensaje: m,
      }))

    const solicitudes = visibles.flatMap((o) => {
      const items = []
      const creacion = new Date(o.fechaCreacion).getTime()
      if (o.creadoPorId !== user.id && ahora - creacion <= 24 * HORA) {
        items.push({ id: `new:${o.id}`, tipo: TIPOS_NOTIFICACION.SOLICITUD, subtipo: 'nueva', fecha: o.fechaCreacion, oficio: o })
      }
      if (o.estado === ESTADOS_OFICIO.RESUELTA && o.horasResolucion != null) {
        const resuelta = Math.min(creacion + o.horasResolucion * HORA, ahora)
        if (ahora - resuelta <= 48 * HORA) {
          items.push({ id: `res:${o.id}`, tipo: TIPOS_NOTIFICACION.SOLICITUD, subtipo: 'resuelta', fecha: iso(resuelta), oficio: o })
        }
      }
      return items
    })

    const sla = visibles
      .filter((o) => o.estado !== ESTADOS_OFICIO.RESUELTA)
      .map((o) => ({ o, limite: new Date(o.fechaLimite).getTime() }))
      .filter(({ limite }) => limite - ahora <= 24 * HORA && ahora - limite <= 48 * HORA)
      .sort((a, b) => a.limite - b.limite)
      .map(({ o, limite }) => ({
        id: `sla:${o.id}`,
        tipo: TIPOS_NOTIFICACION.SLA,
        // La alerta se emite 24 h antes del límite (o al crearse el oficio, si fue después)
        fecha: iso(Math.min(Math.max(limite - 24 * HORA, new Date(o.fechaCreacion).getTime()), ahora)),
        oficio: o,
        horasRestantes: (limite - ahora) / HORA,
      }))

    const recientes = (lista, n) => [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, n)

    return [
      ...recientes(mensajes, LIMITES.mensaje),
      ...recientes(solicitudes, LIMITES.solicitud),
      ...sla.slice(0, LIMITES.sla),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [user, filterOficios, oficios, getMensajes])

  const leidas = useMemo(() => new Set(user ? getLeidas(user.id) : []), [user, getLeidas])
  const conEstado = useMemo(() => notificaciones.map((n) => ({ ...n, leida: leidas.has(n.id) })), [notificaciones, leidas])

  const marcar = useCallback((ids) => user && marcarLeidas(user.id, ids), [user, marcarLeidas])

  return {
    notificaciones: conEstado,
    noLeidas: conEstado.filter((n) => !n.leida).length,
    marcarLeidas: marcar,
  }
}
