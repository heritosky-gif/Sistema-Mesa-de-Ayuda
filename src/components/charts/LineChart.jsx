import { useState } from 'react'
import useElementWidth from '../../hooks/useElementWidth'
import ChartTooltip from './ChartTooltip'
import { CHART_COLORS, CHART_PADDING, niceScale, smoothPath } from './chartUtils'

/**
 * Línea suavizada con área sombreada y línea punteada de objetivo.
 * data: [{ key, label, value (number|null), tooltipTitle, tooltipValue }]
 * Los días con value = null se omiten de la curva.
 */
export default function LineChart({ data, objective, height = 150, ariaLabel }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)

  const P = CHART_PADDING
  const inset = 6
  const plotW = Math.max(width - P.left - P.right, 0)
  const plotH = height - P.top - P.bottom
  const values = data.map((d) => d.value).filter((v) => v != null)
  const { max, ticks } = niceScale(Math.max(...values, objective ?? 0))
  const step = data.length > 1 ? (plotW - inset * 2) / (data.length - 1) : 0
  const x = (i) => P.left + inset + i * step
  const y = (v) => P.top + plotH - (v / max) * plotH
  const base = y(0)

  const points = data
    .map((d, i) => (d.value == null ? null : { x: x(i), y: y(d.value), i }))
    .filter(Boolean)
  const line = smoothPath(points)
  const area =
    points.length > 1 ? `${line} L${points.at(-1).x},${base} L${points[0].x},${base} Z` : ''
  const hovered = hover !== null && data[hover].value != null ? hover : null

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.left} x2={width - P.right} y1={y(t)} y2={y(t)} stroke={CHART_COLORS.grid} />
            <text x={P.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={CHART_COLORS.axis}>
              {t}
            </text>
          </g>
        ))}

        {area && <path d={area} fill={CHART_COLORS.primary} opacity={0.08} />}

        {objective != null && (
          <line
            x1={P.left}
            x2={width - P.right}
            y1={y(objective)}
            y2={y(objective)}
            stroke={CHART_COLORS.objective}
            strokeDasharray="4 4"
          />
        )}

        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={P.top} y2={base} stroke={CHART_COLORS.axis} strokeOpacity={0.5} />
        )}

        <path d={line} fill="none" stroke={CHART_COLORS.primary} strokeWidth={2} strokeLinecap="round" />

        {points.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={hovered === p.i ? 5 : 2.5}
            fill={CHART_COLORS.primary}
            stroke={CHART_COLORS.surface}
            strokeWidth={hovered === p.i ? 2 : 0}
          />
        ))}

        {data.map((d, i) => (
          <g key={d.key}>
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={CHART_COLORS.axis}>
              {d.label}
            </text>
            <rect
              x={x(i) - step / 2}
              y={P.top}
              width={step || plotW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {hovered !== null && (
        <ChartTooltip
          x={x(hovered)}
          y={y(data[hovered].value)}
          title={data[hovered].tooltipTitle}
          value={data[hovered].tooltipValue}
        />
      )}
    </div>
  )
}
