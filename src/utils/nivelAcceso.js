export const NIVELES_ACCESO = [
  {
    id: 'admin',
    titulo: 'Administrador del Sistema',
    descripcion: 'Acceso total a estadísticas, gestión de usuarios, catálogos y configuración global.',
    rol: 'ADMIN',
    niveles: ['Director', 'Coordinador'] 
  },
  {
    id: 'intermediario',
    titulo: 'Mesa de Ayuda (Despachador)',
    descripcion: 'Recepción, gestión y asignación de tickets entrantes a las áreas o técnicos correspondientes.',
    rol: 'INTERMEDIARIO',
    niveles: ['Jefe de Departamento', 'Supervisor']
  },
  {
    id: 'tecnico',
    titulo: 'Soporte Técnico',
    descripcion: 'Atención, seguimiento y resolución de los tickets asignados a su área operativa.',
    rol: 'TECNICO',
    niveles: ['Especialista', 'Analista']
  },
  {
    id: 'solicitante',
    titulo: 'Usuario Solicitante',
    descripcion: 'Creación de tickets de soporte y seguimiento exclusivo a sus propias solicitudes.',
    rol: 'SOLICITANTE',
    niveles: ['Administrativo', 'Operativo']
  }
]

export function grupoDe(usuario) {
  if (!usuario || !usuario.rol) return 'solicitante'
  const grupo = NIVELES_ACCESO.find((g) => g.rol === usuario.rol)
  return grupo ? grupo.id : 'solicitante'
}

export function tituloNivelAcceso(usuario) {
  if (!usuario || !usuario.rol) return 'Usuario'
  const grupo = NIVELES_ACCESO.find((g) => g.rol === usuario.rol)
  return grupo ? grupo.titulo : 'Usuario'
}