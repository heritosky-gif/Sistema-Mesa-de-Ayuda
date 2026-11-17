import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from './AuthContext'

export const OficiosContext = createContext(null)

export function OficiosProvider({ children }) {
  const [oficios, setOficios] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  const fetchOficios = useCallback(async () => {
    if (!isAuthenticated) {
      setOficios([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
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

  const crearOficio = useCallback(async (payloadTicket, adjuntos = []) => {
    try {
      
      const response = await axiosClient.post('/api/tickets/crear', payloadTicket);
      const nuevoTicket = response.data; 

      if (adjuntos.length > 0) {
        // Ejecutamos todas las subidas en paralelo
        await Promise.all(adjuntos.map(async (adjunto) => {
          const formData = new FormData();
          formData.append('archivo', adjunto.archivoFisico); 
          
          await axiosClient.post(`/api/tickets/${nuevoTicket.idTicket}/evidencias`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }));
      }

      setOficios((prev) => [...prev, nuevoTicket]);

      return nuevoTicket;
    } catch (error) {
      console.error("Fallo al insertar en PostgreSQL:", error);
      throw error; 
    }
  }, []);

  const getBorrador = useCallback((userId) => {
    const b = localStorage.getItem(`borrador_${userId}`);
    return b ? JSON.parse(b) : null;
  }, [])
  const guardarBorrador = useCallback((userId, datos) => {
    localStorage.setItem(`borrador_${userId}`, JSON.stringify({ form: datos.form, adjuntos: [] }));
  }, [])
  const descartarBorrador = useCallback((userId) => {
    localStorage.removeItem(`borrador_${userId}`);
  }, [])

  const getOficio = useCallback((id) => oficios.find((o) => (o.idTicket || o.id) === id), [oficios])
  const getMensajes = useCallback((id) => [], [])
  const agregarMensaje = useCallback((id, mensaje) => console.log("Pendiente conectar mensajes"), [])
  const finalizarOficio = useCallback((id, msg) => console.log("Pendiente conectar cierre"), [])
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
      siguienteFolio: "Automático", 
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