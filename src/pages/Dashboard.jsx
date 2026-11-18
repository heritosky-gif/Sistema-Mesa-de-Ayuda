import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck, Clock, Ellipsis, Files } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  DIAS_REPORTE,
  FECHA_ACTUAL,
  OBJETIVO_HORAS_RESOLUCION,
} from '../data/mockData'
import { useOficios } from '../context/oficiosContext'
import StatusBadge from '../components/StatusBadge'
import BarChart from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import {
  diaCorto,
  diaDelMes,
  formatFechaInstitucional,
  formatFechaRelativa,
  formatHora,
  formatMesAnio,
} from '../utils/fechas'

const decimal = (n) => n.toFixed(1).replace('.', ',')
const plural = (n, uno, varios) => `${n.toLocaleString('es-MX')} ${n === 1 ? uno : varios}`

const primerNombre = (nombre) => {
  if (!nombre) return 'Usuario';
  return String(nombre).replace(/^(Dr|Dra|Lic|Ing|Mtro|Mtra)\.\s*/i, '').split(' ')[0];
}

const normalizarFecha = (fecha) => {
  if (!fecha) return new Date().toISOString()
  if (typeof fecha === 'string') return fecha
  if (Array.isArray(fecha)) {
    const [y, M, d, h=0, mnt=0, s=0] = fecha
    return new Date(y, M-1, d, h, mnt, s).toISOString()
  }
  return new Date().toISOString()
}

function calcularMetricas(lista) {
  if (!lista || lista.length === 0) {
    return { total: 0, abiertas: 0, resueltas: 0, vencenHoy: 0, volumen: [], horas: [], promedioHoras: null, recientes: [] }
  }

  const esResuelto = (o) => {
    const e = String(o.estatus || o.estado || '').toUpperCase()
    return e === 'RESUELTO' || e === 'FINALIZADO'
  }

  const abiertas = lista.filter((o) => !esResuelto(o))
  const resueltas = lista.filter((o) => esResuelto(o))

  const volumen = DIAS_REPORTE.map((dia) => 
    lista.filter((o) => normalizarFecha(o.fechaCreacion || o.fecha).startsWith(dia)).length
  )

  const horas = DIAS_REPORTE.map((dia) => {
    const delDia = resueltas.filter((o) => normalizarFecha(o.fechaCreacion || o.fecha).startsWith(dia))
    if (delDia.length === 0) return null
    return Math.round((delDia.reduce((s, o) => s + (o.horasResolucion || 24), 0) / delDia.length) * 10) / 10
  })
  
  const conDato = horas.filter((h) => h != null)
  const promedioHoras = conDato.length ? conDato.reduce((s, h) => s + h, 0) / conDato.length : null

  return {
    total: lista.length,
    abiertas: abiertas.length,
    resueltas: resueltas.length,
    vencenHoy: 0, 
    volumen,
    horas,
    promedioHoras,
    recientes: [...lista]
      .sort((a, b) => normalizarFecha(b.fechaCreacion).localeCompare(normalizarFecha(a.fechaCreacion)))
      .slice(0, 4),
  }
}

export default function Dashboard() {
  const { user, filterOficios } = useAuth()
  const navigate = useNavigate()
  const { oficios } = useOficios()
  
  // Procesamos solo los tickets que este rol tiene permitido ver
  const m = useMemo(() => calcularMetricas(filterOficios(oficios)), [filterOficios, oficios])

  // Subtítulo dinámico dependiendo del rol
  const rolUsuario = String(user?.rol || '').toUpperCase()
  const alcance = {
    'ADMIN': 'en todo el sistema',
    'INTERMEDIARIO': 'pendientes por despachar',
    'TECNICO': 'asignadas a tu área',
    'SOLICITANTE': 'creadas por ti',
  }[rolUsuario] || 'en tu bandeja'

  const kpis = [
    { label: 'Total Solicitudes', value: m.total, icon: Files },
    { label: 'En Proceso', value: m.abiertas, icon: Clock },
    { label: 'Resueltas', value: m.resueltas, icon: CircleCheck },
  ]

  const barData = DIAS_REPORTE.map((dia, i) => ({
    key: dia,
    label: diaDelMes(dia),
    value: m.volumen[i] || 0,
    tooltipTitle: diaCorto(dia),
    tooltipValue: plural(m.volumen[i] || 0, 'solicitud', 'solicitudes'),
  }))

  const lineData = DIAS_REPORTE.map((dia, i) => ({
    key: dia,
    label: diaDelMes(dia),
    value: m.horas[i],
    tooltipTitle: diaCorto(dia),
    tooltipValue: m.horas[i] == null ? 'Sin resueltas' : `${decimal(m.horas[i])} h promedio`,
  }))

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Panel de control</h1>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
          Actualizado hoy, {formatHora(FECHA_ACTUAL)}
        </p>
      </div>

      
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-[1.75fr_1fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-card bg-primary p-6 pr-16 text-white sm:col-span-3 xl:col-span-1">
          <div className="absolute inset-y-0 right-0 w-9 bg-primary-hover" aria-hidden="true" />
          <p className="text-[11px] font-semibold tracking-wide text-white/85">
            {formatFechaInstitucional(FECHA_ACTUAL)}
          </p>
          <p className="mt-3 text-lg font-semibold">Hola, {primerNombre(user?.nombreCompleto || user?.nombre_completo || user?.nombre)}</p>
          <p className="mt-0.5 text-sm text-white/75">
            {plural(m.abiertas, 'solicitud abierta', 'solicitudes abiertas')} {alcance}.
          </p>
        </div>

        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-600">{label}</p>
              <Icon size={18} strokeWidth={1.75} className="text-primary" />
            </div>
            <p className="mt-2 text-[32px] leading-tight text-slate-900">{value.toLocaleString('es-MX')}</p>
          </div>
        ))}
      </div>

      
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Volumen de Tickets por Día"
          value={m.total.toLocaleString('es-MX')}
          unit={m.total === 1 ? 'solicitud' : 'solicitudes'}
          legend="Solicitudes recibidas"
          note={formatMesAnio(FECHA_ACTUAL)}
        >
          <BarChart data={barData} ariaLabel="Solicitudes recibidas por día" />
        </ChartCard>

        <ChartCard
          title="Horas de Resolución"
          value={m.promedioHoras == null ? '—' : decimal(m.promedioHoras)}
          unit="h promedio"
          legend="Tiempo de resolución"
          note={`Objetivo: ≤ ${OBJETIVO_HORAS_RESOLUCION} h`}
        >
          <LineChart
            data={lineData}
            objective={OBJETIVO_HORAS_RESOLUCION}
            ariaLabel="Horas promedio de resolución por día"
          />
        </ChartCard>
      </div>

      
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">Solicitudes recientes</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Últimas {m.recientes.length}
            </span>
          </div>
          <Link
            to="/oficios"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Ver buzón <ArrowRight size={15} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="border-y border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Folio / Asunto</th>
                <th className="px-5 py-3 font-semibold">Área</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Recibido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.recientes.map((o) => {
                const idReal = o.idTicket || o.id;
                return (
                  <tr
                    key={idReal}
                    onClick={() => navigate(`/oficios/${idReal}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-primary">#{idReal || o.folio}</p>
                      <p className="mt-0.5 text-sm text-slate-800">{o.titulo || o.asunto}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{o.area?.nombre || 'Sin Área'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge estado={o.estatus || o.estado} />
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {o.fechaCreacion ? formatFechaRelativa(normalizarFecha(o.fechaCreacion)) : 'Sin fecha'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {m.recientes.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No hay solicitudes recientes para mostrar.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, value, unit, legend, note, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Más opciones">
          <Ellipsis size={18} />
        </button>
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] leading-none text-slate-900">{value}</span>
        <span className="text-xs text-slate-500">{unit}</span>
      </p>
      <div className="mt-4">{children}</div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" />
          {legend}
        </span>
        <span>{note}</span>
      </div>
    </div>
  )
}