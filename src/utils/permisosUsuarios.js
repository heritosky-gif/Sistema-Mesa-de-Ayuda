import { ROLES } from '../data/mockData'

/** ¿Puede `actor` editar o dar de baja la cuenta de `objetivo`? */
export function puedeGestionar(actor, objetivo) {
  if (!actor || !objetivo) return false
  if (actor.rol === ROLES.SUPER_ADMIN) return true
  if (actor.rol === ROLES.ADMIN_DEPENDENCIA) {
    return objetivo.dependenciaId === actor.dependenciaId && objetivo.rol !== ROLES.SUPER_ADMIN
  }
  return false
}

/** Roles que `actor` puede asignar a otras cuentas */
export function rolesAsignables(actor) {
  if (actor?.rol === ROLES.SUPER_ADMIN) return Object.values(ROLES)
  if (actor?.rol === ROLES.ADMIN_DEPENDENCIA) return [ROLES.ADMIN_DEPENDENCIA, ROLES.USUARIO_COMUN]
  return []
}

/** Solo el Administrador Estatal administra el catálogo de dependencias y áreas */
export const puedeAdministrarCatalogo = (actor) => actor?.rol === ROLES.SUPER_ADMIN
