import { createContext, useContext } from 'react'

export const OficiosContext = createContext(null)

/** Oficios con los cambios hechos en la demo (respuestas, tickets finalizados) */
export function useOficios() {
  const ctx = useContext(OficiosContext)
  if (!ctx) throw new Error('useOficios debe usarse dentro de <OficiosProvider>')
  return ctx
}
