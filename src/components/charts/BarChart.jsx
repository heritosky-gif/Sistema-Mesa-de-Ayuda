import { useState } from 'react'
import useElementWidth from '../../hooks/useElementWidth'
import ChartTooltip from './ChartTooltip'
import { CHART_COLORS, CHART_PADDING, niceScale } from './chartUtils'

/**
 * Barras verticales; la barra con el valor más alto se resalta en guinda sólido.
 * data: [{ key, label, value, tooltipTitle, tooltipValue }]
 */
export default function BarChart({ data, height = 150, ariaLabel }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)

  const P = CHART_PADDING
  const plotW = Math.max(width - P.left - P.right, 0)
  const plotH = height - P.top - P.bottom
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.value)))
  const maxValue = Math.max(...data.map((d) => d.value))
  const slot = plotW / data.length
  const barW = Math.min(22, slot * 0.5)
  const y = (v) => P.top + plotH - (v / max) * plotH
  const r = 4

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

        {data.map((d, i) => {
          const cx = P.left + slot * (i + 0.5)
          const x0 = cx - barW / 2
          const top = y(d.value)
          const base = y(0)
          const h = base - top
          const rr = Math.min(r, h)
          const isMax = d.value === maxValue && d.value > 0
          const dimmed = hover !== null && hover !== i
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  d={`M${x0},${base} V${top + rr} Q${x0},${top} ${x0 + rr},${top} H${x0 + barW - rr} Q${x0 + barW},${top} ${x0 + barW},${top + rr} V${base} Z`}
                  fill={isMax ? CHART_COLORS.primary : CHART_COLORS.primarySoft}
                  opacity={dimmed ? 0.55 : 1}
                  className="transition-opacity"
                />
              )}
              <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill={CHART_COLORS.axis}>
                {d.label}
              </text>
              {/* Zona de hover más grande que la barra */}
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
          y={y(data[hover].value)}
          title={data[hover].tooltipTitle}
          value={data[hover].tooltipValue}
        />
      )}
    </div>
  )
}
