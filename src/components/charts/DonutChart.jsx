import { useState } from 'react'

/**
 * Dona con separación de 2px entre segmentos y total al centro.
 * Al pasar el cursor por un segmento, el centro muestra su valor.
 * segments: [{ key, label, value, color }]
 */
export default function DonutChart({ segments, size = 172, thickness = 18, totalLabel = 'total', onHover }) {
  const [hover, setHover] = useState(null)
  const total = segments.reduce((s, x) => s + x.value, 0)
  const radius = (size - thickness) / 2
  const circ = 2 * Math.PI * radius
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 2 : 0

  const activar = (k) => {
    setHover(k)
    onHover?.(k)
  }

  // Largo y punto de inicio de cada segmento sobre la circunferencia
  const arcos = segments.reduce((acc, s) => {
    const inicio = acc.length ? acc.at(-1).inicio + acc.at(-1).largo : 0
    acc.push({ ...s, inicio, largo: total ? (s.value / total) * circ : 0 })
    return acc
  }, [])
  const activo = segments.find((s) => s.key === hover)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={thickness} />
        {total > 0 &&
          arcos.map((s) => {
            if (s.value === 0) return null
            return (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === s.key ? thickness + 4 : thickness}
                strokeDasharray={`${Math.max(s.largo - gap, 0)} ${circ}`}
                strokeDashoffset={-s.inicio}
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={() => activar(s.key)}
                onMouseLeave={() => activar(null)}
              >
                <title>{`${s.label}: ${s.value.toLocaleString('es-MX')}`}</title>
              </circle>
            )
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[28px] font-semibold leading-none text-slate-900">
          {(activo ? activo.value : total).toLocaleString('es-MX')}
        </span>
        <span className="mt-1.5 text-xs text-slate-500">{activo ? activo.label : totalLabel}</span>
      </div>
    </div>
  )
}
