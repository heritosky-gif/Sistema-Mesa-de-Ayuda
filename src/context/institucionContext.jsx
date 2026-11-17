import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import axiosClient from '../api/axiosClient'
import { useAuth } from './AuthContext'

export const InstitucionContext = createContext(null)

export function InstitucionProvider({ children }) {
  const [areas, setAreas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [dependencias, setDependencias] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  const fetchCatalogos = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true)
      const [resAreas, resUsuarios] = await Promise.all([
        axiosClient.get('/api/areas/todas').catch(() => ({ data: [] })),
        axiosClient.get('/api/usuarios/todos').catch(() => ({ data: [] }))
      ])
      
      setAreas(resAreas.data)
      setUsuarios(resUsuarios.data)
    } catch (error) {
      console.error("Error al cargar catálogos de PostgreSQL:", error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchCatalogos()
  }, [fetchCatalogos])

  const getDependencia = useCallback((id) => dependencias.find((d) => d.id === id), [dependencias])

  const getUsuario = useCallback((id) => usuarios.find((u) => u.idUsuario === id || u.id === id), [usuarios])
  const areasDe = useCallback(() => areas, [areas])
  const aplicarVacio = useCallback(() => ({ ok: false, error: 'Pendiente conectar a Spring Boot' }), [])
  
  const value = useMemo(
    () => ({
      dependencias,
      areas,
      usuarios,
      bitacora: [],
      loading,
      getDependencia,
      getUsuario,
      areasDe,
      crearDependencia: aplicarVacio,
      editarDependencia: aplicarVacio,
      eliminarDependencia: aplicarVacio,
      cambiarEstadoDependencia: aplicarVacio,
      crearArea: aplicarVacio,
      renombrarArea: aplicarVacio,
      eliminarArea: aplicarVacio,
      validarCorreo: () => null,
      crearUsuario: aplicarVacio,
      editarUsuario: aplicarVacio,
      actualizarPerfil: aplicarVacio,
      cambiarEstatus: () => {},
      hayCambios: false,
      restablecer: fetchCatalogos,
    }),
    [dependencias, areas, usuarios, loading, getDependencia, getUsuario, areasDe, aplicarVacio, fetchCatalogos]
  )

  return <InstitucionContext.Provider value={value}>{children}</InstitucionContext.Provider>
}

export function useInstitucion() {
  const ctx = useContext(InstitucionContext)
  if (!ctx) throw new Error('useInstitucion debe usarse dentro de <InstitucionProvider>')
  return ctx
}