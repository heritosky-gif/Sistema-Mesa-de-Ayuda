import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from './AuthContext'

export const OficiosContext = createContext(null)

export function OficiosProvider({ children }) {
  const [oficios, setOficios] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  // 1. Llamada real a tu Spring Boot
  const fetchOficios = useCallback(async () => {
    if (!isAuthenticated) {
      setOficios([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      // Ajusta la ruta a '/tickets' o '/oficios' según lo hayas llamado en Spring Boot
      const response = await axiosClient.get('/api/tickets/todos') 
      setOficios(response.data)
    } catch (error) {
      console.error("Error al cargar de PostgreSQL:", error)
      setOficios([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchOficios()
  }, [fetchOficios])

  // 2. Funciones de compatibilidad (para que las demás vistas no choquen)
  const getOficio = useCallback((id) => oficios.find((o) => o.id === id), [oficios])
  const getMensajes = useCallback((id) => [], [])
  const agregarMensaje = useCallback((id, mensaje) => console.log("Pendiente conectar mensajes"), [])
  const finalizarOficio = useCallback((id, msg) => console.log("Pendiente conectar cierre"), [])
  const crearOficio = useCallback((datos) => console.log("Pendiente conectar creación", datos), [])
  const getBorrador = useCallback(() => null, [])
  const guardarBorrador = useCallback(() => {}, [])
  const descartarBorrador = useCallback(() => {}, [])
  const getLeidas = useCallback(() => [], [])
  const marcarLeidas = useCallback(() => {}, [])
  
  const value = useMemo(
    () => ({
      oficios,
      loading,
      getOficio,
      getMensajes,
      agregarMensaje,
      finalizarOficio,
      crearOficio,
      siguienteFolio: "0000",
      getBorrador,
      guardarBorrador,
      descartarBorrador,
      getLeidas,
      marcarLeidas,
      hayCambios: false,
      restablecerDemo: fetchOficios,
    }),
    [oficios, loading, getOficio, getMensajes, agregarMensaje, finalizarOficio, crearOficio, getBorrador, guardarBorrador, descartarBorrador, getLeidas, marcarLeidas, fetchOficios]
  )

  return (
    <OficiosContext.Provider value={value}>
      {children}
    </OficiosContext.Provider>
  )
}

export function useOficios() {
  const ctx = useContext(OficiosContext)
  if (!ctx) throw new Error('useOficios debe usarse dentro de <OficiosProvider>')
  return ctx
}