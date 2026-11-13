import { ROLES } from '../data/mockData'

/**
 * Niveles de acceso que se muestran como tarjetas en los formularios de usuario.
 * Cada uno define el rol de permisos y los niveles jerárquicos que agrupa (el primero es el predeterminado).
 */
export const NIVELES_ACCESO = [
  {
    id: 'directivo',
    titulo: 'Subdirector / Director',
    descripcion: 'Acceso completo global a todas las solicitudes y reportes de la dependencia.',
    rol: ROLES.ADMIN_DEPENDENCIA,
    niveles: ['Director', 'Subdirector'],
  },
  {
    id: 'jefe',
    titulo: 'Jefe de Área / Departamento',
    descripcion: 'Gestión y asignación de tickets dentro de su área específica.',
    rol: ROLES.USUARIO_COMUN,
    niveles: ['Jefe de Área', 'Coordinador'],
  },
  {
    id: 'operativo',
    titulo: 'Analista / Operativo',
    descripcion: 'Atención, seguimiento y respuesta de tickets asignados.',
    rol: ROLES.USUARIO_COMUN,
    niveles: ['Analista / Operativo', 'Enlace / Auxiliar'],
  },
  {
    id: 'estatal',
    titulo: 'Administrador Estatal',
    descripcion: 'Acceso total a todas las dependencias, usuarios y catálogos del sistema.',
    rol: ROLES.SUPER_ADMIN,
    niveles: ['Director General', 'Director'],
  },
]

/** id de la tarjeta de nivel de acceso que corresponde a un usuario */
export function grupoDe(usuario) {
  if (!usuario) return 'directivo'
  if (usuario.rol === ROLES.SUPER_ADMIN) return 'estatal'
  if (usuario.rol === ROLES.ADMIN_DEPENDENCIA) return 'directivo'
  return NIVELES_ACCESO[1].niveles.includes(usuario.nivel) ? 'jefe' : 'operativo'
}

/** Título del nivel de acceso de un usuario ("Analista / Operativo", …) */
export const tituloNivelAcceso = (usuario) => NIVELES_ACCESO.find((g) => g.id === grupoDe(usuario))?.titulo
