export const CHART_COLORS = {
  primary: '#801336',
  primarySoft: '#C8879B',
  grid: '#E2E8F0',
  axis: '#94A3B8',
  objective: '#94A3B8',
  surface: '#FFFFFF',
}

export const CHART_PADDING = { top: 10, right: 8, bottom: 28, left: 32 }

/** Escala "bonita" para el eje Y: deja ~15% de aire sobre el valor máximo */
export function niceScale(maxValue, tickCount = 4) {
  const target = Math.max(maxValue, 1) * 1.15
  const raw = target / tickCount
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => s >= raw) ?? Math.ceil(raw)
  const max = Math.ceil(target / step) * step
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  return { max, ticks }
}

/** Curva suave (Catmull-Rom → Bézier) que pasa por todos los puntos */
export function smoothPath(points) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}
