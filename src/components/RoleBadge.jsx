import { ROLE_LABELS } from '../data/mockData'

const STYLES = {
  super_admin: 'bg-primary-soft text-primary',
  admin_dependencia: 'bg-indigo-50 text-indigo-700',
  usuario_comun: 'bg-slate-100 text-slate-600',
}

export default function RoleBadge({ rol }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STYLES[rol]}`}>
      {ROLE_LABELS[rol] ?? rol}
    </span>
  )
}
