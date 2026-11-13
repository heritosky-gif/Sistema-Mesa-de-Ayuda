import { Fragment } from 'react'
import { Link } from 'react-router-dom'

/**
 * Breadcrumb "Configuración > … > Actual" de los formularios de usuario.
 * pasos: [{ label, to? }] — el último se muestra resaltado en guinda.
 */
export default function RutaConfiguracion({ pasos }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Ruta">
      {pasos.map((p, i) => {
        const ultimo = i === pasos.length - 1
        return (
          <Fragment key={p.label}>
            {i > 0 && <span className="text-slate-400">&gt;</span>}
            {ultimo ? (
              <span className="font-semibold text-primary" aria-current="page">
                {p.label}
              </span>
            ) : p.to ? (
              <Link to={p.to} className="text-slate-500 hover:text-primary">
                {p.label}
              </Link>
            ) : (
              <span className="text-slate-500">{p.label}</span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
