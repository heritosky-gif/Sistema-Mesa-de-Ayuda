import { Landmark } from 'lucide-react'

export default function BrandLogo() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Landmark size={20} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-primary">BCSnosUNE</p>
        <p className="mt-1.5 text-xs leading-snug text-slate-500">
          Gobierno del Estado de Baja
          <br />
          California Sur
        </p>
      </div>
    </div>
  )
}
