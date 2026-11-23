import { useEffect, useMemo, useRef, useState } from 'react'
import { Building, ChevronDown, Clock, FileSpreadsheet, Files, Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOficios } from '../context/oficiosContext'
import axiosClient from '../api/axiosClient'
import { OBJETIVO_HORAS_RESOLUCION } from '../data/mockData'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import DonutChart from '../components/charts/DonutChart'
import { CHART_COLORS } from '../components/charts/chartUtils'
import { exportCsv } from '../utils/exportCsv'
import { formatFechaCorta, formatHora } from '../utils/fechas'

const PERIODOS = [
  { value: 'todos', label: 'Todo el historial', dias: null },
  { value: '30', label: 'Últimos 30 días', dias: 30 },
  { value: '7', label: 'Últimos 7 días', dias: 7 },
  { value: '1', label: 'Hoy', dias: 1 },
]

const OPCIONES_URGENCIA = [
  { value: '', label: 'Todos los niveles' },
  { value: 'ALTA', label: 'Alta / Prioritaria' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

const COLORES_ESTATUS = {
  resueltas: '#2F7A5C',
  proceso: CHART_COLORS.primary,
  pendientes: '#D9A22B',
}

const META_CUMPLIMIENTO = 90
const HORA_MS = 36e5

const num = (n) => n.toLocaleString('es-MX')
const dec = (n) => (n == null ? '—' : n.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
const pct = (parte, total) => (total ? (parte / total) * 100 : 0)
const promedio = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

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

const getEstado = (o) => String(o.estatus || o.estado || 'PENDIENTE').toUpperCase()
const esResuelta = (o) => ['RESUELTO', 'RESUELTA', 'FINALIZADO', 'CERRADO'].includes(getEstado(o))
const esEnProceso = (o) => ['EN_PROCESO', 'EN_PROGRESO', 'ASIGNADO', 'EN_ATENCION'].includes(getEstado(o))
const esPendiente = (o) => ['PENDIENTE', 'ABIERTO', 'NUEVO', 'SIN_ASIGNAR'].includes(getEstado(o))

const limiteSlaHoras = (o) => {
  const p = String(o.prioridad || '').toUpperCase()
  return p === 'ALTA' || p === 'CRITICA' ? 24 : 48
}

const calcularHorasResolucion = (o) => {
  const inicio = normalizarFecha(o.fechaCreacion)
  const cierre = normalizarFecha(o.fechaCierre)
  if (!inicio || !cierre) return null
  const diff = (new Date(cierre).getTime() - new Date(inicio).getTime()) / HORA_MS
  return Math.max(0.1, diff)
}

function indicadores(lista) {
  const ahora = Date.now()
  const atendidas = lista.filter(esResuelta)

  const horasLista = atendidas.map(calcularHorasResolucion).filter((h) => h != null)
  const horas = promedio(horasLista)

  const atendidasATiempo = atendidas.filter((o) => {
    const h = calcularHorasResolucion(o)
    return h == null ? true : h <= limiteSlaHoras(o)
  }).length

  const vencidasAbiertas = lista.filter((o) => {
    if (esResuelta(o)) return false
    const inicio = normalizarFecha(o.fechaCreacion)
    if (!inicio) return false
    return (ahora - new Date(inicio).getTime()) / HORA_MS > limiteSlaHoras(o)
  }).length

  const evaluables = atendidas.length + vencidasAbiertas
  const dentroObj = horasLista.length
    ? pct(horasLista.filter((h) => h <= OBJETIVO_HORAS_RESOLUCION).length, horasLista.length)
    : atendidas.length
      ? 100
      : 0

  return {
    recibidos: lista.length,
    atendidos: atendidas.length,
    pendientes: lista.filter(esPendiente).length,
    enProceso: lista.filter(esEnProceso).length,
    horas,
    dias: horas == null ? null : horas / 24,
    cumplimiento: evaluables ? pct(atendidasATiempo, evaluables) : null,
    dentroObjetivo: dentroObj,
  }
}

export default function Estadisticas() {
  const { filterOficios } = useAuth()
  const { oficios } = useOficios()

  const [areasReales, setAreasReales] = useState([])
  const [periodo, setPeriodo] = useState('30')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [urgencia, setUrgencia] = useState('')
  const [estatusActivo, setEstatusActivo] = useState(null)

  useEffect(() => {
    axiosClient
      .get('/api/areas/todas')
      .then((res) => setAreasReales(res.data.filter((a) => a.activo !== false)))
      .catch((err) => console.error('Error al cargar áreas en estadísticas:', err))
  }, [])

  const visibles = useMemo(() => filterOficios(oficios), [filterOficios, oficios])

  const filtrados = useMemo(() => {
    const dias = PERIODOS.find((p) => p.value === periodo)?.dias
    let inicioMs = null
    if (dias != null) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (dias - 1))
      inicioMs = d.getTime()
    }

    return visibles.filter((o) => {
      if (inicioMs != null) {
        const f = normalizarFecha(o.fechaCreacion)
        if (!f || new Date(f).getTime() < inicioMs) return false
      }
      if (urgencia && String(o.prioridad || '').toUpperCase() !== urgencia) return false
      if (areaFiltro) {
        const areaRec = String(o.area?.idArea || o.area?.id || '')
        const areaEmi = String(o.solicitante?.area?.idArea || o.solicitante?.area?.id || '')
        if (areaFiltro === 'SIN_AREA') {
          if (areaRec !== '') return false
        } else if (areaRec !== String(areaFiltro) && areaEmi !== String(areaFiltro)) {
          return false
        }
      }
      return true
    })
  }, [visibles, periodo, urgencia, areaFiltro])

  const r = useMemo(() => {
    const general = indicadores(filtrados)

    // Mapa de áreas reales + opción "Por asignar"
    const mapaAreas = new Map()
    areasReales.forEach((a) => {
      const id = String(a.idArea || a.id)
      mapaAreas.set(id, { id, nombre: a.nombre, nombreCorto: a.nombre.length > 18 ? `${a.nombre.slice(0, 16)}…` : a.nombre })
    })
    filtrados.forEach((o) => {
      if (o.area) {
        const id = String(o.area.idArea || o.area.id)
        if (!mapaAreas.has(id)) {
          mapaAreas.set(id, {
            id,
            nombre: o.area.nombre,
            nombreCorto: o.area.nombre.length > 18 ? `${o.area.nombre.slice(0, 16)}…` : o.area.nombre,
          })
        }
      }
    })

    const filas = [...mapaAreas.values()].map((area) => {
      const recibidosArea = filtrados.filter((o) => String(o.area?.idArea || o.area?.id || '') === area.id)
      const emitidosArea = filtrados.filter((o) => String(o.solicitante?.area?.idArea || o.solicitante?.area?.id || '') === area.id)
      return {
        dep: area,
        emitidos: emitidosArea.length,
        ...indicadores(recibidosArea),
      }
    })

    // Incluir tickets aún sin área asignada
    const sinArea = filtrados.filter((o) => !o.area)
    if (sinArea.length > 0) {
      filas.push({
        dep: { id: 'SIN_AREA', nombre: 'Por asignar (Sin área)', nombreCorto: 'Por asignar' },
        emitidos: 0,
        ...indicadores(sinArea),
      })
    }

    const tabla = filas.filter((f) => f.recibidos > 0).sort((a, b) => b.recibidos - a.recibidos)
    const grafica = filas
      .filter((f) => f.emitidos + f.recibidos > 0)
      .sort((a, b) => b.emitidos + b.recibidos - (a.emitidos + a.recibidos))
      .slice(0, 5)

    return { general, tabla, grafica, mayorCarga: tabla[0] ?? null }
  }, [filtrados, areasReales])

  const { general, tabla, grafica, mayorCarga } = r

  const estatus = [
    { key: 'resueltas', label: 'Resueltas', value: general.atendidos, color: COLORES_ESTATUS.resueltas },
    { key: 'proceso', label: 'En Proceso', value: general.enProceso, color: COLORES_ESTATUS.proceso },
    { key: 'pendientes', label: 'Pendientes', value: general.pendientes, color: COLORES_ESTATUS.pendientes },
  ]

  const ahora = new Date()

  const exportar = () =>
    exportCsv(
      `reporte-desempeno-${ahora.toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Área', value: (f) => f.nombre },
        { header: 'Oficios recibidos', value: (f) => f.recibidos },
        { header: 'Oficios atendidos', value: (f) => f.atendidos },
        { header: 'En proceso', value: (f) => f.enProceso },
        { header: 'Pendientes', value: (f) => f.pendientes },
        { header: 'Promedio de respuesta (días)', value: (f) => (f.dias == null ? '' : f.dias.toFixed(1)) },
        { header: '% Cumplimiento', value: (f) => (f.cumplimiento == null ? '' : f.cumplimiento.toFixed(1)) },
      ],
      [...tabla.map((f) => ({ ...f, nombre: f.dep.nombre })), { ...general, nombre: 'Total institucional' }]
    )

  return (
    <>
      <nav className="flex items-center gap-2 text-[11px]" aria-label="Ruta">
        <span className="font-bold uppercase tracking-wide text-primary">Analítica institucional</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">Estadísticas y Reportes de Desempeño</span>
      </nav>
      <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
        Estadísticas y Reportes de Desempeño
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Análisis cualitativo y cuantitativo del flujo de oficios, carga de trabajo por área y tiempos de respuesta.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Corte al {formatFechaCorta(ahora)} · {formatHora(ahora)}
        </p>
        <div className="flex flex-wrap gap-3 print:hidden">
          <button onClick={() => window.print()} className="btn-secondary h-10 px-6 font-semibold text-slate-900">
            Imprimir Resumen
          </button>
          <MenuExportar onExcel={exportar} onPdf={() => window.print()} />
        </div>
      </div>

      {/* Filtros */}
      <div className="card mt-6 grid gap-4 p-4 sm:grid-cols-3 print:hidden">
        <Filtro
          etiqueta="Periodo"
          value={periodo}
          onChange={setPeriodo}
          opciones={PERIODOS.map((p) => ({ value: p.value, label: p.label }))}
        />
        <Filtro
          etiqueta="Área"
          value={areaFiltro}
          onChange={setAreaFiltro}
          opciones={[
            { value: '', label: 'Todas las áreas' },
            ...areasReales.map((a) => ({ value: String(a.idArea || a.id), label: a.nombre })),
            { value: 'SIN_AREA', label: 'Por asignar (Sin área)' },
          ]}
        />
        <Filtro
          etiqueta="Urgencia"
          value={urgencia}
          onChange={setUrgencia}
          opciones={OPCIONES_URGENCIA}
        />
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi
          etiqueta="Total Solicitudes Registradas"
          icon={Files}
          valor={num(general.recibidos)}
          nota="En el periodo seleccionado"
        />
        <Kpi
          etiqueta="Tiempo Promedio de Respuesta"
          icon={Clock}
          valor={general.dias == null ? '—' : `${dec(general.dias)} días`}
          nota={general.horas == null ? 'Sin solicitudes cerradas con fecha' : `Sobre solicitudes resueltas · ≈ ${dec(general.horas)} h`}
        />
        <Kpi
          etiqueta="Área con Mayor Carga"
          icon={Building}
          valor={mayorCarga?.dep.nombre ?? '—'}
          valorChico
          nota={mayorCarga ? `${num(mayorCarga.recibidos)} solicitudes recibidas` : 'Sin datos en el periodo'}
        />
      </div>

      {/* Gráficas */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Distribución de Solicitudes y Oficios por Área</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Oficios · {grafica.length} áreas con mayor volumen</span>
            <div className="flex gap-4">
              <Leyenda color={CHART_COLORS.primary} texto="Emitidos" />
              <Leyenda color="#CBD5E1" texto="Recibidos" />
            </div>
          </div>
          <div className="mt-4">
            {grafica.length ? (
              <GroupedBarChart
                ariaLabel="Oficios emitidos y recibidos por área"
                series={[
                  { key: 'emitidos', label: 'Emitidos', color: CHART_COLORS.primary, labelColor: CHART_COLORS.primary },
                  { key: 'recibidos', label: 'Recibidos', color: '#CBD5E1' },
                ]}
                data={grafica.map((f) => ({
                  key: f.dep.id,
                  label: f.dep.nombreCorto,
                  values: { emitidos: f.emitidos, recibidos: f.recibidos },
                }))}
              />
            ) : (
              <SinDatos />
            )}
          </div>
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600">Emitidos:</span> oficios creados por personal del área.{' '}
            <span className="font-semibold text-slate-600">Recibidos:</span> oficios asignados al área para su atención.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Estatus General de Solicitudes (SLA)</h2>
          <div className="mt-6 flex justify-center">
            <DonutChart segments={estatus} totalLabel="solicitudes" onHover={setEstatusActivo} />
          </div>
          <ul className="mt-6 divide-y divide-line border-b border-line">
            {estatus.map((s) => (
              <li
                key={s.key}
                className={`grid grid-cols-[1fr_auto_3.25rem] items-center gap-3 py-2.5 text-xs transition-colors ${
                  estatusActivo === s.key ? 'bg-slate-50' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="text-sm font-semibold text-slate-900">{num(s.value)}</span>
                <span className="text-right text-slate-500">{dec(pct(s.value, general.recibidos))}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">SLA institucional</p>
            <p className="mt-1">
              Objetivo de atención: 24 h para prioridad Alta y 48 h para Media/Baja (referencia {OBJETIVO_HORAS_RESOLUCION} h).
              En este periodo, el <span className="font-semibold">{dec(general.cumplimiento ?? 0)}%</span> cumplió su plazo.
            </p>
          </div>
        </div>
      </div>

      {/* Desglose por área */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-5 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Desglose Operativo por Área</h2>
            <p className="mt-1 text-xs text-slate-500">
              Volumen recibido, resolución y oportunidad de atención durante el periodo seleccionado.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {tabla.length} {tabla.length === 1 ? 'área' : 'áreas'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Área</th>
                <th className="px-6 py-3 font-semibold">Oficios<br />Recibidos</th>
                <th className="px-6 py-3 font-semibold">Oficios<br />Atendidos</th>
                <th className="px-6 py-3 font-semibold">Pendientes</th>
                <th className="px-6 py-3 font-semibold">Promedio de<br />Respuesta</th>
                <th className="px-6 py-3 font-semibold">% Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tabla.map((f, i) => (
                <tr key={f.dep.id}>
                  <td className="px-6 py-4">
                    <p className="text-slate-900">{f.dep.nombre}</p>
                    {i === 0 && (
                      <p className="mt-0.5 text-[11px] text-primary">
                        Mayor carga · {dec(pct(f.recibidos, general.recibidos))}% del total
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-900">{num(f.recibidos)}</td>
                  <td className="px-6 py-4 text-slate-900">{num(f.atendidos)}</td>
                  <td className="px-6 py-4 text-slate-500">{num(f.pendientes)}</td>
                  <td className="px-6 py-4 text-slate-700">{f.dias == null ? '—' : `${dec(f.dias)} días`}</td>
                  <td className="px-6 py-4">
                    <BarraCumplimiento valor={f.cumplimiento} />
                  </td>
                </tr>
              ))}
              {tabla.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-6 py-4 text-slate-900">Total institucional</td>
                  <td className="px-6 py-4 text-slate-900">{num(general.recibidos)}</td>
                  <td className="px-6 py-4 text-slate-900">{num(general.atendidos)}</td>
                  <td className="px-6 py-4 text-slate-500">{num(general.pendientes)}</td>
                  <td className="px-6 py-4 text-slate-900">{general.dias == null ? '—' : `${dec(general.dias)} días`}</td>
                  <td className="px-6 py-4">
                    <BarraCumplimiento valor={general.cumplimiento} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {tabla.length === 0 && <SinDatos />}
        </div>
        <p className="border-t border-line px-6 py-4 text-[11px] text-slate-500">
          Fuente: Mesa de Ayuda Institucional · Datos en tiempo real desde PostgreSQL. Meta de cumplimiento: {META_CUMPLIMIENTO}%.
        </p>
      </div>
    </>
  )
}

function Kpi({ etiqueta, icon: Icon, valor, nota, valorChico = false }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-600">{etiqueta}</p>
        <Icon size={16} strokeWidth={1.75} className="shrink-0 text-primary" />
      </div>
      <p
        className={`mt-4 font-semibold tracking-tight text-slate-900 ${
          valorChico ? 'text-[22px] leading-tight' : 'text-[34px] leading-none'
        }`}
      >
        {valor}
      </p>
      <p className="mt-4 text-[11px] text-slate-500">{nota}</p>
    </div>
  )
}

function Filtro({ etiqueta, value, onChange, opciones }) {
  const id = `filtro-${etiqueta.toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-medium text-slate-600">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white pl-3.5 pr-10 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {opciones.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  )
}

function BarraCumplimiento({ valor }) {
  if (valor == null) return <span className="text-xs text-slate-400">—</span>
  const cumple = valor >= META_CUMPLIMIENTO
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full rounded-full ${cumple ? 'bg-[#2F7A5C]' : 'bg-primary'}`}
          style={{ width: `${Math.min(valor, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${cumple ? 'text-[#2F7A5C]' : 'text-primary'}`}>{dec(valor)}%</span>
    </div>
  )
}

function Leyenda({ color, texto }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  )
}

function SinDatos() {
  return <p className="px-6 py-12 text-center text-sm text-slate-500">No hay solicitudes para los filtros seleccionados.</p>
}

function MenuExportar({ onExcel, onPdf }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const cerrar = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const opcion = (fn) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-primary h-10 px-6 font-semibold"
      >
        Exportar Reporte (PDF/Excel)
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden py-1 shadow-lg">
          <button
            role="menuitem"
            onClick={opcion(onExcel)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={16} className="text-emerald-700" />
            Excel (CSV) — desglose por área
          </button>
          <button
            role="menuitem"
            onClick={opcion(onPdf)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer size={16} className="text-primary" />
            PDF — guardar desde impresión
          </button>
        </div>
      )}
    </div>
  )
}