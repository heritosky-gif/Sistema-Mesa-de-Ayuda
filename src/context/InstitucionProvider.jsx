import { useCallback, useEffect, useMemo, useState } from 'react'
import { InstitucionContext } from './institucionContext'
import { clave } from '../utils/texto'
import { AREAS_INICIALES, DEPENDENCIAS, FECHA_ACTUAL, usuarios as USUARIOS_INICIALES } from '../data/mockData'

const STORAGE_KEY = 'helpdesk.institucion.v1'

const estadoInicial = () => ({
  dependencias: DEPENDENCIAS.map((d) => ({ ...d, activa: true })),
  areas: AREAS_INICIALES,
  usuarios: USUARIOS_INICIALES,
  bitacora: [],
})

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...estadoInicial(), ...JSON.parse(raw) } : estadoInicial()
  } catch {
    return estadoInicial()
  }
}

const siguienteId = (lista, prefijo) => {
  const max = Math.max(0, ...lista.map((x) => Number(String(x.id).split('-').pop()) || 0))
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`
}

/**
 * Catálogo institucional (dependencias, áreas y usuarios) con altas, ediciones y bajas.
 * Todo lo que se registra aquí aparece automáticamente en los selectores del sistema.
 * Al conectar la API real, este Provider es el único lugar que hay que reemplazar.
 */
export function InstitucionProvider({ children }) {
  const [estado, setEstado] = useState(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
    } catch {
      /* almacenamiento no disponible: los cambios viven solo en memoria */
    }
  }, [estado])

  const { dependencias, areas, usuarios, bitacora } = estado

  // ── Consultas ──
  const getDependencia = useCallback((id) => dependencias.find((d) => d.id === id), [dependencias])
  const getUsuario = useCallback((id) => usuarios.find((u) => u.id === id), [usuarios])
  const areasDe = useCallback(
    (dependenciaId) =>
      areas.filter((a) => a.dependenciaId === dependenciaId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [areas]
  )

  // Cada cambio agrega una entrada a la bitácora
  const aplicar = (actorId, accion, cambio) =>
    setEstado((e) => ({
      ...cambio(e),
      bitacora: [{ id: `log-${e.bitacora.length + 1}`, fecha: new Date().toISOString(), actorId, accion }, ...e.bitacora],
    }))

  // ── Dependencias ──
  const crearDependencia = useCallback(
    (datos, actorId) => {
      const nombre = datos.nombre.trim()
      if (!nombre) return { ok: false, error: 'Escriba el nombre de la dependencia.' }
      if (dependencias.some((d) => clave(d.nombre) === clave(nombre)))
        return { ok: false, error: 'Ya existe una dependencia con ese nombre.' }
      const id = siguienteId(dependencias, 'dep')
      const nueva = {
        id,
        nombre,
        nombreCorto: datos.nombreCorto?.trim() || nombre,
        siglas: datos.siglas?.trim().toUpperCase() || nombre.slice(0, 3).toUpperCase(),
        activa: true,
      }
      aplicar(actorId, `Alta de dependencia: ${nombre}`, (e) => ({ ...e, dependencias: [...e.dependencias, nueva] }))
      return { ok: true, id }
    },
    [dependencias]
  )

  const editarDependencia = useCallback(
    (id, datos, actorId) => {
      const nombre = datos.nombre.trim()
      if (!nombre) return { ok: false, error: 'Escriba el nombre de la dependencia.' }
      if (dependencias.some((d) => d.id !== id && clave(d.nombre) === clave(nombre)))
        return { ok: false, error: 'Ya existe una dependencia con ese nombre.' }
      aplicar(actorId, `Edición de dependencia: ${nombre}`, (e) => ({
        ...e,
        dependencias: e.dependencias.map((d) =>
          d.id === id
            ? {
                ...d,
                nombre,
                nombreCorto: datos.nombreCorto?.trim() || nombre,
                siglas: datos.siglas?.trim().toUpperCase() || d.siglas,
              }
            : d
        ),
      }))
      return { ok: true }
    },
    [dependencias]
  )

  // ── Áreas / departamentos ──
  const crearArea = useCallback(
    (dependenciaId, nombreArea, actorId) => {
      const nombre = nombreArea.trim()
      if (!nombre) return { ok: false, error: 'Escriba el nombre del área.' }
      if (areas.some((a) => a.dependenciaId === dependenciaId && clave(a.nombre) === clave(nombre)))
        return { ok: false, error: 'Esa área ya existe en la dependencia.' }
      const id = siguienteId(areas, 'area')
      const dep = dependencias.find((d) => d.id === dependenciaId)
      aplicar(actorId, `Alta de área: ${nombre} (${dep?.nombreCorto})`, (e) => ({
        ...e,
        areas: [...e.areas, { id, dependenciaId, nombre }],
      }))
      return { ok: true, id, nombre }
    },
    [areas, dependencias]
  )

  const renombrarArea = useCallback(
    (areaId, nombreArea, actorId) => {
      const area = areas.find((a) => a.id === areaId)
      const nombre = nombreArea.trim()
      if (!area) return { ok: false, error: 'El área no existe.' }
      if (!nombre) return { ok: false, error: 'Escriba el nombre del área.' }
      if (areas.some((a) => a.id !== areaId && a.dependenciaId === area.dependenciaId && clave(a.nombre) === clave(nombre)))
        return { ok: false, error: 'Esa área ya existe en la dependencia.' }
      aplicar(actorId, `Área renombrada: ${area.nombre} → ${nombre}`, (e) => ({
        ...e,
        areas: e.areas.map((a) => (a.id === areaId ? { ...a, nombre } : a)),
        // Los usuarios asignados conservan su área con el nombre nuevo
        usuarios: e.usuarios.map((u) =>
          u.dependenciaId === area.dependenciaId && u.area === area.nombre ? { ...u, area: nombre } : u
        ),
      }))
      return { ok: true }
    },
    [areas]
  )

  /** Elimina un área. Si tiene usuarios, se reasignan al área `reasignarA` (nombre) de la misma dependencia. */
  const eliminarArea = useCallback(
    (areaId, actorId, reasignarA = null) => {
      const area = areas.find((a) => a.id === areaId)
      if (!area) return { ok: false, error: 'El área no existe.' }
      const asignados = usuarios.filter((u) => u.dependenciaId === area.dependenciaId && u.area === area.nombre).length
      if (asignados > 0 && !reasignarA)
        return { ok: false, error: 'Elija a qué área se moverán sus usuarios.' }
      const detalle = asignados > 0 ? ` (${asignados} usuario(s) movidos a ${reasignarA})` : ''
      aplicar(actorId, `Baja de área: ${area.nombre}${detalle}`, (e) => ({
        ...e,
        areas: e.areas.filter((a) => a.id !== areaId),
        usuarios: e.usuarios.map((u) =>
          u.dependenciaId === area.dependenciaId && u.area === area.nombre ? { ...u, area: reasignarA } : u
        ),
      }))
      return { ok: true }
    },
    [areas, usuarios]
  )

  /** Eliminación definitiva: solo si la dependencia no tiene usuarios (la vista valida además que no tenga oficios) */
  const eliminarDependencia = useCallback(
    (id, actorId) => {
      const dep = dependencias.find((d) => d.id === id)
      if (!dep) return { ok: false, error: 'La dependencia no existe.' }
      const conUsuarios = usuarios.filter((u) => u.dependenciaId === id).length
      if (conUsuarios > 0)
        return { ok: false, error: `Tiene ${conUsuarios} usuario(s). Dé de baja la dependencia en lugar de eliminarla.` }
      aplicar(actorId, `Eliminación de dependencia: ${dep.nombre}`, (e) => ({
        ...e,
        dependencias: e.dependencias.filter((d) => d.id !== id),
        areas: e.areas.filter((a) => a.dependenciaId !== id),
      }))
      return { ok: true }
    },
    [dependencias, usuarios]
  )

  /** Baja lógica: deja de ofrecerse en los selectores, pero conserva su historial */
  const cambiarEstadoDependencia = useCallback(
    (id, activa, actorId) => {
      const dep = dependencias.find((d) => d.id === id)
      aplicar(actorId, `${activa ? 'Reactivación' : 'Baja'} de dependencia: ${dep?.nombre}`, (e) => ({
        ...e,
        dependencias: e.dependencias.map((d) => (d.id === id ? { ...d, activa } : d)),
      }))
      return { ok: true }
    },
    [dependencias]
  )

  // ── Usuarios ──
  // `nuevaPassword` llega del formulario: se guarda solo la fecha del cambio, nunca la contraseña
  const normalizarDatos = ({ nuevaPassword, ...datos }) =>
    nuevaPassword ? { ...datos, passwordActualizadaEn: new Date().toISOString() } : datos

  const validarCorreo = useCallback(
    (correo, exceptoId) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return 'Escriba un correo válido.'
      if (usuarios.some((u) => u.id !== exceptoId && clave(u.correo) === clave(correo)))
        return 'Ese correo ya está registrado.'
      return null
    },
    [usuarios]
  )

  const crearUsuario = useCallback(
    (datos, actorId) => {
      const error = validarCorreo(datos.correo)
      if (error) return { ok: false, error }
      const id = siguienteId(usuarios, 'u')
      const nuevo = {
        ...normalizarDatos(datos),
        id,
        correo: datos.correo.trim().toLowerCase(),
        activo: true,
        fechaAlta: FECHA_ACTUAL.toISOString().slice(0, 10),
      }
      aplicar(actorId, `Alta de usuario: ${nuevo.nombre}`, (e) => ({ ...e, usuarios: [...e.usuarios, nuevo] }))
      return { ok: true, id }
    },
    [usuarios, validarCorreo]
  )

  const editarUsuario = useCallback(
    (id, datos, actorId) => {
      const error = validarCorreo(datos.correo, id)
      if (error) return { ok: false, error }
      aplicar(actorId, `Edición de usuario: ${datos.nombre}`, (e) => ({
        ...e,
        usuarios: e.usuarios.map((u) =>
          u.id === id ? { ...u, ...normalizarDatos(datos), correo: datos.correo.trim().toLowerCase() } : u
        ),
      }))
      return { ok: true }
    },
    [validarCorreo]
  )

  /**
   * Autoservicio "Mi Perfil": solo nombre, fotografía y contraseña.
   * El rol, la dependencia, el área y el correo los administra la gestión de usuarios.
   */
  const actualizarPerfil = useCallback((id, { nombre, foto, nuevaPassword }) => {
    const limpio = nombre.trim()
    if (limpio.length < 3) return { ok: false, error: 'Escriba su nombre completo.' }
    aplicar(id, 'Actualización de perfil propio', (e) => ({
      ...e,
      usuarios: e.usuarios.map((u) =>
        u.id === id
          ? {
              ...u,
              nombre: limpio,
              foto: foto ?? null,
              ...(nuevaPassword ? { passwordActualizadaEn: new Date().toISOString(), requiereCambioPassword: false } : {}),
            }
          : u
      ),
    }))
    return { ok: true }
  }, [])

  const cambiarEstatus = useCallback(
    (id, activo, actorId) => {
      const usuario = usuarios.find((u) => u.id === id)
      aplicar(actorId, `${activo ? 'Reactivación' : 'Baja'} de cuenta: ${usuario?.nombre}`, (e) => ({
        ...e,
        usuarios: e.usuarios.map((u) => (u.id === id ? { ...u, activo } : u)),
      }))
    },
    [usuarios]
  )

  const hayCambios = bitacora.length > 0
  const restablecer = useCallback(() => setEstado(estadoInicial()), [])

  const value = useMemo(
    () => ({
      dependencias,
      areas,
      usuarios,
      bitacora,
      getDependencia,
      getUsuario,
      areasDe,
      crearDependencia,
      editarDependencia,
      crearArea,
      renombrarArea,
      eliminarArea,
      eliminarDependencia,
      cambiarEstadoDependencia,
      validarCorreo,
      crearUsuario,
      editarUsuario,
      actualizarPerfil,
      cambiarEstatus,
      hayCambios,
      restablecer,
    }),
    [
      dependencias,
      areas,
      usuarios,
      bitacora,
      getDependencia,
      getUsuario,
      areasDe,
      crearDependencia,
      editarDependencia,
      crearArea,
      renombrarArea,
      eliminarArea,
      eliminarDependencia,
      cambiarEstadoDependencia,
      validarCorreo,
      crearUsuario,
      editarUsuario,
      actualizarPerfil,
      cambiarEstatus,
      hayCambios,
      restablecer,
    ]
  )

  return <InstitucionContext.Provider value={value}>{children}</InstitucionContext.Provider>
}
