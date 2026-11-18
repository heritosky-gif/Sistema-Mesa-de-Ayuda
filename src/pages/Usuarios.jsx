import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Building, ChevronDown, CircleCheck, Plus, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import axiosClient from '../api/axiosClient'
import { NIVELES, NIVELES_DIRECTIVOS, PERMISOS_POR_ROL, ROLES, ROLE_LABELS } from '../data/mockData'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import CatalogoModal from '../components/CatalogoModal'
import RutaUsuarios from '../components/RutaUsuarios'
import { puedeAdministrarCatalogo, puedeGestionar } from '../utils/permisosUsuarios'
import { clave } from '../utils/texto'

const POR_PAGINA = 10

const ESTILO_PERMISO = {
  ADMIN: 'bg-primary-soft text-primary',
  INTERMEDIARIO: 'bg-amber-50 text-amber-700',
  TECNICO: 'bg-emerald-50 text-emerald-700',
  SOLICITANTE: 'bg-slate-100 text-slate-600',
}

export default function Usuarios() {
  const { user, filterUsuarios } = useAuth()
  const { dependencias, areas, getDependencia, bitacora, getUsuario } = useInstitucion()
  const location = useLocation()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [area, setArea] = useState('')
  const [rolNivel, setRolNivel] = useState('')
  const [pagina, setPagina] = useState(1)
  const [confirmar, setConfirmar] = useState(null)
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)
  const [bitacoraAbierta, setBitacoraAbierta] = useState(false)


  const [usuariosReales, setUsuariosReales] = useState([])

  useEffect(() => {
    axiosClient.get('/api/usuarios/todos')
      .then(res => setUsuariosReales(res.data))
      .catch(console.error)
  }, [])

  const aviso = location.state?.aviso
  const cerrarAviso = () => navigate(location.pathname, { replace: true, state: null })
  const conReinicio = (setter) => (valor) => {
    setter(valor)
    setPagina(1)
  }

  const visibles = useMemo(() => filterUsuarios(usuariosReales), [filterUsuarios, usuariosReales])
  const esSuper = String(user.rol).toUpperCase() === 'ADMIN'

  const depsFiltro = useMemo(
    () => (esSuper ? dependencias : dependencias.filter((d) => d.id === user.dependenciaId)),
    [esSuper, dependencias, user.dependenciaId]
  )
  
  const dependenciaValida = depsFiltro.some((d) => d.id === dependencia) ? dependencia : ''
  
  const areasFiltro = useMemo(() => {
    const ids = dependenciaValida ? [dependenciaValida] : depsFiltro.map((d) => d.id)
    return depsFiltro
      .filter((d) => ids.includes(d.id))
      .map((d) => ({
        dep: d,
        areas: areas.filter((a) => a.dependenciaId === d.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      }))
      .filter((g) => g.areas.length)
  }, [depsFiltro, dependenciaValida, areas])
  
  const areaValida = areasFiltro.some((g) => g.areas.some((a) => a.id === area)) ? area : ''
  const areaSeleccionada = areas.find((a) => a.id === areaValida)

  const lista = useMemo(() => {
    const q = clave(busqueda)
    const [tipo, valor] = rolNivel.split(':')
    return visibles
      .filter((u) => {
        if (dependenciaValida && u.dependenciaId !== dependenciaValida) return false
        const nombreArea = typeof u.area === 'object' ? u.area?.nombre : u.area
        if (areaSeleccionada && (u.dependenciaId !== areaSeleccionada.dependenciaId || nombreArea !== areaSeleccionada.nombre))
          return false
        if (tipo === 'rol' && u.rol !== valor) return false
        if (tipo === 'nivel' && u.nivel !== valor) return false
        if (!q) return true
        return [(u.nombreCompleto || u.nombre), u.correo, u.rol].some((v) => clave(v || '').includes(q))
      })
      .sort((a, b) => Number(b.activo) - Number(a.activo) || (a.nombreCompleto || a.nombre || '').localeCompare(b.nombreCompleto || b.nombre || ''))
  }, [visibles, busqueda, dependenciaValida, areaSeleccionada, rolNivel])

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const paginaItems = lista.slice(desde, desde + POR_PAGINA)

  const depsVinculadas = new Set(visibles.map((u) => u.dependenciaId))
  const areasVinculadas = areas.filter((a) => depsVinculadas.has(a.dependenciaId)).length
  const activos = visibles.filter((u) => u.activo).length
  const hayFiltros = busqueda || dependenciaValida || areaValida || rolNivel

  const restablecer = () => {
    setBusqueda('')
    setDependencia('')
    setArea('')
    setRolNivel('')
    setPagina(1)
  }

  const confirmarCambio = async () => {
    try {
      const idReal = confirmar.idUsuario || confirmar.id;
      await axiosClient.put(`/api/usuarios/${idReal}/estatus`, { activo: !confirmar.activo });
      // Refrescamos el estatus en la pantalla instantáneamente sin recargar la página
      setUsuariosReales(prev => prev.map(u => (u.idUsuario || u.id) === idReal ? { ...u, activo: !u.activo } : u));
      setConfirmar(null);
    } catch (error) {
      console.error("Error al cambiar estatus:", error);
    }
  }

  return (
    <>
      {aviso && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CircleCheck size={17} className="shrink-0" /> {aviso}
          </span>
          <button onClick={cerrarAviso} className="rounded p-0.5 hover:bg-emerald-100" aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}

      <RutaUsuarios />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
            Gestión de Usuarios y Accesos Institucionales
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Módulo exclusivo de administración para consulta de personal, asignación de dependencias y control de accesos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {puedeAdministrarCatalogo(user) && (
            <button onClick={() => setCatalogoAbierto(true)} className="btn-secondary h-11 px-5 font-semibold">
              <Building size={16} /> Dependencias y Áreas
            </button>
          )}
          <Link to="/usuarios/nuevo" className="btn-primary h-11 px-8 font-semibold">
            <Plus size={16} /> Crear Nuevo Usuario
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <Kpi etiqueta="Total Cuentas Registradas" icon={Users} valor={visibles.length} nota="usuarios en plataforma" />
        <Kpi
          etiqueta="Directores y Subdirectores"
          icon={ShieldCheck}
          valor={visibles.filter((u) => NIVELES_DIRECTIVOS.includes(u.nivel || u.rol)).length}
          nota="con nivel directivo"
        />
        <Kpi
          etiqueta="Dependencias Vinculadas"
          icon={Building}
          valor={depsVinculadas.size}
          nota={`con ${areasVinculadas} áreas y departamentos`}
        />
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Directorio de Usuarios del Sistema</h2>
            <p className="mt-1 text-xs text-slate-500">Consulta y administra las cuentas de las dependencias estatales.</p>
          </div>
          <span className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {activos} activos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-6">
          <label className="relative min-w-[240px] flex-[1.6]">
            <span className="sr-only">Buscar usuario</span>
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => conReinicio(setBusqueda)(e.target.value)}
              placeholder="Buscar por nombre, correo o cargo..."
              className="h-11 w-full rounded-lg border border-line bg-canvas pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {hayFiltros && (
            <button onClick={restablecer} className="text-sm font-medium text-primary hover:text-primary-hover">
              Restablecer
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-y border-line bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-4 py-4 font-semibold">Correo Institucional</th>
                <th className="px-4 py-4 font-semibold">Dependencia y Área</th>
                <th className="px-4 py-4 font-semibold">Rol de Acceso</th>
                <th className="px-4 py-4 font-semibold">Estatus</th>
                <th className="px-6 py-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginaItems.map((u) => {
                const dep = getDependencia(u.dependenciaId || u.area?.dependenciaId)
                const gestionable = String(user?.rol || '').toUpperCase() === 'ADMIN'
                const esYo = (u.idUsuario || u.id) === (user.idUsuario || user.id)
                const nombreMostrar = u.nombreCompleto || u.nombre || 'Sin nombre'
                const rolLimpio = String(u.rol || 'SIN_ROL').toUpperCase()
                
                return (
                  <tr key={u.idUsuario || u.id || Math.random()} className={u.activo ? '' : 'bg-slate-50/50'}>
                    <td className="px-6 py-5">
                      <Avatar name={nombreMostrar} src={u.foto} size="sm" tone={u.activo ? 'primary' : 'neutral'} />
                      <p className="mt-2 font-semibold text-slate-900">
                        {nombreMostrar}
                        {esYo && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(usted)</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{u.puesto || 'Servidor Público'}</p>
                    </td>
                    <td className="px-4 py-5 text-slate-600">{u.correo}</td>
                    <td className="px-4 py-5 leading-relaxed text-slate-500">
                      {dep?.nombreCorto ?? '—'} — {(typeof u.area === 'object' ? u.area?.nombre : u.area) || 'Sin área asignada'}
                    </td>
                    <td className="px-4 py-5">
                      <span className={`inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold ${ESTILO_PERMISO[rolLimpio] || 'bg-slate-100 text-slate-600'}`}>
                        {rolLimpio}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      {u.activo ? (
                        <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold leading-tight text-primary">
                          Inactivo / Dado de Baja
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {gestionable ? (
                        <div className="flex w-36 flex-col gap-2">
                          <Link
                            to={`/usuarios/${u.idUsuario || u.id}/editar`}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-center text-sm font-medium text-primary hover:bg-primary-soft"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => setConfirmar(u)}
                            disabled={esYo}
                            title={esYo ? 'No puede desactivar su propia cuenta' : undefined}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                          >
                            {u.activo ? 'Desactivar Cuenta' : 'Reactivar Cuenta'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin permisos</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {lista.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-700">No se encontraron usuarios</p>
              <p className="mt-1 text-xs text-slate-500">Prueba con otros términos o restablece los filtros.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-5">
          <p className="text-sm text-slate-500">
            {lista.length
              ? `Mostrando ${desde + 1}–${desde + paginaItems.length} de ${lista.length} usuarios registrados`
              : 'Sin resultados'}
          </p>
          <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-6 pb-5 text-[11px] text-slate-500">
          <ShieldCheck size={15} className="text-primary" />
          Las altas, ediciones y bajas de usuario quedan registradas en la bitácora institucional.
          <button onClick={() => setBitacoraAbierta(true)} className="font-semibold text-primary hover:underline">
            Ver bitácora ({bitacora.length})
          </button>
        </div>
      </div>

      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        title={confirmar?.activo ? '¿Desactivar esta cuenta?' : '¿Reactivar esta cuenta?'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={confirmarCambio}>
              {confirmar?.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirmar?.activo ? (
            <>
              <span className="font-semibold text-slate-900">{confirmar?.nombreCompleto || confirmar?.nombre}</span> ya no podrá iniciar sesión. Sus
              oficios e historial se conservan.
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-900">{confirmar?.nombreCompleto || confirmar?.nombre}</span> podrá volver a iniciar sesión con
              su rol actual.
            </>
          )}
        </p>
      </Modal>

      {catalogoAbierto && <CatalogoModal open onClose={() => setCatalogoAbierto(false)} />}

      <Modal open={bitacoraAbierta} onClose={() => setBitacoraAbierta(false)} title="Bitácora institucional" size="lg">
        {bitacora.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Aún no hay movimientos registrados en esta sesión de demo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {bitacora.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="text-slate-800">{b.accion}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Por {getUsuario(b.actorId)?.nombreCompleto ?? 'Sistema'}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400" dateTime={b.fecha}>
                  {new Date(b.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}

function Kpi({ etiqueta, icon: Icon, valor, nota }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-2 text-sm text-slate-600">{etiqueta}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-5 text-[32px] font-bold leading-none tracking-tight text-slate-900">{valor.toLocaleString('es-MX')}</p>
      <p className="mt-3 text-xs text-slate-500">{nota}</p>
    </div>
  )
}

function FiltroSelect({ etiqueta, value, onChange, children }) {
  return (
    <label className="relative flex h-11 min-w-[190px] flex-1 items-center rounded-lg border border-line bg-white pl-3.5 pr-9 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="mr-1 whitespace-nowrap text-slate-500">{etiqueta}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent text-slate-700 focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-500" />
    </label>
  )
}