import { PRIORIDAD_LABELS } from '../data/mockData'

// Badge suave con punto de color, según el diseño del Buzón
const STYLES = {
  alta: { badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-600' },
  media: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  baja: { badge: 'bg-primary-soft text-primary', dot: 'bg-primary' },
}

export default function PriorityBadge({ prioridad }) {
  const s = STYLES[prioridad] ?? STYLES.baja
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {PRIORIDAD_LABELS[prioridad] ?? prioridad}
    </span>
  )
}
