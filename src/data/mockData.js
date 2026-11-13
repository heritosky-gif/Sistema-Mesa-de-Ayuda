// ─────────────────────────────────────────────────────────────
// Datos de prueba — reemplazar por llamadas a la API más adelante
// ─────────────────────────────────────────────────────────────

// "Hoy" para la demo: todo el maquetado se calcula respecto a esta fecha
export const FECHA_ACTUAL = new Date('2026-10-09T08:45:00')

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_DEPENDENCIA: 'admin_dependencia',
  USUARIO_COMUN: 'usuario_comun',
}

export const ROLE_LABELS = {
  super_admin: 'Administrador Estatal',
  admin_dependencia: 'Administrador de Dependencia',
  usuario_comun: 'Usuario Operativo',
}

export const DEPENDENCIAS = [
  { id: 'dep-01', nombre: 'Administración Estatal BCSnosUNE', nombreCorto: 'Administración Estatal', siglas: 'ADM' },
  { id: 'dep-02', nombre: 'Secretaría de Finanzas', nombreCorto: 'Finanzas', siglas: 'SFA' },
  { id: 'dep-03', nombre: 'Dirección de Ingresos', nombreCorto: 'Ingresos', siglas: 'DI' },
  { id: 'dep-04', nombre: 'Secretaría de Salud', nombreCorto: 'Salud', siglas: 'SSA' },
  { id: 'dep-05', nombre: 'Secretaría de Educación Pública', nombreCorto: 'Educación', siglas: 'SEP' },
  { id: 'dep-06', nombre: 'Secretaría de Desarrollo Social', nombreCorto: 'Desarrollo Social', siglas: 'SEDESO' },
  { id: 'dep-07', nombre: 'Dirección de Servicios Públicos', nombreCorto: 'Servicios Públicos', siglas: 'DSP' },
  { id: 'dep-08', nombre: 'Secretaría General de Gobierno', nombreCorto: 'Secretaría General', siglas: 'SGG' },
]

export const getDependencia = (id) => DEPENDENCIAS.find((d) => d.id === id)

export const ESTADOS_OFICIO = {
  EN_REVISION: 'en_revision',
  PRIORITARIA: 'prioritaria',
  EN_PROCESO: 'en_proceso',
  RESUELTA: 'resuelta',
}

export const ESTADO_LABELS = {
  en_revision: 'En revisión',
  prioritaria: 'Prioritaria',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
}

export const PRIORIDADES = { ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' }

export const PRIORIDAD_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' }

// Pestañas del Buzón: qué estados agrupa cada una
export const ESTADOS_EN_SEGUIMIENTO = ['en_proceso', 'prioritaria']
export const ESTADOS_PENDIENTES = ['en_revision']

// Meta institucional de tiempo de resolución (horas)
export const OBJETIVO_HORAS_RESOLUCION = 24

// ─── Usuarios ─────────────────────────────────────────────────
// Nivel jerárquico (independiente del rol de permisos del sistema)
export const NIVELES = [
  'Director General',
  'Director',
  'Subdirector',
  'Jefe de Área',
  'Coordinador',
  'Analista / Operativo',
  'Enlace / Auxiliar',
]
export const NIVELES_DIRECTIVOS = ['Director General', 'Director', 'Subdirector']

// Nivel de acceso que otorga cada rol
export const PERMISOS_POR_ROL = {
  super_admin: 'Acceso Completo',
  admin_dependencia: 'Acceso Sectorial',
  usuario_comun: 'Modo Operativo',
}

const u = (id, nombre, correo, puesto, rol, dependenciaId, extra = {}) => ({
  id,
  nombre,
  correo,
  telefono: `612 123 ${4500 + Number(id.slice(2))}`,
  puesto,
  rol,
  dependenciaId,
  activo: true,
  fechaAlta: '2024-02-01',
  ...extra,
})

// Usuarios que participan en los oficios generados (no reordenar: alteraría los datos de prueba)
const usuariosBase = [
  u('u-001', 'María Fernanda López Castro', 'mlopez@bcs.gob.mx', 'Director General', ROLES.SUPER_ADMIN, 'dep-01'),
  u('u-002', 'Jorge Alberto Ruiz Meza', 'jruiz@finanzas.bcs.gob.mx', 'Director de Administración', ROLES.ADMIN_DEPENDENCIA, 'dep-02'),
  u('u-003', 'Ana Sofía Geraldo Amador', 'ageraldo@finanzas.bcs.gob.mx', 'Analista de Presupuesto', ROLES.USUARIO_COMUN, 'dep-02'),
  u('u-004', 'Luis Enrique Cota Higuera', 'lcota@finanzas.bcs.gob.mx', 'Auxiliar Administrativo', ROLES.USUARIO_COMUN, 'dep-02'),
  u('u-005', 'Patricia Murillo Ojeda', 'pmurillo@ingresos.bcs.gob.mx', 'Directora de Ingresos', ROLES.ADMIN_DEPENDENCIA, 'dep-03'),
  u('u-006', 'Ricardo Talamantes Verdugo', 'rtalamantes@ingresos.bcs.gob.mx', 'Jefe de Recaudación', ROLES.USUARIO_COMUN, 'dep-03'),
  u('u-007', 'Dra. Claudia Amador Lucero', 'camador@salud.bcs.gob.mx', 'Directora de Planeación', ROLES.ADMIN_DEPENDENCIA, 'dep-04'),
  u('u-008', 'Héctor Manuel Agúndez Romero', 'hagundez@salud.bcs.gob.mx', 'Coordinador de Sistemas', ROLES.USUARIO_COMUN, 'dep-04', { activo: false }),
  u('u-009', 'Gabriela Osuna Beltrán', 'gosuna@sep.bcs.gob.mx', 'Subdirectora de Recursos Materiales', ROLES.ADMIN_DEPENDENCIA, 'dep-05'),
  u('u-010', 'Fernando Castro Villavicencio', 'fcastro@sedeso.bcs.gob.mx', 'Enlace Administrativo', ROLES.USUARIO_COMUN, 'dep-06'),
  u('u-011', 'Karla Patricia Romero León', 'kromero@sep.bcs.gob.mx', 'Analista de Becas', ROLES.USUARIO_COMUN, 'dep-05'),
  u('u-012', 'Mtro. Óscar Leyva Sández', 'oleyva@sedeso.bcs.gob.mx', 'Director de Programas Sociales', ROLES.ADMIN_DEPENDENCIA, 'dep-06'),
  u('u-013', 'Ing. Raúl Mendoza Arce', 'rmendoza@serviciospublicos.bcs.gob.mx', 'Director de Servicios Públicos', ROLES.ADMIN_DEPENDENCIA, 'dep-07'),
  u('u-014', 'Daniela Cuevas Ortega', 'dcuevas@serviciospublicos.bcs.gob.mx', 'Supervisora de Alumbrado', ROLES.USUARIO_COMUN, 'dep-07'),
  u('u-015', 'Lic. Arturo Peralta Green', 'aperalta@sgg.bcs.gob.mx', 'Secretario Técnico', ROLES.ADMIN_DEPENDENCIA, 'dep-08'),
  u('u-016', 'Mónica Ibarra Sotelo', 'mibarra@sgg.bcs.gob.mx', 'Analista de Correspondencia', ROLES.USUARIO_COMUN, 'dep-08'),
  u('u-017', 'Iván Rosas Marrón', 'irosas@finanzas.bcs.gob.mx', 'Analista de Tesorería', ROLES.USUARIO_COMUN, 'dep-02'),
]

export const getUsuario = (id) => usuarios.find((x) => x.id === id)

// Usuario de demostración que representa a cada rol en el selector del Header
export const DEMO_USERS_BY_ROLE = {
  super_admin: 'u-001',
  admin_dependencia: 'u-002',
  usuario_comun: 'u-003',
}

// ─── Solicitudes / oficios ────────────────────────────────────
// Periodo del reporte del Dashboard
export const DIAS_REPORTE = [
  '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
]

// Totales globales por día (lo que ve el Administrador Estatal):
// 248 solicitudes, 62 abiertas y 186 resueltas, promedio de 22,6 h
const VOLUMEN_DIA = [28, 42, 35, 51, 39, 24, 29]
const ABIERTAS_DIA = [3, 5, 6, 10, 11, 12, 15]
const HORAS_DIA = [28, 25.5, 27, 21, 20, 18, 18.7]

// [asunto, categoría]
const ASUNTOS = {
  'dep-02': [
    ['Revisión presupuestal del cuarto trimestre', 'Revisión presupuestal'],
    ['Validación de adecuación presupuestaria', 'Revisión presupuestal'],
    ['Alta de usuarios en el Sistema de Contabilidad', 'Soporte técnico'],
    ['Conciliación de cuentas bancarias del trimestre', 'Contabilidad'],
    ['Certificación de oficio de asignación', 'Certificación'],
  ],
  'dep-03': [
    ['Actualización del módulo de cobro de predial', 'Soporte técnico'],
    ['Reporte de recaudación mensual', 'Información estadística'],
    ['Actualización de expediente catastral', 'Catastro'],
    ['Solicitud de padrón de contribuyentes', 'Información estadística'],
  ],
  'dep-04': [
    ['Licencias para expediente clínico electrónico', 'Adquisiciones'],
    ['Falla en servidor de laboratorio', 'Soporte técnico'],
    ['Abasto de insumos para centro de salud', 'Adquisiciones'],
    ['Solicitud de estadísticas de vacunación', 'Información estadística'],
  ],
  'dep-05': [
    ['Información sobre becas estatales', 'Información pública'],
    ['Mantenimiento de planteles educativos', 'Mantenimiento'],
    ['Instalación de equipo de videoconferencia', 'Soporte técnico'],
    ['Validación de plantilla docente', 'Recursos humanos'],
  ],
  'dep-06': [
    ['Solicitud de apoyo comunitario', 'Programas sociales'],
    ['Acceso al padrón único de beneficiarios', 'Información pública'],
    ['Entrega de despensas en colonias', 'Programas sociales'],
    ['Formalización de convenio interinstitucional', 'Convenios'],
  ],
  'dep-07': [
    ['Mantenimiento de alumbrado público', 'Mantenimiento'],
    ['Reporte de bacheo en vialidades', 'Mantenimiento'],
    ['Recolección de residuos voluminosos', 'Servicios urbanos'],
    ['Dictamen de uso de suelo institucional', 'Dictamen'],
  ],
  'dep-08': [
    ['Seguimiento a oficio de colaboración', 'Correspondencia'],
    ['Solicitud de audiencia institucional', 'Atención ciudadana'],
    ['Turno de correspondencia oficial', 'Correspondencia'],
    ['Convenio de coordinación municipal', 'Convenios'],
  ],
}

// Sub-áreas internas de cada dependencia
export const SUBAREAS = {
  'dep-01': ['Innovación Tecnológica', 'Soporte Técnico'],
  'dep-02': ['Contaduría', 'Tesorería', 'Presupuesto', 'Contabilidad'],
  'dep-03': ['Recaudación', 'Fiscalización', 'Catastro'],
  'dep-04': ['Planeación', 'Sistemas', 'Hospital General'],
  'dep-05': ['Becas', 'Recursos Materiales', 'Planteles'],
  'dep-06': ['Programas Sociales', 'Atención Ciudadana', 'Contraloría'],
  'dep-07': ['Alumbrado', 'Vialidades', 'Limpia'],
  'dep-08': ['Correspondencia', 'Asuntos Jurídicos', 'Enlace Municipal'],
}

// Las 4 solicitudes más recientes del diseño de Figma
const DESTACADAS = [
  {
    asunto: 'Información sobre becas estatales', categoria: 'Información pública', subarea: 'Becas',
    dependenciaId: 'dep-05', creadoPorId: 'u-011', asignadoAId: 'u-009',
    estado: ESTADOS_OFICIO.RESUELTA, prioridad: PRIORIDADES.MEDIA,
    fechaCreacion: '2026-10-09T08:05:00', fechaLimite: '2026-10-08T16:30:00',
  },
  {
    asunto: 'Seguimiento a oficio de colaboración', categoria: 'Correspondencia', subarea: 'Correspondencia',
    dependenciaId: 'dep-08', creadoPorId: 'u-016', asignadoAId: 'u-015',
    estado: ESTADOS_OFICIO.EN_PROCESO, prioridad: PRIORIDADES.MEDIA,
    fechaCreacion: '2026-10-09T08:15:00', fechaLimite: '2026-10-12T10:00:00',
  },
  {
    asunto: 'Mantenimiento de alumbrado público', categoria: 'Mantenimiento', subarea: 'Alumbrado',
    dependenciaId: 'dep-07', creadoPorId: 'u-014', asignadoAId: 'u-013',
    estado: ESTADOS_OFICIO.PRIORITARIA, prioridad: PRIORIDADES.ALTA,
    fechaCreacion: '2026-10-09T08:25:00', fechaLimite: '2026-10-09T14:00:00',
  },
  {
    asunto: 'Solicitud de apoyo comunitario', categoria: 'Programas sociales', subarea: 'Atención Ciudadana',
    dependenciaId: 'dep-06', creadoPorId: 'u-010', asignadoAId: 'u-012',
    estado: ESTADOS_OFICIO.EN_REVISION, prioridad: PRIORIDADES.ALTA,
    fechaCreacion: '2026-10-09T08:40:00', fechaLimite: '2026-10-09T12:00:00',
  },
]

// Generador pseudoaleatorio con semilla: los datos son siempre los mismos
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n) => String(n).padStart(2, '0')
const toLocalISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
const round1 = (n) => Math.round(n * 10) / 10

// Destinos posibles de oficios entre dependencias (repetidos = más probabilidad)
const DESTINOS_PONDERADOS = [
  'dep-02', 'dep-02', 'dep-02', 'dep-02', 'dep-08', 'dep-08', 'dep-01',
  'dep-03', 'dep-04', 'dep-05', 'dep-06', 'dep-07', 'dep-07',
]

function generarOficios() {
  const rand = mulberry32(2026)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const DEPS_OPERATIVAS = Object.keys(ASUNTOS)
  const lista = []

  DIAS_REPORTE.forEach((dia, d) => {
    const destacadasDia = DESTACADAS.filter((o) => o.fechaCreacion.startsWith(dia))
    const destacadasAbiertas = destacadasDia.filter((o) => o.estado !== ESTADOS_OFICIO.RESUELTA).length
    const total = VOLUMEN_DIA[d] - destacadasDia.length
    const abiertas = ABIERTAS_DIA[d] - destacadasAbiertas

    // Qué índices del día quedan abiertos
    const indices = [...Array(total).keys()].sort(() => rand() - 0.5)
    const abiertasSet = new Set(indices.slice(0, abiertas))

    // Desviaciones en pares (+x, −x) para que el promedio diario sea exacto
    const nResueltas = total - abiertas
    const desviaciones = []
    for (let i = 0; i + 1 < nResueltas; i += 2) {
      const x = round1(1 + rand() * 7)
      desviaciones.push(x, -x)
    }
    if (desviaciones.length < nResueltas) desviaciones.push(0)
    let r = 0

    for (let i = 0; i < total; i++) {
      const dependenciaId = pick(DEPS_OPERATIVAS)
      const equipo = usuariosBase.filter((x) => x.dependenciaId === dependenciaId)
      const creador = pick(equipo)

      // ~30 % de los oficios se dirigen a otra dependencia (Finanzas recibe la mayor carga)
      let dependenciaDestinoId = dependenciaId
      if (rand() < 0.3) {
        const opciones = DESTINOS_PONDERADOS.filter((x) => x !== dependenciaId)
        dependenciaDestinoId = pick(opciones)
      }
      const equipoDestino = usuariosBase.filter((x) => x.dependenciaId === dependenciaDestinoId && x.id !== creador.id)
      const asignado = pick(equipoDestino)

      const creacion = new Date(`${dia}T00:00:00`)
      if (d === DIAS_REPORTE.length - 1) creacion.setHours(7, Math.floor(rand() * 60))
      else creacion.setHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60))

      const abierta = abiertasSet.has(i)
      let estado = ESTADOS_OFICIO.RESUELTA
      if (abierta) {
        const p = rand()
        estado = p < 0.15 ? ESTADOS_OFICIO.PRIORITARIA : p < 0.5 ? ESTADOS_OFICIO.EN_REVISION : ESTADOS_OFICIO.EN_PROCESO
      }

      const limite = new Date(creacion)
      if (estado === ESTADOS_OFICIO.PRIORITARIA) {
        limite.setDate(limite.getDate() + 1)
        limite.setMinutes(0)
      } else {
        limite.setDate(limite.getDate() + 2 + Math.floor(rand() * 5))
        const [h, m] = pick([[10, 0], [12, 0], [14, 0], [16, 30]])
        limite.setHours(h, m)
      }

      const [asunto, categoria] = pick(ASUNTOS[dependenciaId])
      lista.push({
        asunto,
        categoria,
        subarea: pick(SUBAREAS[dependenciaDestinoId]),
        dependenciaId,
        dependenciaDestinoId,
        creadoPorId: creador.id,
        asignadoAId: asignado.id,
        estado,
        prioridad: estado === ESTADOS_OFICIO.PRIORITARIA ? PRIORIDADES.ALTA : pick(Object.values(PRIORIDADES)),
        fechaCreacion: toLocalISO(creacion),
        fechaLimite: toLocalISO(limite),
        horasResolucion: abierta ? null : round1(HORAS_DIA[d] + desviaciones[r++]),
      })
    }

    destacadasDia.forEach((o) =>
      lista.push({
        ...o,
        horasResolucion: o.estado === ESTADOS_OFICIO.RESUELTA ? HORAS_DIA[d] : null,
      })
    )
  })

  return lista
    .sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion))
    .map((o, i) => {
      const num = String(i + 1).padStart(4, '0')
      const historial = [{ fecha: o.fechaCreacion, usuarioId: o.creadoPorId, accion: 'Solicitud creada' }]
      if (o.estado === ESTADOS_OFICIO.RESUELTA) {
        historial.push({ fecha: o.fechaCreacion, usuarioId: o.asignadoAId, accion: 'Solicitud marcada como Resuelta' })
      } else if (o.estado !== ESTADOS_OFICIO.EN_REVISION) {
        historial.push({ fecha: o.fechaCreacion, usuarioId: o.asignadoAId, accion: `Cambio de estado a ${ESTADO_LABELS[o.estado]}` })
      }
      return {
        id: `sol-${num}`,
        folio: `BCS-2026-${num}`,
        descripcion: `${o.asunto}. Solicitud registrada por ${getDependencia(o.dependenciaId).nombre}.`,
        adjuntos: [],
        historial,
        ...o,
      }
    })
}

export const oficios = generarOficios()

export const getOficio = (id) => oficios.find((o) => o.id === id)

// ─── Catálogo completo de usuarios ────────────────────────────
// Área/departamento y nivel jerárquico de los usuarios base
const AREA_Y_NIVEL = {
  'u-001': ['Dirección General', 'Director General'],
  'u-002': ['Dirección Administrativa', 'Director'],
  'u-003': ['Presupuesto', 'Analista / Operativo'],
  'u-004': ['Contabilidad', 'Enlace / Auxiliar'],
  'u-005': ['Recaudación', 'Director'],
  'u-006': ['Recaudación', 'Jefe de Área'],
  'u-007': ['Planeación', 'Director'],
  'u-008': ['Sistemas', 'Coordinador'],
  'u-009': ['Recursos Materiales', 'Subdirector'],
  'u-010': ['Atención Ciudadana', 'Enlace / Auxiliar'],
  'u-011': ['Becas', 'Analista / Operativo'],
  'u-012': ['Programas Sociales', 'Director'],
  'u-013': ['Dirección Operativa', 'Director'],
  'u-014': ['Alumbrado', 'Jefe de Área'],
  'u-015': ['Secretaría Técnica', 'Subdirector'],
  'u-016': ['Correspondencia', 'Analista / Operativo'],
  'u-017': ['Tesorería', 'Analista / Operativo'],
}

// Más personal registrado en la plataforma (no participa en los oficios de prueba)
// [nombre, correo, puesto, rol, dependencia, área, nivel, activo]
const ADICIONALES = [
  ['Lic. Carlos Mendoza Ríos', 'c.mendoza@bcs.gob.mx', 'Subdirector de Innovación', 'admin_dependencia', 'dep-08', 'Asuntos Jurídicos', 'Subdirector', true],
  ['Dra. Elena Rostrova Peña', 'e.rostrova@finanzas.bcs.gob.mx', 'Directora de Contaduría', 'admin_dependencia', 'dep-02', 'Contaduría', 'Director', true],
  ['Ing. Roberto Gómez Lucero', 'r.gomez@sedeso.bcs.gob.mx', 'Analista de Sistemas', 'usuario_comun', 'dep-06', 'Atención Ciudadana', 'Analista / Operativo', false],
  ['Martha Lucía Verdugo Cota', 'mverdugo@finanzas.bcs.gob.mx', 'Jefa de Tesorería', 'usuario_comun', 'dep-02', 'Tesorería', 'Jefe de Área', true],
  ['José Antonio Higuera Sández', 'jhiguera@finanzas.bcs.gob.mx', 'Analista Contable', 'usuario_comun', 'dep-02', 'Contabilidad', 'Analista / Operativo', true],
  ['Lic. Paola Amador Geraldo', 'pamador@ingresos.bcs.gob.mx', 'Subdirectora de Fiscalización', 'admin_dependencia', 'dep-03', 'Fiscalización', 'Subdirector', true],
  ['Ernesto Castro Lucero', 'ecastro@ingresos.bcs.gob.mx', 'Auxiliar de Catastro', 'usuario_comun', 'dep-03', 'Catastro', 'Enlace / Auxiliar', true],
  ['Dr. Manuel Ojeda Romero', 'mojeda@salud.bcs.gob.mx', 'Director del Hospital General', 'admin_dependencia', 'dep-04', 'Hospital General', 'Director', true],
  ['Silvia Talamantes Ruiz', 'stalamantes@salud.bcs.gob.mx', 'Analista de Sistemas', 'usuario_comun', 'dep-04', 'Sistemas', 'Analista / Operativo', true],
  ['Andrea Beltrán Osuna', 'abeltran@sep.bcs.gob.mx', 'Coordinadora de Planteles', 'usuario_comun', 'dep-05', 'Planteles', 'Coordinador', true],
  ['Mtro. Julio César Leyva Mayoral', 'jleyva@sep.bcs.gob.mx', 'Jefe de Becas', 'usuario_comun', 'dep-05', 'Becas', 'Jefe de Área', false],
  ['Rosa Elena Murillo Arce', 'rmurillo@sedeso.bcs.gob.mx', 'Contralora Interna', 'usuario_comun', 'dep-06', 'Contraloría', 'Jefe de Área', true],
  ['Gerardo Peralta Cuevas', 'gperalta@serviciospublicos.bcs.gob.mx', 'Jefe de Vialidades', 'usuario_comun', 'dep-07', 'Vialidades', 'Jefe de Área', true],
  ['Alejandra Ibarra Castro', 'aibarra@serviciospublicos.bcs.gob.mx', 'Supervisora de Limpia', 'usuario_comun', 'dep-07', 'Limpia', 'Coordinador', true],
  ['Lic. Fernanda Sotelo Green', 'fsotelo@sgg.bcs.gob.mx', 'Enlace Municipal', 'usuario_comun', 'dep-08', 'Enlace Municipal', 'Enlace / Auxiliar', true],
  ['Ing. Diego Marrón Rosas', 'dmarron@bcs.gob.mx', 'Subdirector de Innovación Tecnológica', 'admin_dependencia', 'dep-01', 'Innovación Tecnológica', 'Subdirector', true],
  ['Valeria Cota Agúndez', 'vcota@bcs.gob.mx', 'Analista de Soporte Técnico', 'usuario_comun', 'dep-01', 'Soporte Técnico', 'Analista / Operativo', true],
  ['Samuel Romero Villavicencio', 'sromero@bcs.gob.mx', 'Técnico de Soporte', 'usuario_comun', 'dep-01', 'Soporte Técnico', 'Enlace / Auxiliar', true],
  ['Claudia Leyva Higuera', 'cleyva@finanzas.bcs.gob.mx', 'Auxiliar de Presupuesto', 'usuario_comun', 'dep-02', 'Presupuesto', 'Enlace / Auxiliar', false],
  ['Tomás Agúndez Meza', 'tagundez@ingresos.bcs.gob.mx', 'Analista de Recaudación', 'usuario_comun', 'dep-03', 'Recaudación', 'Analista / Operativo', true],
  ['Liliana Osuna Verdugo', 'losuna@salud.bcs.gob.mx', 'Jefa de Planeación', 'usuario_comun', 'dep-04', 'Planeación', 'Jefe de Área', true],
  ['Héctor Geraldo Sández', 'hgeraldo@sedeso.bcs.gob.mx', 'Coordinador de Programas', 'usuario_comun', 'dep-06', 'Programas Sociales', 'Coordinador', true],
  ['Mariana Lucero Peña', 'mlucero@sgg.bcs.gob.mx', 'Analista Jurídica', 'usuario_comun', 'dep-08', 'Asuntos Jurídicos', 'Analista / Operativo', true],
]

export const usuarios = [
  ...usuariosBase.map((x) => ({ ...x, area: AREA_Y_NIVEL[x.id][0], nivel: AREA_Y_NIVEL[x.id][1] })),
  ...ADICIONALES.map(([nombre, correo, puesto, rol, dependenciaId, area, nivel, activo], i) =>
    u(`u-${String(18 + i).padStart(3, '0')}`, nombre, correo, puesto, rol, dependenciaId, {
      area,
      nivel,
      activo,
      fechaAlta: `2025-0${1 + (i % 9)}-15`,
    })
  ),
]

// Áreas que existen en el catálogo aunque no reciban oficios en los datos de prueba
const AREAS_EXTRA = {
  'dep-01': ['Dirección General'],
  'dep-02': ['Dirección Administrativa'],
  'dep-07': ['Dirección Operativa'],
  'dep-08': ['Secretaría Técnica'],
}

/** Catálogo inicial de áreas: [{ id, dependenciaId, nombre }] */
export const AREAS_INICIALES = DEPENDENCIAS.flatMap((d) =>
  [...(AREAS_EXTRA[d.id] ?? []), ...(SUBAREAS[d.id] ?? [])].map((nombre) => ({ dependenciaId: d.id, nombre }))
).map((a, i) => ({ id: `area-${String(i + 1).padStart(3, '0')}`, ...a }))

// ─── Expediente y conversación de cada oficio ────────────────
// Área que recibe y atiende el oficio. `getDep` permite usar el catálogo dinámico.
export const getReceptor = (oficio, getDep = getDependencia) => {
  const area = `Dirección de ${oficio.subarea}`
  // Oficios dirigidos a otra dependencia
  if (oficio.dependenciaDestinoId && oficio.dependenciaDestinoId !== oficio.dependenciaId) {
    return `${getDep(oficio.dependenciaDestinoId)?.nombre ?? 'Dependencia'} - ${area}`
  }
  return area
}

// Dependencia que recibe y atiende el oficio
export const getDestinoId = (oficio) => oficio.dependenciaDestinoId ?? oficio.dependenciaId

// Categorías de trámite disponibles en el formulario
export const CATEGORIAS = [...new Set(Object.values(ASUNTOS).flat().map(([, c]) => c))].sort((a, b) =>
  a.localeCompare(b, 'es')
)

// Responsable que recibe los oficios dirigidos a una dependencia (prefiere cuentas activas y directivas)
export const getResponsable = (dependenciaId, lista = usuarios) => {
  const activos = lista.filter((x) => x.dependenciaId === dependenciaId && x.activo !== false)
  return activos.find((x) => x.rol !== ROLES.USUARIO_COMUN) ?? activos[0] ?? null
}

export const SIGUIENTE_NUMERO_FOLIO = oficios.length + 1
export const formatFolio = (n) => `BCS-2026-${String(n).padStart(4, '0')}`

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('_')

// Mensajes según el avance: en revisión → 1, prioritaria → 2, en proceso → 3, resuelta → 4
const PASOS_POR_ESTADO = { en_revision: 1, prioritaria: 2, en_proceso: 3, resuelta: 4 }
const DESFASES_MIN = [0, 75, 245, 420]

/** Conversación simulada (determinista) de un oficio */
export function getConversacion(oficio) {
  const n = Number(oficio.id.slice(4))
  const rand = mulberry32(n * 97)
  const kb = (min, max) => Math.round((min + rand() * (max - min)) * 1024)
  const emisor = { autorId: oficio.creadoPorId, lado: 'emisor' }
  const receptor = { autorId: oficio.asignadoAId, lado: 'receptor' }

  const plantillas = [
    {
      ...emisor,
      texto: `Se envía el presente oficio para solicitar la atención de: ${oficio.asunto.toLowerCase()}. Se adjunta archivo inicial para su validación.`,
      adjuntos: [{ nombre: `Solicitud_${slug(oficio.categoria)}.pdf`, tipo: 'pdf', bytes: kb(400, 2400) }],
    },
    {
      ...receptor,
      texto:
        'Recibido. Se procedió con la revisión preliminar de los folios anexos. Requerimos que nos confirme si la información adjunta es la versión definitiva para proceder con la firma.',
      adjuntos: [],
    },
    {
      ...emisor,
      texto: 'Confirmado, la información ya fue ajustada. Anexo el desglose actualizado.',
      adjuntos: [{ nombre: `Desglose_${slug(oficio.asunto)}.xlsx`, tipo: 'xlsx', bytes: kb(300, 1200) }],
    },
    {
      ...receptor,
      texto:
        'Se concluye la atención del oficio. Se notifica a la dependencia emisora para los efectos correspondientes.',
      adjuntos: [{ nombre: `Dictamen_${slug(oficio.categoria)}.pdf`, tipo: 'pdf', bytes: kb(200, 900) }],
    },
  ]

  // Horarios: si alguno quedaría en el futuro, se reparten entre la creación y "ahora"
  const inicio = new Date(oficio.fechaCreacion).getTime()
  const pasos = PASOS_POR_ESTADO[oficio.estado] ?? 1
  let tiempos = DESFASES_MIN.slice(0, pasos).map((m) => inicio + m * 60000)
  const ahora = FECHA_ACTUAL.getTime()
  if (tiempos.at(-1) > ahora && pasos > 1) {
    const paso = (ahora - inicio) / pasos
    tiempos = tiempos.map((_, i) => inicio + i * paso)
  }

  return plantillas.slice(0, pasos).map((m, i) => ({
    id: `${oficio.id}-m${i + 1}`,
    fecha: toLocalISO(new Date(tiempos[i])),
    ...m,
  }))
}
