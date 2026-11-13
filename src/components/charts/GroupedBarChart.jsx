import { useState } from 'react'
import useElementWidth from '../../hooks/useElementWidth'
import ChartTooltip from './ChartTooltip'
import { CHART_COLORS, niceScale } from './chartUtils'

const PADDING = { top: 24, right: 8, bottom: 44, left: 36 }

/**
 * Barras agrupadas (una barra por serie en cada categoría), con valor encima de cada barra.
 * series: [{ key, label, color, labelColor }]
 * data:   [{ key, label, values: { [serieKey]: number } }]
 */
export default function GroupedBarChart({ data, series, height = 280, ariaLabel }) {
  const [ref, width] = useElementWidth(560)
  const [hover, setHover] = useState(null)

  const P = PADDING
  const plotW = Math.max(width - P.left - P.right, 0)
  const plotH = height - P.top - P.bottom
  const maxValue = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key])))
  const { max, ticks } = niceScale(maxValue, 3)
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.min(28, (slot * 0.6) / series.length)
  const gap = 10
  const groupW = barW * series.length + gap * (series.length - 1)
  const y = (v) => P.top + plotH - (v / max) * plotH
  const r = 4

  const barPath = (x0, top, base) => {
    const h = base - top
    if (h <= 0) return ''
    const rr = Math.min(r, h)
    return `M${x0},${base} V${top + rr} Q${x0},${top} ${x0 + rr},${top} H${x0 + barW - rr} Q${x0 + barW},${top} ${x0 + barW},${top + rr} V${base} Z`
  }

  // Etiquetas largas en dos líneas ("Desarrollo Social" → "Desarrollo" / "Social")
  const lineas = (texto) => {
    const palabras = texto.split(' ')
    if (palabras.length < 2 || texto.length <= 12) return [texto]
    const mitad = Math.ceil(palabras.length / 2)
    return [palabras.slice(0, mitad).join(' '), palabras.slice(mitad).join(' ')]
  }

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.left} x2={width - P.right} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} />
            <text x={P.left - 12} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={CHART_COLORS.axis}>
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = P.left + slot * (i + 0.5)
          const start = cx - groupW / 2
          const dimmed = hover !== null && hover !== i
          return (
            <g key={d.key} opacity={dimmed ? 0.5 : 1} className="transition-opacity">
              {series.map((s, j) => {
                const x0 = start + j * (barW + gap)
                const v = d.values[s.key]
                return (
                  <g key={s.key}>
                    <path d={barPath(x0, y(v), y(0))} fill={s.color} />
                    <text
                      x={x0 + barW / 2}
                      y={y(v) - 7}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={j === 0 ? 600 : 400}
                      fill={s.labelColor ?? CHART_COLORS.axis}
                    >
                      {v}
                    </text>
                  </g>
                )
              })}
              <text textAnchor="middle" fontSize="11" fill="#64748B">
                {lineas(d.label).map((l, k) => (
                  <tspan key={k} x={cx} y={height - P.bottom + 22 + k * 15}>
                    {l}
                  </tspan>
                ))}
              </text>
              <rect
                x={P.left + slot * i}
                y={P.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          )
        })}
      </svg>

      {hover !== null && (
        <ChartTooltip
          x={P.left + slot * (hover + 0.5)}
          y={y(Math.max(...series.map((s) => data[hover].values[s.key]))) - 14}
          title={data[hover].label}
          value={series.map((s) => `${s.label}: ${data[hover].values[s.key]}`).join(' · ')}
        />
      )}
    </div>
  )
}
