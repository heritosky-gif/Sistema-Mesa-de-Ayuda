import { useState } from 'react'
import { Archive, Check, Pencil, Plus, RotateCcw, Trash, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitucion } from '../context/institucionContext'
import { useOficios } from '../context/oficiosContext'
import { getDestinoId } from '../data/mockData'
import Modal from './Modal'

/** Alta y edición de dependencias y de sus áreas / departamentos (solo Administrador Estatal) */
export default function CatalogoModal({ open, onClose }) {
  const { user } = useAuth()
  const {
    dependencias,
    areasDe,
    usuarios,
    crearDependencia,
    editarDependencia,
    crearArea,
    renombrarArea,
    eliminarArea,
    eliminarDependencia,
    cambiarEstadoDependencia,
  } = useInstitucion()
  const { oficios } = useOficios()

  const [seleccion, setSeleccion] = useState(dependencias[0]?.id ?? null)
  // { tipo: 'area', area, asignados } | { tipo: 'dependencia', dep, accion: 'eliminar' | 'baja' | 'alta' }
  const [confirmar, setConfirmar] = useState(null)
  const [reasignarA, setReasignarA] = useState('')
  const [nuevaDep, setNuevaDep] = useState(null) // { nombre, nombreCorto, siglas } mientras se captura
  const [edicionDep, setEdicionDep] = useState(null)
  const [nuevaArea, setNuevaArea] = useState('')
  const [edicionArea, setEdicionArea] = useState(null) // { id, nombre }
  const [error, setError] = useState(null)

  const dep = dependencias.find((d) => d.id === seleccion)
  const areas = dep ? areasDe(dep.id) : []
  const usuariosEn = (depId, area) =>
    usuarios.filter((u) => u.dependenciaId === depId && (area == null || u.area === area)).length
  const oficiosDe = (depId) => oficios.filter((o) => o.dependenciaId === depId || getDestinoId(o) === depId).length

  // Solo se elimina definitivamente si no hay historial que romper
  const accionDependencia = (d) =>
    usuariosEn(d.id) === 0 && oficiosDe(d.id) === 0 ? 'eliminar' : d.activa ? 'baja' : 'alta'

  const pedirEliminarArea = (a) => {
    const otras = areas.filter((x) => x.id !== a.id)
    setReasignarA(otras[0]?.nombre ?? '')
    setConfirmar({ tipo: 'area', area: a, asignados: usuariosEn(dep.id, a.nombre) })
  }

  const ejecutarConfirmacion = () => {
    if (confirmar.tipo === 'area') {
      resultado(eliminarArea(confirmar.area.id, user.id, confirmar.asignados > 0 ? reasignarA : null), () => {
        if (edicionArea?.id === confirmar.area.id) setEdicionArea(null)
      })
    } else if (confirmar.accion === 'eliminar') {
      resultado(eliminarDependencia(confirmar.dep.id, user.id), () =>
        seleccionar(dependencias.find((d) => d.id !== confirmar.dep.id)?.id ?? null)
      )
    } else {
      resultado(cambiarEstadoDependencia(confirmar.dep.id, confirmar.accion === 'alta', user.id))
    }
    setConfirmar(null)
  }

  const resultado = (r, alExito) => {
    if (r.ok) {
      setError(null)
      alExito?.(r)
    } else setError(r.error)
  }

  const guardarNuevaDep = () =>
    resultado(crearDependencia(nuevaDep, user.id), (r) => {
      setNuevaDep(null)
      setSeleccion(r.id)
    })

  const guardarEdicionDep = () => resultado(editarDependencia(dep.id, edicionDep, user.id), () => setEdicionDep(null))

  const agregarArea = () => resultado(crearArea(dep.id, nuevaArea, user.id), () => setNuevaArea(''))

  const guardarArea = () => resultado(renombrarArea(edicionArea.id, edicionArea.nombre, user.id), () => setEdicionArea(null))

  const seleccionar = (id) => {
    setSeleccion(id)
    setEdicionDep(null)
    setEdicionArea(null)
    setNuevaArea('')
    setError(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Catálogo de Dependencias y Áreas" size="xl">
      <p className="mb-5 text-sm text-slate-500">
        Lo que registre aquí aparece de inmediato en los selectores de usuarios, oficios, buzón y estadísticas.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Lista de dependencias */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dependencias ({dependencias.length})
            </h3>
            {!nuevaDep && (
              <button
                onClick={() => setNuevaDep({ nombre: '', nombreCorto: '', siglas: '' })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus size={13} /> Nueva
              </button>
            )}
          </div>

          {nuevaDep && (
            <FormDependencia
              datos={nuevaDep}
              onChange={setNuevaDep}
              onGuardar={guardarNuevaDep}
              onCancelar={() => {
                setNuevaDep(null)
                setError(null)
              }}
              textoGuardar="Agregar dependencia"
            />
          )}

          <ul className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
            {dependencias.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => seleccionar(d.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    d.id === seleccion ? 'bg-primary-soft font-semibold text-primary' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`block truncate ${d.activa ? '' : 'text-slate-400 line-through'}`}>{d.nombre}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {areasDe(d.id).length} áreas · {usuariosEn(d.id)} usuarios
                    {!d.activa && <span className="ml-1.5 font-semibold text-amber-700">· De baja</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Detalle de la dependencia seleccionada */}
        {dep && (
          <div className="min-w-0 rounded-lg border border-line p-5">
            {edicionDep ? (
              <FormDependencia
                datos={edicionDep}
                onChange={setEdicionDep}
                onGuardar={guardarEdicionDep}
                onCancelar={() => {
                  setEdicionDep(null)
                  setError(null)
                }}
                textoGuardar="Guardar cambios"
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{dep.nombre}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nombre corto: {dep.nombreCorto} · Siglas: {dep.siglas}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setEdicionDep({ nombre: dep.nombre, nombreCorto: dep.nombreCorto, siglas: dep.siglas })}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  {(() => {
                    const accion = accionDependencia(dep)
                    const config = {
                      eliminar: { icon: Trash, texto: 'Eliminar', clase: 'text-rose-600 hover:bg-rose-50' },
                      baja: { icon: Archive, texto: 'Dar de baja', clase: 'text-amber-700 hover:bg-amber-50' },
                      alta: { icon: RotateCcw, texto: 'Reactivar', clase: 'text-emerald-700 hover:bg-emerald-50' },
                    }[accion]
                    const Icon = config.icon
                    return (
                      <button
                        onClick={() => setConfirmar({ tipo: 'dependencia', dep, accion })}
                        className={`btn-secondary px-3 py-1.5 text-xs ${config.clase}`}
                      >
                        <Icon size={13} /> {config.texto}
                      </button>
                    )
                  })()}
                </div>
              </div>
            )}
            {!edicionDep && !dep.activa && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Dependencia dada de baja: no aparece en los selectores para nuevos usuarios ni oficios. Su historial se
                conserva.
              </p>
            )}

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Áreas / Departamentos ({areas.length})
            </h4>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {areas.map((a) => {
                const asignados = usuariosEn(dep.id, a.nombre)
                const editando = edicionArea?.id === a.id
                return (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                    {editando ? (
                      <>
                        <input
                          autoFocus
                          value={edicionArea.nombre}
                          onChange={(e) => setEdicionArea({ ...edicionArea, nombre: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && guardarArea()}
                          className="input py-1.5"
                          aria-label="Nuevo nombre del área"
                        />
                        <BotonIcono etiqueta="Guardar" onClick={guardarArea}>
                          <Check size={15} />
                        </BotonIcono>
                        <BotonIcono etiqueta="Cancelar" onClick={() => setEdicionArea(null)}>
                          <X size={15} />
                        </BotonIcono>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-slate-800">{a.nombre}</span>
                        <span className="text-[11px] text-slate-400">{asignados} usuarios</span>
                        <BotonIcono etiqueta={`Renombrar ${a.nombre}`} onClick={() => setEdicionArea({ id: a.id, nombre: a.nombre })}>
                          <Pencil size={14} />
                        </BotonIcono>
                        <BotonIcono etiqueta={`Eliminar ${a.nombre}`} onClick={() => pedirEliminarArea(a)} peligro>
                          <Trash size={14} />
                        </BotonIcono>
                      </>
                    )}
                  </li>
                )
              })}
              {areas.length === 0 && <li className="px-3 py-4 text-center text-xs text-slate-500">Sin áreas registradas.</li>}
            </ul>

            <div className="mt-3 flex gap-2">
              <input
                value={nuevaArea}
                onChange={(e) => setNuevaArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarArea()}
                placeholder="Nombre de la nueva área o departamento"
                className="input"
                aria-label="Nueva área"
              />
              <button onClick={agregarArea} disabled={!nuevaArea.trim()} className="btn-primary shrink-0">
                <Plus size={15} /> Agregar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación antes de eliminar o dar de baja */}
      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        size="sm"
        title={
          confirmar?.tipo === 'area'
            ? '¿Estás seguro de eliminar esta área?'
            : confirmar?.accion === 'eliminar'
              ? '¿Estás seguro de eliminar esta dependencia?'
              : confirmar?.accion === 'baja'
                ? '¿Dar de baja esta dependencia?'
                : '¿Reactivar esta dependencia?'
        }
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={ejecutarConfirmacion}
              disabled={confirmar?.tipo === 'area' && confirmar.asignados > 0 && !reasignarA}
            >
              {confirmar?.tipo === 'area' || confirmar?.accion === 'eliminar'
                ? 'Sí, eliminar'
                : confirmar?.accion === 'baja'
                  ? 'Sí, dar de baja'
                  : 'Sí, reactivar'}
            </button>
          </>
        }
      >
        {confirmar?.tipo === 'area' && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Se eliminará <span className="font-semibold text-slate-900">{confirmar.area.nombre}</span> de{' '}
              {dep?.nombre}. Los oficios anteriores conservan su historial.
            </p>
            {confirmar.asignados > 0 &&
              (areas.length > 1 ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    Tiene {confirmar.asignados} usuario(s). Moverlos a:
                  </span>
                  <select value={reasignarA} onChange={(e) => setReasignarA(e.target.value)} className="input">
                    {areas
                      .filter((x) => x.id !== confirmar.area.id)
                      .map((x) => (
                        <option key={x.id} value={x.nombre}>
                          {x.nombre}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Tiene {confirmar.asignados} usuario(s) y es la única área de la dependencia. Agregue otra área para
                  poder moverlos.
                </p>
              ))}
          </div>
        )}
        {confirmar?.tipo === 'dependencia' && (
          <p className="text-sm text-slate-600">
            {confirmar.accion === 'eliminar' && (
              <>
                Se eliminará <span className="font-semibold text-slate-900">{confirmar.dep.nombre}</span> junto con sus{' '}
                {areasDe(confirmar.dep.id).length} áreas. Esta acción no se puede deshacer.
              </>
            )}
            {confirmar.accion === 'baja' && (
              <>
                <span className="font-semibold text-slate-900">{confirmar.dep.nombre}</span> tiene{' '}
                {usuariosEn(confirmar.dep.id)} usuario(s) y {oficiosDe(confirmar.dep.id)} oficio(s) en su historial, por lo
                que no puede eliminarse. Se dará de baja: dejará de aparecer en los selectores para nuevos registros y
                podrá reactivarla después.
              </>
            )}
            {confirmar.accion === 'alta' && (
              <>
                <span className="font-semibold text-slate-900">{confirmar.dep.nombre}</span> volverá a aparecer en los
                selectores del sistema.
              </>
            )}
          </p>
        )}
      </Modal>
    </Modal>
  )
}

function FormDependencia({ datos, onChange, onGuardar, onCancelar, textoGuardar }) {
  const set = (k) => (e) => onChange({ ...datos, [k]: e.target.value })
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-line bg-slate-50 p-3">
      <input autoFocus value={datos.nombre} onChange={set('nombre')} placeholder="Nombre oficial" className="input" aria-label="Nombre oficial" />
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <input value={datos.nombreCorto} onChange={set('nombreCorto')} placeholder="Nombre corto" className="input" aria-label="Nombre corto" />
        <input value={datos.siglas} onChange={set('siglas')} placeholder="Siglas" className="input uppercase" aria-label="Siglas" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancelar} className="btn-secondary px-3 py-1.5 text-xs">
          Cancelar
        </button>
        <button onClick={onGuardar} disabled={!datos.nombre.trim()} className="btn-primary px-3 py-1.5 text-xs">
          {textoGuardar}
        </button>
      </div>
    </div>
  )
}

function BotonIcono({ etiqueta, onClick, children, peligro = false, deshabilitado = false, titulo }) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
      className={`rounded-md p-1.5 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        peligro ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
