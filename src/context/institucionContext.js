import { createContext, useContext } from 'react'

export const InstitucionContext = createContext(null)

/** Catálogo dinámico de dependencias, áreas y usuarios */
export function useInstitucion() {
  const ctx = useContext(InstitucionContext)
  if (!ctx) throw new Error('useInstitucion debe usarse dentro de <InstitucionProvider>')
  return ctx
}
