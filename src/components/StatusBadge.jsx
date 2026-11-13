import { ESTADO_LABELS } from '../data/mockData'

// Colores suaves según el diseño de Figma
const STYLES = {
  en_revision: 'bg-primary-soft text-primary',
  prioritaria: 'bg-amber-50 text-amber-700',
  en_proceso: 'bg-primary-soft text-primary',
  resuelta: 'bg-emerald-50 text-emerald-700',
}

export default function StatusBadge({ estado }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
        STYLES[estado] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  )
}
