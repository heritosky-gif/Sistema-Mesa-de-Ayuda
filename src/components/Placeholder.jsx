import { PenTool } from 'lucide-react'

// Bloque temporal para vistas pendientes de maquetar desde Figma
export default function Placeholder({ label = 'Vista pendiente de maquetar' }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <PenTool size={20} />
      </div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="max-w-sm text-xs text-slate-500">Se completará con el diseño de Figma.</p>
    </div>
  )
}
