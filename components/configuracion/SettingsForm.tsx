'use client'

import { useState } from 'react'
import {
  CheckCircle2, Plus, Trash2, Pencil, Truck,
  Ruler, Package2, AlertCircle, X, Check,
} from 'lucide-react'
import {
  saveProfileParams,
  saveArrayField,
  insertPlataforma,
  updatePlataforma,
  togglePlataforma,
  deletePlataforma,
} from '@/app/(dashboard)/configuracion/actions'
import type { PlataformaDelivery } from '@/types'

interface Props {
  initialIva: number
  initialMargen: number
  initialComisionBancaria: number
  initialPlataformas: PlataformaDelivery[]
  initialUnidades: string[]
  initialPresentaciones: string[]
}

export default function SettingsForm({
  initialIva, initialMargen, initialComisionBancaria, initialPlataformas,
  initialUnidades, initialPresentaciones,
}: Props) {
  // ── Costeo params ──────────────────────────────────────────────────────────
  const [iva, setIva]         = useState(String(initialIva))
  const [margen, setMargen]   = useState(String(initialMargen))
  const [banco, setBanco]     = useState(String(initialComisionBancaria))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // ── Delivery platforms ─────────────────────────────────────────────────────
  const [plataformas, setPlataformas] = useState<PlataformaDelivery[]>(initialPlataformas)
  const [showAddPlat, setShowAddPlat] = useState(false)
  const [editingPlat, setEditingPlat] = useState<PlataformaDelivery | null>(null)
  const [platNombre, setPlatNombre]   = useState('')
  const [platPct, setPlatPct]         = useState('')
  const [platLoading, setPlatLoading] = useState(false)

  // ── Custom units ───────────────────────────────────────────────────────────
  const [customUnidades, setCustomUnidades]     = useState<string[]>(initialUnidades)
  const [newUnidad, setNewUnidad]               = useState('')
  const [unidadLoading, setUnidadLoading]       = useState(false)
  const [unidadErr, setUnidadErr]               = useState<string | null>(null)
  const [editingUnidadIdx, setEditingUnidadIdx] = useState<number | null>(null)
  const [editingUnidadVal, setEditingUnidadVal] = useState('')

  // ── Custom presentation types ──────────────────────────────────────────────
  const [customPresentaciones, setCustomPresentaciones] = useState<string[]>(initialPresentaciones)
  const [newPresentacion, setNewPresentacion]           = useState('')
  const [presLoading, setPresLoading]                   = useState(false)
  const [presErr, setPresErr]                           = useState<string | null>(null)
  const [editingPresIdx, setEditingPresIdx]             = useState<number | null>(null)
  const [editingPresVal, setEditingPresVal]             = useState('')

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveArray = async (
    field: 'unidades_personalizadas' | 'presentaciones_personalizadas',
    value: string[],
  ): Promise<boolean> => {
    const result = await saveArrayField(field, value)
    return result.ok
  }

  // ── Save costeo params ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setSaveErr(null)

    const { ok, error } = await saveProfileParams(Number(iva), Number(margen), Number(banco))

    setLoading(false)
    if (!ok) {
      setSaveErr(`No se pudo guardar. ${error ?? ''}`)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  // ── Delivery platforms CRUD ────────────────────────────────────────────────
  const openAddPlat  = () => { setEditingPlat(null); setPlatNombre(''); setPlatPct(''); setShowAddPlat(true) }
  const openEditPlat = (p: PlataformaDelivery) => {
    setEditingPlat(p); setPlatNombre(p.nombre); setPlatPct(String(p.comision_porcentaje)); setShowAddPlat(true)
  }
  const closePlatForm = () => { setShowAddPlat(false); setEditingPlat(null) }

  const handleSavePlat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platNombre.trim()) return
    setPlatLoading(true)
    if (editingPlat) {
      const { data } = await updatePlataforma(editingPlat.id, platNombre.trim(), Number(platPct) || 0)
      if (data) setPlataformas(ps => ps.map(p => p.id === editingPlat.id ? data : p))
    } else {
      const { data } = await insertPlataforma(platNombre.trim(), Number(platPct) || 0)
      if (data) setPlataformas(ps => [...ps, data])
    }
    setPlatLoading(false); closePlatForm()
  }

  const handleTogglePlat = async (p: PlataformaDelivery) => {
    await togglePlataforma(p.id, !p.activa)
    setPlataformas(ps => ps.map(x => x.id === p.id ? { ...x, activa: !x.activa } : x))
  }

  const handleDeletePlat = async (id: string) => {
    await deletePlataforma(id)
    setPlataformas(ps => ps.filter(p => p.id !== id))
  }

  // ── Custom units: add ──────────────────────────────────────────────────────
  const handleAddUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = newUnidad.trim().toUpperCase()
    if (!val || customUnidades.map(u => u.toUpperCase()).includes(val)) return
    setUnidadLoading(true); setUnidadErr(null)
    const updated = [...customUnidades, val]
    const ok = await saveArray('unidades_personalizadas', updated)
    if (ok) { setCustomUnidades(updated); setNewUnidad('') }
    else { setUnidadErr('No se pudo guardar. Verifica tu conexión e intenta de nuevo.') }
    setUnidadLoading(false)
  }

  // ── Custom units: edit ─────────────────────────────────────────────────────
  const startEditUnidad = (idx: number) => {
    setEditingUnidadIdx(idx)
    setEditingUnidadVal(customUnidades[idx])
    setUnidadErr(null)
  }

  const cancelEditUnidad = () => { setEditingUnidadIdx(null); setEditingUnidadVal('') }

  const confirmEditUnidad = async (idx: number) => {
    const newVal = editingUnidadVal.trim().toUpperCase()
    const oldVal = customUnidades[idx]
    if (!newVal) { cancelEditUnidad(); return }
    if (newVal === oldVal) { cancelEditUnidad(); return }
    if (customUnidades.some((u, i) => i !== idx && u.toUpperCase() === newVal)) {
      setUnidadErr(`"${newVal}" ya existe en la lista.`)
      return
    }
    const updated = customUnidades.map((u, i) => i === idx ? newVal : u)
    const ok = await saveArray('unidades_personalizadas', updated)
    if (ok) { setCustomUnidades(updated); cancelEditUnidad() }
    else { setUnidadErr('No se pudo guardar. Intenta de nuevo.') }
  }

  // ── Custom units: delete ───────────────────────────────────────────────────
  const handleDeleteUnidad = async (idx: number) => {
    setUnidadErr(null)
    const updated = customUnidades.filter((_, i) => i !== idx)
    const ok = await saveArray('unidades_personalizadas', updated)
    if (ok) { setCustomUnidades(updated) }
    else { setUnidadErr('No se pudo eliminar. Intenta de nuevo.') }
  }

  // ── Custom presentations: add ──────────────────────────────────────────────
  const handleAddPresentacion = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = newPresentacion.trim()
    if (!val || customPresentaciones.map(p => p.toLowerCase()).includes(val.toLowerCase())) return
    setPresLoading(true); setPresErr(null)
    const updated = [...customPresentaciones, val]
    const ok = await saveArray('presentaciones_personalizadas', updated)
    if (ok) { setCustomPresentaciones(updated); setNewPresentacion('') }
    else { setPresErr('No se pudo guardar. Verifica tu conexión e intenta de nuevo.') }
    setPresLoading(false)
  }

  // ── Custom presentations: edit ─────────────────────────────────────────────
  const startEditPres = (idx: number) => {
    setEditingPresIdx(idx)
    setEditingPresVal(customPresentaciones[idx])
    setPresErr(null)
  }

  const cancelEditPres = () => { setEditingPresIdx(null); setEditingPresVal('') }

  const confirmEditPres = async (idx: number) => {
    const newVal = editingPresVal.trim()
    const oldVal = customPresentaciones[idx]
    if (!newVal) { cancelEditPres(); return }
    if (newVal === oldVal) { cancelEditPres(); return }
    if (customPresentaciones.some((p, i) => i !== idx && p.toLowerCase() === newVal.toLowerCase())) {
      setPresErr(`"${newVal}" ya existe en la lista.`)
      return
    }
    const updated = customPresentaciones.map((p, i) => i === idx ? newVal : p)
    const ok = await saveArray('presentaciones_personalizadas', updated)
    if (ok) { setCustomPresentaciones(updated); cancelEditPres() }
    else { setPresErr('No se pudo guardar. Intenta de nuevo.') }
  }

  // ── Custom presentations: delete ───────────────────────────────────────────
  const handleDeletePresentacion = async (idx: number) => {
    setPresErr(null)
    const updated = customPresentaciones.filter((_, i) => i !== idx)
    const ok = await saveArray('presentaciones_personalizadas', updated)
    if (ok) { setCustomPresentaciones(updated) }
    else { setPresErr('No se pudo eliminar. Intenta de nuevo.') }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition'

  // Reusable list item component (render inline for units and presentations)
  const renderListItem = (
    value: string,
    idx: number,
    isEditing: boolean,
    editVal: string,
    setEditVal: (v: string) => void,
    onStartEdit: (i: number) => void,
    onConfirmEdit: (i: number) => void,
    onCancelEdit: () => void,
    onDelete: (i: number) => void,
    inputRef?: React.RefObject<HTMLInputElement>,
  ) => (
    <li key={idx} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 transition-colors">
      {isEditing ? (
        <>
          <input
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); onConfirmEdit(idx) }
              if (e.key === 'Escape') { onCancelEdit() }
            }}
            className="flex-1 px-2.5 py-1 border border-brand-400 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            autoFocus
          />
          <button
            type="button"
            onClick={() => onConfirmEdit(idx)}
            title="Confirmar"
            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex-shrink-0"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            title="Cancelar"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-slate-800">{value}</span>
          <button
            type="button"
            onClick={() => onStartEdit(idx)}
            title="Editar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(idx)}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </>
      )}
    </li>
  )

  return (
    <div className="space-y-6 max-w-lg">

      {/* ── Costeo params ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Parámetros de costeo</h2>
            <p className="text-xs text-slate-400 mt-0.5">Se aplican a todas tus recetas.</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Porcentaje de IVA / VAT / Tax (%)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={iva} onChange={e => setIva(e.target.value)}
                  min="0" max="100" step="0.1" className={inputClass} />
                <span className="text-sm text-slate-500 whitespace-nowrap">% de impuesto</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Se usa para calcular el precio sin IVA / VAT / Tax.{' '}
                <span className="font-medium text-slate-500">Por defecto: 16%</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Margen bruto mínimo deseado (%)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={margen} onChange={e => setMargen(e.target.value)}
                  min="0" max="100" step="0.1" className={inputClass} />
                <span className="text-sm text-slate-500 whitespace-nowrap">% mínimo</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Advertencia en rojo si el margen cae por debajo.{' '}
                <span className="font-medium text-slate-500">Por defecto: 65%</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comisión bancaria (%)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={banco} onChange={e => setBanco(e.target.value)}
                  min="0" max="100" step="0.01" className={inputClass} />
                <span className="text-sm text-slate-500 whitespace-nowrap">% comisión</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Comisión que cobra tu banco/terminal por cada venta.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-sm">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 size={16} /> Guardado correctamente
            </div>
          )}
          {saveErr && (
            <div className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle size={16} /> {saveErr}
            </div>
          )}
        </div>
      </form>

      {/* ── Custom units of measure ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Ruler size={16} className="text-slate-400" />
          <div>
            <h2 className="font-semibold text-slate-900">Unidades de medida personalizadas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Por defecto: kg, L, Pz, oz, lb. Agrega las tuyas aquí.
            </p>
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={handleAddUnidad} className="px-5 py-3 border-b border-slate-100 flex gap-2">
          <input
            type="text" value={newUnidad} onChange={e => setNewUnidad(e.target.value)}
            placeholder="Ej: cdta, lata, frasco..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" disabled={unidadLoading || !newUnidad.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 whitespace-nowrap">
            {unidadLoading ? 'Guardando...' : <><Plus size={14} /> Agregar</>}
          </button>
        </form>

        {/* Error */}
        {unidadErr && (
          <div className="flex items-center gap-1.5 px-5 py-2 text-sm text-red-500 bg-red-50 border-b border-red-100">
            <AlertCircle size={14} className="flex-shrink-0" /> {unidadErr}
          </div>
        )}

        {/* List */}
        {customUnidades.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-400 text-center">
            Sin unidades personalizadas todavía.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {customUnidades.map((u, idx) =>
              renderListItem(
                u, idx,
                editingUnidadIdx === idx, editingUnidadVal, setEditingUnidadVal,
                startEditUnidad, confirmEditUnidad, cancelEditUnidad,
                handleDeleteUnidad,
              )
            )}
          </ul>
        )}
      </div>

      {/* ── Custom presentation types ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package2 size={16} className="text-slate-400" />
          <div>
            <h2 className="font-semibold text-slate-900">Tipos de presentación personalizados</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              A granel, Bolsa, Botella, Caja, etc. ya están incluidos.
            </p>
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={handleAddPresentacion} className="px-5 py-3 border-b border-slate-100 flex gap-2">
          <input
            type="text" value={newPresentacion} onChange={e => setNewPresentacion(e.target.value)}
            placeholder="Ej: Charola, Garrafa, Bote..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" disabled={presLoading || !newPresentacion.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 whitespace-nowrap">
            {presLoading ? 'Guardando...' : <><Plus size={14} /> Agregar</>}
          </button>
        </form>

        {/* Error */}
        {presErr && (
          <div className="flex items-center gap-1.5 px-5 py-2 text-sm text-red-500 bg-red-50 border-b border-red-100">
            <AlertCircle size={14} className="flex-shrink-0" /> {presErr}
          </div>
        )}

        {/* List */}
        {customPresentaciones.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-400 text-center">
            Sin tipos de presentación personalizados todavía.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {customPresentaciones.map((p, idx) =>
              renderListItem(
                p, idx,
                editingPresIdx === idx, editingPresVal, setEditingPresVal,
                startEditPres, confirmEditPres, cancelEditPres,
                handleDeletePresentacion,
              )
            )}
          </ul>
        )}
      </div>

      {/* ── Delivery platforms ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-slate-400" />
            <div>
              <h2 className="font-semibold text-slate-900">Plataformas de Delivery</h2>
              <p className="text-xs text-slate-400 mt-0.5">Configura tus plataformas y su comisión.</p>
            </div>
          </div>
          <button onClick={openAddPlat}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <Plus size={15} /> Agregar
          </button>
        </div>

        {showAddPlat && (
          <form onSubmit={handleSavePlat} className="px-6 py-4 bg-brand-50 border-b border-brand-100 space-y-3">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
              {editingPlat ? 'Editar plataforma' : 'Nueva plataforma'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                <input value={platNombre} onChange={e => setPlatNombre(e.target.value)}
                  placeholder="Ej: Uber Eats" autoFocus
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comisión (%)</label>
                <input type="number" value={platPct} onChange={e => setPlatPct(e.target.value)}
                  placeholder="0" min="0" max="100" step="0.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={closePlatForm}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={platLoading || !platNombre.trim()}
                className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {platLoading ? 'Guardando...' : editingPlat ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        )}

        {plataformas.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            <Truck size={32} className="mx-auto mb-2 opacity-30" />
            Sin plataformas registradas.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plataformas.map(p => (
              <li key={p.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleTogglePlat(p)}
                    className={`rounded-full transition-colors relative flex-shrink-0 ${p.activa ? 'bg-brand-500' : 'bg-slate-200'}`}
                    title={p.activa ? 'Activa — click para desactivar' : 'Inactiva — click para activar'}
                    style={{ width: 32, height: 18 }}>
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${p.activa ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
                  </button>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{p.nombre}</div>
                    <div className="text-xs text-slate-400">{p.comision_porcentaje}% de comisión</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditPlat(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDeletePlat(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
