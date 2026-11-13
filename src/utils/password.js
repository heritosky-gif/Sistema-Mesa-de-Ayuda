/** Política de contraseñas: mínimo 8 caracteres, con al menos una letra y un número */
export const validarPassword = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p)

export const REGLA_PASSWORD = 'Mínimo 8 caracteres, con al menos una letra y un número.'
