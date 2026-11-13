// Palabras que no cuentan para las iniciales ("Director de Administración" → "DA")
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', '-'])

const initials = (text = '') =>
  text
    .replace(/^(Dr|Dra|Lic|Ing|Mtro|Mtra)\.\s*/i, '')
    .split(/\s+/)
    .filter((p) => p && !CONECTORES.has(p.toLowerCase()))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  ml: 'h-12 w-12 text-base font-semibold',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-[32px] font-semibold',
}

const TONES = {
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-slate-100 text-slate-600',
}

/** Iniciales del nombre, o la fotografía si se proporciona `src` */
export default function Avatar({ name, src, size = 'md', tone = 'primary', square = false }) {
  const forma = square ? 'rounded-lg' : 'rounded-full'
  if (src) {
    return <img src={src} alt="" aria-hidden="true" className={`shrink-0 object-cover ${forma} ${SIZES[size]}`} />
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-medium ${forma} ${TONES[tone]} ${SIZES[size]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
