import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Download,
  House,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  ESTADO_LABELS,
  PRIORIDAD_LABELS,
  PRIORIDADES,
} from '../data/mockData'
import { useOficios } from '../context/oficiosContext'
import { useInstitucion } from '../context/institucionContext'
import PriorityBadge from '../components/PriorityBadge'
import Pagination from '../components/Pagination'
import { formatFechaCorta, formatHora12 } from '../utils/fechas'
import { exportCsv } from '../utils/exportCsv'

const POR_PAGINA = 6

const getEstado = (o) => String(o.estatus || o.estado || 'PENDIENTE').toUpperCase()

const esResuelta = (o) => ['RESUELTO', 'RESUELTA', 'FINALIZADO', 'CERRADO'].includes(getEstado(o))

const TABS = [
  { id: 'todas', label: 'Todas las solicitudes', match: () => true },
  {
    id: 'seguimiento',
    label: 'En seguimiento',
    match: (o) => ['EN_PROCESO', 'EN_PROGRESO', 'ASIGNADO', 'EN_ATENCION'].includes(getEstado(o)),
  },
  {
    id: 'pendientes',
    label: 'Pendientes',
    match: (o) => ['PENDIENTE', 'ABIERTO', 'NUEVO', 'SIN_ASIGNAR'].includes(getEstado(o)),
  },
  { id: 'resueltas', label: 'Resueltas', match: esResuelta },
]

const nombreCategoria = (o) =>
  typeof o.categoria === 'object'
    ? o.categoria?.nombre || 'Sin categoría'
    : o.categoriaString || o.categoria || 'Sin categoría'

const normalizarFecha = (fecha) => {
  if (!fecha) return null
  if (typeof fecha === 'string') return fecha
  if (typeof fecha === 'number') return new Date(fecha).toISOString()
  if (Array.isArray(fecha)) {
    const [y, M, d, h = 0, mnt = 0, s = 0] = fecha
    return new Date(y, M - 1, d, h, mnt, s).toISOString()
  }
  return null
}

// Búsqueda sin distinguir mayúsculas ni acentos
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export default function BuzonOficios() {
  const { filterOficios, can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const creado = location.state?.creado
  const cerrarAviso = () => navigate(location.pathname, { replace: true, state: null })

  const [busqueda, setBusqueda] = useState('')
  const [areaSeleccionada, setAreaSeleccionada] = useState('')
  const [urgencia, setUrgencia] = useState('')
  const [tab, setTab] = useState('todas')
  const [orden, setOrden] = useState('desc')
  const [pagina, setPagina] = useState(1)

  const conReinicio = (setter) => (valor) => {
    setter(valor)
    setPagina(1)
  }

  const { oficios } = useOficios()
  const { areas } = useInstitucion()
  const visibles = useMemo(() => filterOficios(oficios), [filterOficios, oficios])

  const areasDisponibles = useMemo(() => {
    const ids = new Set(visibles.map((o) => o.area?.idArea || o.area || o.dependenciaId))
    return areas.filter((a) => ids.has(a.idArea || a.id))
  }, [visibles, areas])

  const areaValida = areasDisponibles.some((a) => (a.idArea || a.id) == areaSeleccionada) ? areaSeleccionada : ''

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return visibles.filter((o) => {
      const areaId = o.area?.idArea || o.area || o.dependenciaId
      if (areaValida && areaId != areaValida) return false
      if (urgencia && String(o.prioridad || '').toLowerCase() !== String(urgencia).toLowerCase()) return false
      if (!q) return true

      const areaObj = areas.find((a) => (a.idArea || a.id) == areaId)
      return [o.folio, o.idTicket, o.titulo || o.asunto, nombreCategoria(o), o.area?.nombre || areaObj?.nombre].some((v) =>
        normalizar(v).includes(q)
      )
    })
  }, [visibles, busqueda, areaValida, urgencia, areas])

  const conteos = Object.fromEntries(TABS.map((t) => [t.id, filtrados.filter(t.match).length]))

  const lista = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)
    return filtrados
      .filter(t.match)
      .sort((a, b) => {
        const fechaA = normalizarFecha(a.fechaCreacion) || ''
        const fechaB = normalizarFecha(b.fechaCreacion) || ''
        return (
          esResuelta(a) - esResuelta(b) ||
          (orden === 'desc'
            ? String(fechaB).localeCompare(String(fechaA))
            : String(fechaA).localeCompare(String(fechaB)))
        )
      })
  }, [filtrados, tab, orden])

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const paginaItems = lista.slice(desde, desde + POR_PAGINA)

  const hayFiltros = busqueda || areaValida || urgencia || tab !== 'todas'
  const restablecer = () => {
    setBusqueda('')
    setAreaSeleccionada('')
    setUrgencia('')
    setTab('todas')
    setOrden('desc')
    setPagina(1)
  }

  const exportar = () => {
    const hoy = new Date()
    exportCsv(
      `buzon-oficios-${hoy.toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Folio', value: (o) => o.folio || `#${o.idTicket || o.id}` },
        { header: 'Categoría', value: (o) => nombreCategoria(o) },
        { header: 'Asunto', value: (o) => o.titulo || o.asunto || '' },
        { header: 'Solicitante', value: (o) => o.solicitante?.nombreCompleto || o.solicitante?.nombre || 'Usuario' },
        { header: 'Área', value: (o) => o.area?.nombre || 'Por asignar' },
        { header: 'Responsable', value: (o) => o.tecnico?.nombreCompleto || o.tecnicoAsignado?.nombreCompleto || 'Sin asignar' },
        {
          header: 'Recibida',
          value: (o) => {
            const f = normalizarFecha(o.fechaCreacion)
            return f ? `${formatFechaCorta(f)} ${formatHora12(f)}` : 'Sin fecha'
          },
        },
        { header: 'Prioridad', value: (o) => PRIORIDAD_LABELS[String(o.prioridad || '').toLowerCase()] || o.prioridad || '' },
        { header: 'Estado', value: (o) => ESTADO_LABELS[String(o.estatus || o.estado || '').toLowerCase()] || getEstado(o) },
      ],
      lista
    )
  }

  return (
    <>
      <div className="-mx-4 -mt-6 mb-5 border-b border-line bg-surface px-4 py-6 sm:-mx-7 sm:px-7">
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          <label className="relative min-w-[240px] flex-1 lg:max-w-[530px]">
            <span className="sr-only">Buscar</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => conReinicio(setBusqueda)(e.target.value)}
              placeholder="Buscar por folio, asunto o área"
              className="h-11 w-full rounded-lg border border-line bg-canvas pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <span className="hidden text-sm text-slate-500 xl:inline">Filtrar por</span>

          <FilterSelect
            label="Área"
            value={areaValida}
            onChange={conReinicio(setAreaSeleccionada)}
            options={[
              { value: '', label: 'Todas las áreas' },
              ...areasDisponibles.map((a) => ({ value: a.idArea || a.id, label: a.nombre })),
            ]}
          />
          <FilterSelect
            label="Urgencia"
            value={urgencia}
            onChange={conReinicio(setUrgencia)}
            options={[
              { value: '', label: 'Todos los niveles' },
              ...Object.values(PRIORIDADES).map((p) => ({ value: p, label: PRIORIDAD_LABELS[p] })),
            ]}
          />

          <button
            onClick={restablecer}
            disabled={!hayFiltros}
            className="ml-auto rounded-md px-1 text-sm font-medium text-primary hover:text-primary-hover disabled:cursor-default disabled:opacity-50"
          >
            Restablecer
          </button>
        </div>
      </div>

      {creado && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CircleCheck size={17} className="shrink-0" />
            El oficio <span className="font-semibold">{creado.folio || `#${creado.idTicket || creado.id}`}</span> se emitió y envió correctamente.
          </span>
          <div className="flex items-center gap-4">
            <Link to={`/oficios/${creado.idTicket || creado.id}`} className="font-semibold hover:underline">
              Ver seguimiento
            </Link>
            <button onClick={cerrarAviso} className="rounded p-0.5 hover:bg-emerald-100" aria-label="Cerrar aviso">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Ruta">
        <House size={15} strokeWidth={1.75} />
        <span>Gestión institucional</span>
        <ChevronRight size={14} />
        <span className="font-medium text-primary">Buzón</span>
      </nav>

      <div className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900">Buzón de Oficios</h1>
        <div className="flex flex-wrap items-center gap-5">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw size={14} />
            Actualizado hoy, {formatHora12(new Date())}
          </p>
          {can('crear_oficio') && (
            <Link to="/oficios/nuevo" className="btn-primary">
              <Plus size={16} /> Nuevo oficio
            </Link>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-6 border-b border-line px-6">
          <div role="tablist" className="-mb-px flex gap-7 overflow-x-auto">
            {TABS.map((t) => {
              const activa = tab === t.id
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activa}
                  onClick={() => conReinicio(setTab)(t.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-5 text-sm transition-colors ${
                    activa
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                  {activa ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold">
                      {conteos[t.id]}
                    </span>
                  ) : (
                    <span>· {conteos[t.id]}</span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            onClick={exportar}
            disabled={lista.length === 0}
            className="flex items-center gap-2 py-4 text-sm text-slate-600 hover:text-primary disabled:opacity-40"
          >
            <Download size={16} strokeWidth={1.75} />
            Exportar listado
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Folio</th>
                <th className="px-6 py-4 font-semibold">Categoría / Asunto</th>
                <th className="px-6 py-4 font-semibold">Área Asignada</th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))}
                    className="inline-flex items-center gap-1 uppercase hover:text-slate-900"
                    aria-label={`Ordenar por fecha ${orden === 'desc' ? 'ascendente' : 'descendente'}`}
                  >
                    Recibida {orden === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">Prioridad</th>
                <th className="px-6 py-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginaItems.map((o) => {
                const uniqueKey = o.idTicket || o.id || Math.random()
                const fechaNorm = normalizarFecha(o.fechaCreacion)

                return (
                  <tr key={uniqueKey} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-5">
                      <span className="inline-block whitespace-nowrap rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {o.folio || `#${o.idTicket || o.id}`}
                      </span>
                      {esResuelta(o) && (
                        <span className="mt-2 flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
                          <CircleCheck size={12} strokeWidth={2} /> Resuelta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[11px] text-slate-500">{nombreCategoria(o)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{o.titulo || o.asunto}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-800">{o.area?.nombre || 'Por asignar'}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5">
                      <p className="text-sm text-slate-800">{fechaNorm ? formatHora12(fechaNorm) : '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{fechaNorm ? formatFechaCorta(fechaNorm) : 'Sin fecha'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <PriorityBadge prioridad={o.prioridad} />
                    </td>
                    <td className="px-6 py-5">
                      <Link
                        to={`/oficios/${uniqueKey}`}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-primary-soft"
                      >
                        Ver Seguimiento <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {lista.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-700">No se encontraron solicitudes</p>
              <p className="mt-1 text-xs text-slate-500">Prueba con otros términos o restablece los filtros.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
          <p className="text-sm text-slate-500">
            {lista.length === 0
              ? 'Sin resultados'
              : `Mostrando ${desde + 1}–${desde + paginaItems.length} de ${lista.length} solicitudes`}
          </p>
          <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
        </div>
      </div>
    </>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="relative flex h-11 min-w-[200px] items-center rounded-lg border border-line bg-white pl-4 pr-10 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 lg:min-w-[245px]">
      <span className="mr-1.5 text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none bg-transparent font-medium text-slate-900 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-500" />
    </label>
  )
}