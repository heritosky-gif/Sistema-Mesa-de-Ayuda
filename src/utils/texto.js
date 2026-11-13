/** Normaliza para comparar o buscar: sin mayúsculas, acentos ni espacios extra */
export const clave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
