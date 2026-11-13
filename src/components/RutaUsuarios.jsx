import { Link } from 'react-router-dom'

/** Breadcrumb del módulo de usuarios: "Administración institucional • Gestión de Usuarios • …" */
export default function RutaUsuarios({ actual }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[11px]" aria-label="Ruta">
      <span className="font-bold uppercase tracking-wide text-primary">Administración institucional</span>
      <span className="text-slate-300">•</span>
      {actual ? (
        <>
          <Link to="/usuarios" className="text-slate-500 hover:text-primary">
            Gestión de Usuarios
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">{actual}</span>
        </>
      ) : (
        <span className="text-slate-500">Gestión de Usuarios y Accesos Institucionales</span>
      )}
    </nav>
  )
}
