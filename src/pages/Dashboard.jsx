import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck, Clock, Ellipsis, Files } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  DIAS_REPORTE,
  ESTADOS_OFICIO,
  FECHA_ACTUAL,
  OBJETIVO_HORAS_RESOLUCION,
  ROLES,
} from '../data/mockData'
import { useOficios } from '../context/oficiosContext'
import { useInstitucion } from '../context/institucionContext'
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
  mismoDia,
} from '../utils/fechas'

const decimal = (n) => n.toFixed(1).replace('.', ',')
const plural = (n, uno, varios) => `${n.toLocaleString('es-MX')} ${n === 1 ? uno : varios}`

// CORRECCIÓN: Función segura para evitar que crashee si el nombre es indefinido
const primerNombre = (nombre) => {
  if (!nombre) return 'Usuario';
  return String(nombre).replace(/^(Dr|Dra|Lic|Ing|Mtro|Mtra)\.\s*/i, '').split(' ')[0];
}

// Cálculo de indicadores a partir de las solicitudes visibles para el rol
function calcularMetricas(lista) {
  const abiertas = lista.filter((o) => o.estado !== ESTADOS_OFICIO.RESUELTA)
  const resueltas = lista.filter((o) => o.estado === ESTADOS_OFICIO.RESUELTA)

  const volumen = DIAS_REPORTE.map((dia) => lista.filter((o) => o.fechaCreacion.startsWith(dia)).length)

  const horas = DIAS_REPORTE.map((dia) => {
    const delDia = resueltas.filter((o) => o.fechaCreacion.startsWith(dia))
    if (delDia.length === 0) return null
    return Math.round((delDia.reduce((s, o) => s + o.horasResolucion, 0) / delDia.length) * 10) / 10
  })
  const conDato = horas.filter((h) => h != null)
  const promedioHoras = conDato.length ? conDato.reduce((s, h) => s + h, 0) / conDato.length : null

  return {
    total: lista.length,
    abiertas: abiertas.length,
    resueltas: resueltas.length,
    vencenHoy: abiertas.filter((o) => mismoDia(o.fechaLimite, FECHA_ACTUAL)).length,
    volumen,
    horas,
    promedioHoras,
    recientes: [...lista].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)).slice(0, 4),
  }
}

export default function Dashboard() {
  const { user, role, dependencia, filterOficios } = useAuth()
  const navigate = useNavigate()
  const { oficios } = useOficios()
  const { getDependencia } = useInstitucion()
  const m = useMemo(() => calcularMetricas(filterOficios(oficios)), [filterOficios, oficios])

  const alcance = {
    [ROLES.SUPER_ADMIN]: 'en todas las dependencias',
    [ROLES.ADMIN_DEPENDENCIA]: `en ${dependencia?.nombre}`,
    [ROLES.USUARIO_COMUN]: 'creadas por ti o asignadas a ti',
  }[role]

  const kpis = [
    { label: 'Total Solicitudes', value: m.total, icon: Files },
    { label: 'En Proceso', value: m.abiertas, icon: Clock },
    { label: 'Resueltas', value: m.resueltas, icon: CircleCheck },
  ]

  const barData = DIAS_REPORTE.map((dia, i) => ({
    key: dia,
    label: diaDelMes(dia),
    value: m.volumen[i],
    tooltipTitle: diaCorto(dia),
    tooltipValue: plural(m.volumen[i], 'solicitud', 'solicitudes'),
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

      {/* Fila 1: fecha + KPIs */}
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-[1.75fr_1fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-card bg-primary p-6 pr-16 text-white sm:col-span-3 xl:col-span-1">
          <div className="absolute inset-y-0 right-0 w-9 bg-primary-hover" aria-hidden="true" />
          <p className="text-[11px] font-semibold tracking-wide text-white/85">
            {formatFechaInstitucional(FECHA_ACTUAL)}
          </p>
          {/* CORRECCIÓN: Leemos la propiedad nombre_completo que manda tu Spring Boot */}
          <p className="mt-3 text-lg font-semibold">Hola, {primerNombre(user?.nombre_completo || user?.nombre)}</p>
          <p className="mt-0.5 text-sm text-white/75">
            {plural(m.abiertas, 'solicitud abierta', 'solicitudes abiertas')}
            {m.vencenHoy > 0 && ` · ${plural(m.vencenHoy, 'vence', 'vencen')} hoy`} {alcance}.
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

      {/* Fila 2: gráficas */}
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

      {/* Fila 3: solicitudes recientes */}
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
                <th className="px-5 py-3 font-semibold">Dependencia</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Fecha límite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.recientes.map((o) => (
                <tr
                  key={o.idTicket}
                  onClick={() => navigate(`/oficios/${o.id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-primary">{o.folio}</p>
                    <p className="mt-0.5 text-sm text-slate-800">{o.asunto}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{getDependencia(o.dependenciaId)?.nombreCorto}</td>
                  <td className="px-5 py-3">
                    <StatusBadge estado={o.estado} />
                  </td>
                  <td
                    className={`px-5 py-3 text-sm ${
                      o.estado === ESTADOS_OFICIO.PRIORITARIA ? 'text-amber-600' : 'text-slate-500'
                    }`}
                  >
                    o.fechaCreacion ? formatFechaRelativa(o.fechaCreacion) : 'Sin fecha'
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.recientes.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No hay solicitudes para mostrar.</p>
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