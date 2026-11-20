const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const pad = (n) => String(n).padStart(2, '0')
const toDate = (v) => (v instanceof Date ? v : new Date(v))

export const mismoDia = (a, b) => {
  const x = toDate(a)
  const y = toDate(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

/** "VIERNES, 09 DE OCTUBRE DE 2026" */
export function formatFechaInstitucional(fecha) {
  const d = toDate(fecha)
  return `${DIAS[d.getDay()]}, ${pad(d.getDate())} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`.toUpperCase()
}

/** "08:45 h" */
export const formatHora = (fecha) => {
  const d = toDate(fecha)
  return `${pad(d.getHours())}:${pad(d.getMinutes())} h`
}

/** "09 de octubre de 2026" */
export const formatFechaLarga = (fecha) => {
  const d = toDate(fecha)
  return `${pad(d.getDate())} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

const mes3 = (d) => MESES[d.getMonth()][0].toUpperCase() + MESES[d.getMonth()].slice(1, 3)

/** "09 de Oct, 10:15 AM" */
export const formatFechaMensaje = (fecha) => {
  const d = toDate(fecha)
  return `${pad(d.getDate())} de ${mes3(d)}, ${formatHora12(d)}`
}

/** "10/Oct/2026" */
export const formatFechaSlash = (fecha) => {
  const d = toDate(fecha)
  return `${pad(d.getDate())}/${mes3(d)}/${d.getFullYear()}`
}

/** "09:14 AM" */
export const formatHora12 = (fecha) => {
  const d = toDate(fecha)
  const h = d.getHours() % 12 || 12
  return `${pad(h)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

/** "09 oct 2026" */
export const formatFechaCorta = (fecha) => {
  const d = toDate(fecha)
  return `${pad(d.getDate())} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

/** "Hoy, 12:00 h" o "12 oct, 10:00 h" */
export function formatFechaRelativa(fecha, hoy = new Date()) {
  const d = toDate(fecha)
  if (mismoDia(d, hoy)) return `Hoy, ${formatHora(d)}`
  return `${pad(d.getDate())} ${MESES[d.getMonth()].slice(0, 3)}, ${formatHora(d)}`
}

/** "Octubre 2026" */
export function formatMesAnio(fecha) {
  const d = toDate(fecha)
  const mes = MESES[d.getMonth()]
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${d.getFullYear()}`
}

/** "2026-10-06" → "06" */
export const diaDelMes = (isoDia) => isoDia.slice(8, 10)

/** "2026-10-06" → "06 oct" */
export const diaCorto = (isoDia) => `${isoDia.slice(8, 10)} ${MESES[Number(isoDia.slice(5, 7)) - 1].slice(0, 3)}`