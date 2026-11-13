import { ChevronLeft, ChevronRight } from 'lucide-react'

// Devuelve p. ej. [1, 2, 3, '…', 22] o [1, '…', 9, 10, 11, '…', 22]
function pageItems(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  let start = Math.max(1, page - 1)
  let end = Math.min(total, page + 1)
  if (page <= 2) end = 3
  if (page >= total - 1) start = total - 2

  const items = []
  if (start > 1) items.push(1)
  if (start > 2) items.push('…')
  for (let p = start; p <= end; p++) items.push(p)
  if (end < total - 1) items.push('…')
  if (end < total) items.push(total)
  return items
}

const base =
  'inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación">
      <button
        className={`${base} border-line bg-white text-slate-600 hover:bg-slate-50`}
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={15} /> Anterior
      </button>

      {pageItems(page, totalPages).map((item, i) =>
        item === '…' ? (
          <span key={`gap-${i}`} className="px-0.5 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`${base} ${
              item === page
                ? 'border-primary bg-primary font-semibold text-white'
                : 'border-line bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        className={`${base} border-line bg-white text-slate-600 hover:bg-slate-50`}
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        Siguiente <ChevronRight size={15} />
      </button>
    </nav>
  )
}
