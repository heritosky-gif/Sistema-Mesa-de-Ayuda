export const NIVELES_ACCESO = [
  {
    id: 'admin',
    titulo: 'Administrador del Sistema',
    descripcion: 'Acceso total a estadísticas, gestión de usuarios, catálogos y configuración global.',
    rol: 'ADMIN',
    niveles: ['Director', 'Coordinador'],
  },
  {
    id: 'jefe_area',
    titulo: 'Jefe de Área',
    descripcion: 'Recibe tickets turnados a su área, los asigna a sus técnicos, puede resolverlos y consulta usuarios y estadísticas de su área.',
    rol: 'JEFE_AREA',
    niveles: ['Jefe de Área', 'Coordinador'],
  },
  {
    id: 'intermediario',
    titulo: 'Mesa de Ayuda (Despachador)',
    descripcion: 'Recepción, gestión y asignación de tickets entrantes a las áreas o jefes correspondientes.',
    rol: 'INTERMEDIARIO',
    niveles: ['Jefe de Departamento', 'Supervisor'],
  },
  {
    id: 'tecnico',
    titulo: 'Soporte Técnico',
    descripcion: 'Atención, seguimiento y resolución de los tickets asignados a su área operativa.',
    rol: 'TECNICO',
    niveles: ['Especialista', 'Analista'],
  },
  {
    id: 'solicitante',
    titulo: 'Usuario Solicitante',
    descripcion: 'Creación de tickets de soporte y seguimiento exclusivo a sus propias solicitudes.',
    rol: 'SOLICITANTE',
    niveles: ['Administrativo', 'Operativo'],
  },
]

export function grupoDe(usuario) {
  if (!usuario?.rol) return 'solicitante'
  const rol = String(usuario.rol).toUpperCase()
  const grupo = NIVELES_ACCESO.find((g) => g.rol === rol)
  return grupo ? grupo.id : 'solicitante'
}

export function tituloNivelAcceso(usuario) {
  if (!usuario?.rol) return 'Usuario'
  const rol = String(usuario.rol).toUpperCase()
  const grupo = NIVELES_ACCESO.find((g) => g.rol === rol)
  return grupo ? grupo.titulo : 'Usuario'
}