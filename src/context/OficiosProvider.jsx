import { useCallback, useEffect, useMemo, useState } from 'react'
import { OficiosContext } from './oficiosContext'
import {
  ESTADOS_OFICIO,
  FECHA_ACTUAL,
  PRIORIDADES,
  SIGUIENTE_NUMERO_FOLIO,
  formatFolio,
  getConversacion,
  getOficio as getOficioBase,
  oficios as oficiosBase,
} from '../data/mockData'

const STORAGE_KEY = 'helpdesk.oficios.cambios'
const VACIO = { estados: {}, mensajes: {}, nuevos: [], borradores: {}, leidas: {} }

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...VACIO, ...JSON.parse(raw) } : VACIO
  } catch {
    return VACIO
  }
}

const pad = (n) => String(n).padStart(2, '0')
const toLocalISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

// La conversación se genera con el estado ORIGINAL; los mensajes nuevos se agregan encima
const conversacionInicial = (id) => {
  const base = getOficioBase(id)
  return base ? getConversacion(base) : []
}

// Días hábiles de atención según la prioridad elegida
const PLAZO_DIAS = { [PRIORIDADES.ALTA]: 1, [PRIORIDADES.MEDIA]: 3, [PRIORIDADES.BAJA]: 5 }

/**
 * Capa de estado sobre mockData: guarda solo los cambios (estados, mensajes, oficios
 * nuevos y borradores) y los persiste en el navegador. Al conectar la API real,
 * este Provider es el único lugar que hay que reemplazar.
 */
export function OficiosProvider({ children }) {
  const [cambios, setCambios] = useState(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cambios))
    } catch {
      /* almacenamiento no disponible: los cambios viven solo en memoria */
    }
  }, [cambios])

  const oficios = useMemo(
    () =>
      [...oficiosBase, ...cambios.nuevos].map((o) =>
        cambios.estados[o.id] ? { ...o, ...cambios.estados[o.id] } : o
      ),
    [cambios.estados, cambios.nuevos]
  )

  const getOficio = useCallback((id) => oficios.find((o) => o.id === id), [oficios])

  const siguienteFolio = formatFolio(SIGUIENTE_NUMERO_FOLIO + cambios.nuevos.length)

  const getMensajes = useCallback(
    (id) => cambios.mensajes[id] ?? conversacionInicial(id),
    [cambios.mensajes]
  )

  const agregarMensaje = useCallback((id, mensaje) => {
    setCambios((c) => {
      const previos = c.mensajes[id] ?? conversacionInicial(id)
      const nuevo = { id: `${id}-local-${previos.length + 1}`, ...mensaje }
      return { ...c, mensajes: { ...c.mensajes, [id]: [...previos, nuevo] } }
    })
  }, [])

  const finalizarOficio = useCallback(
    (id, mensajeCierre) => {
      setCambios((c) => {
        const o = getOficioBase(id) ?? c.nuevos.find((x) => x.id === id)
        const horas = (FECHA_ACTUAL - new Date(o.fechaCreacion)) / 36e5
        return {
          ...c,
          estados: {
            ...c.estados,
            [id]: { estado: ESTADOS_OFICIO.RESUELTA, horasResolucion: Math.max(0.1, Math.round(horas * 10) / 10) },
          },
        }
      })
      if (mensajeCierre) agregarMensaje(id, mensajeCierre)
    },
    [agregarMensaje]
  )

  /**
   * Registra un oficio nuevo y devuelve { id, folio }.
   * datos: { autor, asignadoAId, dependenciaDestinoId, areaDestino, categoria, prioridad, asunto, descripcion, adjuntos }
   */
  const crearOficio = useCallback(
    (datos) => {
      const numero = SIGUIENTE_NUMERO_FOLIO + cambios.nuevos.length
      const id = `sol-${String(numero).padStart(4, '0')}`
      const folio = formatFolio(numero)

      // Se registra unos minutos después del último oficio, para que aparezca hasta arriba
      const creacion = new Date(FECHA_ACTUAL.getTime() + (cambios.nuevos.length + 1) * 60000)
      const limite = new Date(creacion)
      limite.setDate(limite.getDate() + PLAZO_DIAS[datos.prioridad])
      limite.setHours(14, 0)

      const oficio = {
        id,
        folio,
        asunto: datos.asunto,
        descripcion: datos.descripcion,
        categoria: datos.categoria,
        subarea: datos.areaDestino,
        dependenciaId: datos.autor.dependenciaId,
        dependenciaDestinoId: datos.dependenciaDestinoId,
        creadoPorId: datos.autor.id,
        asignadoAId: datos.asignadoAId ?? datos.autor.id,
        estado: datos.prioridad === PRIORIDADES.ALTA ? ESTADOS_OFICIO.PRIORITARIA : ESTADOS_OFICIO.EN_REVISION,
        prioridad: datos.prioridad,
        fechaCreacion: toLocalISO(creacion),
        fechaLimite: toLocalISO(limite),
        horasResolucion: null,
        adjuntos: datos.adjuntos.map((a) => a.nombre),
        historial: [{ fecha: toLocalISO(creacion), usuarioId: datos.autor.id, accion: 'Oficio emitido' }],
      }
      const primerMensaje = {
        id: `${id}-m1`,
        fecha: oficio.fechaCreacion,
        autorId: datos.autor.id,
        lado: 'emisor',
        texto: datos.descripcion,
        adjuntos: datos.adjuntos.map(({ nombre, tipo, bytes }) => ({ nombre, tipo, bytes })),
      }

      setCambios((c) => {
        const borradores = { ...c.borradores }
        delete borradores[datos.autor.id]
        return {
          ...c,
          nuevos: [...c.nuevos, oficio],
          mensajes: { ...c.mensajes, [id]: [primerMensaje] },
          borradores,
        }
      })
      return { id, folio }
    },
    [cambios.nuevos.length]
  )

  // Un borrador por usuario
  const getBorrador = useCallback((userId) => cambios.borradores[userId] ?? null, [cambios.borradores])
  const guardarBorrador = useCallback(
    (userId, datos) =>
      setCambios((c) => ({
        ...c,
        borradores: { ...c.borradores, [userId]: { ...datos, guardadoEn: new Date().toISOString() } },
      })),
    []
  )
  const descartarBorrador = useCallback(
    (userId) =>
      setCambios((c) => {
        const borradores = { ...c.borradores }
        delete borradores[userId]
        return { ...c, borradores }
      }),
    []
  )

  // Notificaciones leídas: { [userId]: [idNotificación, …] }
  const getLeidas = useCallback((userId) => cambios.leidas[userId] ?? [], [cambios.leidas])
  const marcarLeidas = useCallback(
    (userId, ids) =>
      setCambios((c) => {
        const previas = c.leidas[userId] ?? []
        const nuevas = ids.filter((id) => !previas.includes(id))
        if (!nuevas.length) return c
        return { ...c, leidas: { ...c.leidas, [userId]: [...previas, ...nuevas] } }
      }),
    []
  )

  const hayCambios = Object.values(cambios).some((v) => (Array.isArray(v) ? v.length : Object.keys(v).length) > 0)
  const restablecerDemo = useCallback(() => setCambios(VACIO), [])

  const value = useMemo(
    () => ({
      oficios,
      getOficio,
      getMensajes,
      agregarMensaje,
      finalizarOficio,
      crearOficio,
      siguienteFolio,
      getBorrador,
      guardarBorrador,
      descartarBorrador,
      getLeidas,
      marcarLeidas,
      hayCambios,
      restablecerDemo,
    }),
    [
      oficios,
      getOficio,
      getMensajes,
      agregarMensaje,
      finalizarOficio,
      crearOficio,
      siguienteFolio,
      getBorrador,
      guardarBorrador,
      descartarBorrador,
      getLeidas,
      marcarLeidas,
      hayCambios,
      restablecerDemo,
    ]
  )

  return <OficiosContext.Provider value={value}>{children}</OficiosContext.Provider>
}
