'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Layers, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ComboBox from '@/components/ui/ComboBox'
import {
  insertIngredienteSubreceta,
  updateIngredienteSubreceta,
  deleteIngredienteSubreceta,
  syncCostoSubreceta,
  saveMargenSeguridadSubreceta,
} from '@/app/(dashboard)/sub-recetas/actions'
import type { Ingrediente, SubReceta } from '@/types'

interface IngRow {
  id: string
  ingrediente_id: string
  nombre: string
  unidad: string
  precio_unitario: number
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
}

interface Props {
  subReceta: SubReceta
  ingredientesSubreceta: IngRow[]
  ingredientesDisponibles: Ingrediente[]
  plan: 'free' | 'basic' | 'pro'
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
const pct = (v: number) => `${v.toFixed(2)}%`

function calcRow(neta: number, merma: number, precio_unitario: number) {
  const bruta = neta + merma
  const pmerma = bruta > 0 ? (merma / bruta) * 100 : 0
  const costo = precio_unitario * bruta
  return { cantidad_bruta: bruta, porcentaje_merma: pmerma, costo }
}

export default function SubRecetaDetalle({
  subReceta: init,
  ingredientesSubreceta,
  ingredientesDisponibles,
  plan,
}: Props) {
  const [sr, setSr] = useState(init)
  const [rows, setRows] = useState<IngRow[]>(ingredientesSubreceta)
  const [editingHeader, setEditingHeader] = useState(false)
  const [nombreEdit, setNombreEdit] = useState(sr.nombre)
  const [rendEdit, setRendEdit] = useState(String(sr.rendimiento))
  const [margenSegStr, setMargenSegStr] = useState(String(sr.margen_seguridad ?? 0))
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRow, setEditingRow] = useState<IngRow | null>(null)
  const [addSelId, setAddSelId] = useState('')
  const [addNeta, setAddNeta] = useState('')
  const [addMerma, setAddMerma] = useState('0')
  const [addLoading, setAddLoading] = useState(false)
  const [addErr, setAddErr] = useState<string | null>(null)
  // Ref solo para el ComboBox (retorno de foco tras agregar)
  const comboRef = useRef<HTMLInputElement>(null)

  const isLocked = false

  const router = useRouter()
  const supabase = createClient()

  const costoTotal = useMemo(() => rows.reduce((s, r) => s + r.costo, 0), [rows])
  const costoPorUnidad = sr.rendimiento > 0 ? costoTotal / sr.rendimiento : 0

  const margenSeg = Math.max(0, Number(margenSegStr) || 0)
  const costoAjustado = costoTotal * (1 + margenSeg / 100)
  const costoAjustadoPorUnidad = sr.rendimiento > 0 ? costoAjustado / sr.rendimiento : 0

  const saveMargenSeg = async (val: string) => {
    const num = Math.max(0, Number(val) || 0)
    setMargenSegStr(String(num))
    if (num === (sr.margen_seguridad ?? 0)) return
    const { ok, error } = await saveMargenSeguridadSubreceta(sr.id, num)
    if (!ok) {
      console.error('[SubRecetaDetalle] Error al guardar margen_seguridad:', error)
    } else {
      setSr(s => ({ ...s, margen_seguridad: num }))
    }
  }

  const selectedIng = ingredientesDisponibles.find((i) => i.id === addSelId)
  const addPrecioUnit = selectedIng
    ? selectedIng.precio_compra / selectedIng.cantidad_presentacion
    : 0

  const addPreview = useMemo(() => {
    if (!selectedIng || !addNeta) return null
    return calcRow(Number(addNeta), Number(addMerma) || 0, addPrecioUnit)
  }, [addSelId, addNeta, addMerma])

  const saveHeader = async () => {
    const rend = Math.max(0.0001, Number(rendEdit) || 1)
    await supabase
      .from('sub_recetas')
      .update({ nombre: nombreEdit.trim(), rendimiento: rend })
      .eq('id', sr.id)
    setSr((s) => ({ ...s, nombre: nombreEdit.trim(), rendimiento: rend }))
    setEditingHeader(false)
  }

  const syncCosto = async (newRows: IngRow[]) => {
    const total = newRows.reduce((s, r) => s + r.costo, 0)
    await syncCostoSubreceta(sr.id, total)
    setSr((s) => ({ ...s, costo_total: total }))
  }

  const openEdit = (row: IngRow) => {
    setEditingRow(row)
    setAddSelId(row.ingrediente_id)
    setAddNeta(String(row.cantidad_neta))
    setAddMerma(String(row.peso_merma))
    setShowAddForm(true)
  }


  const closeForm = () => {
    setShowAddForm(false); setEditingRow(null)
    setAddSelId(''); setAddNeta(''); setAddMerma('0')
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIng || !addNeta) return
    setAddLoading(true)
    setAddErr(null)

    const neta = Number(addNeta)
    const merma = Number(addMerma) || 0
    const calc = calcRow(neta, merma, addPrecioUnit)

    if (editingRow) {
      const { ok, error } = await updateIngredienteSubreceta(editingRow.id, sr.id, {
        ingrediente_id: selectedIng.id,
        cantidad_neta: neta, peso_merma: merma,
        cantidad_bruta: calc.cantidad_bruta,
        porcentaje_merma: calc.porcentaje_merma,
        costo: calc.costo,
      })
      if (!ok) {
        setAddErr(error ?? 'Error al actualizar')
        setAddLoading(false)
        return
      }
      const newRows = rows.map(r => r.id === editingRow.id
        ? { ...r, ingrediente_id: selectedIng.id, nombre: selectedIng.nombre,
            unidad: selectedIng.unidad_medida, precio_unitario: addPrecioUnit,
            cantidad_neta: neta, peso_merma: merma, ...calc }
        : r)
      setRows(newRows)
      await syncCosto(newRows)
    } else {
      const { id: newId, error } = await insertIngredienteSubreceta({
        sub_receta_id: sr.id,
        ingrediente_id: selectedIng.id,
        cantidad_neta: neta,
        peso_merma: merma,
        cantidad_bruta: calc.cantidad_bruta,
        porcentaje_merma: calc.porcentaje_merma,
        costo: calc.costo,
      })
      if (!newId) {
        setAddErr(error ?? 'Error al guardar')
        setAddLoading(false)
        return
      }
      const newRows = [...rows, {
        id: newId,
        ingrediente_id: selectedIng.id,
        nombre: selectedIng.nombre,
        unidad: selectedIng.unidad_medida,
        precio_unitario: addPrecioUnit,
        cantidad_neta: neta,
        peso_merma: merma,
        ...calc,
      }]
      setRows(newRows)
      await syncCosto(newRows)
    }

    setAddLoading(false)
    setEditingRow(null)
    setAddSelId(''); setAddNeta(''); setAddMerma('0')
    // Volver al primer campo — flujo Excel
    setTimeout(() => comboRef.current?.focus(), 30)
  }

  const handleDelete = async (rowId: string) => {
    const { ok, error } = await deleteIngredienteSubreceta(rowId, sr.id)
    if (!ok) { console.error('[SubRecetaDetalle] DELETE error:', error); return }
    const newRows = rows.filter((r) => r.id !== rowId)
    setRows(newRows)
    await syncCosto(newRows)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.push('/sub-recetas')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Regresar a sub-recetas
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        {editingHeader ? (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
              <input value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-slate-500 mb-1">Rendimiento ({sr.unidad_rendimiento})</label>
              <input type="number" value={rendEdit} onChange={(e) => setRendEdit(e.target.value)} min="0.0001" step="any"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveHeader} className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium">
                <Check size={14} /> Guardar
              </button>
              <button onClick={() => setEditingHeader(false)} className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layers size={20} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{sr.nombre}</h1>
                <p className="text-sm text-slate-400">Rendimiento: {sr.rendimiento} {sr.unidad_rendimiento}</p>
              </div>
            </div>
            <button onClick={() => { setNombreEdit(sr.nombre); setRendEdit(String(sr.rendimiento)); setEditingHeader(true) }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <Pencil size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Ingredientes</h2>
          {isLocked ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Lock size={13} /> Plan Pro
            </span>
          ) : (
            <button onClick={() => { closeForm(); setShowAddForm(s => !s) }}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
              <Plus size={15} />
              Agregar
            </button>
          )}
        </div>

        {/* Lock banner */}
        {isLocked && (
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
            <Lock size={15} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Sub-receta bloqueada</span> — actualiza al plan Básico para editar ingredientes.
            </p>
          </div>
        )}

        {/* Add/Edit form */}
        {!isLocked && showAddForm && (
          <form onSubmit={handleAdd} className="px-5 py-4 bg-brand-50 border-b border-brand-100 space-y-3">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
              {editingRow ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Ingrediente</label>
                <ComboBox
                  ref={comboRef}
                  options={ingredientesDisponibles.map(i => ({
                    value: i.id,
                    label: [i.nombre, i.marca].filter(Boolean).join(' · '),
                    subLabel: [
                      `${i.cantidad_presentacion} ${i.unidad_medida}`,
                      i.proveedor ?? null,
                      `${fmt(i.precio_compra / i.cantidad_presentacion)}/${i.unidad_medida}`,
                    ].filter(Boolean).join('  ·  '),
                  }))}
                  value={addSelId}
                  onChange={setAddSelId}
                  onConfirm={() => document.getElementById('sr-cantidad')?.focus()}
                  placeholder="Escribe para buscar un ingrediente..."
                  minChars={1}
                  maxResults={8}
                  tabIndex={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cantidad neta {selectedIng && `(${selectedIng.unidad_medida})`}
                </label>
                <input
                  id="sr-cantidad"
                  type="number" value={addNeta} onChange={(e) => setAddNeta(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('sr-merma')?.focus() } }}
                  placeholder="0" min="0.0001" step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Peso de merma {selectedIng && `(${selectedIng.unidad_medida})`}
                </label>
                <input
                  id="sr-merma"
                  type="number" value={addMerma} onChange={(e) => setAddMerma(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('sr-agregar')?.click() } }}
                  placeholder="0" min="0" step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-slate-400 mt-1">
                  Ingresa el peso que se desperdicia en la misma unidad que la cantidad neta{selectedIng ? ` (${selectedIng.unidad_medida})` : ''}.
                </p>
              </div>
            </div>
            {addPreview && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-white border border-brand-200 rounded-lg text-xs">
                <div><span className="text-slate-400">Bruto</span>
                  <div className="font-semibold">{addPreview.cantidad_bruta.toFixed(4)} {selectedIng?.unidad_medida}</div></div>
                <div><span className="text-slate-400">% Merma</span>
                  <div className="font-semibold">{pct(addPreview.porcentaje_merma)}</div></div>
                <div><span className="text-slate-400">Costo</span>
                  <div className="font-bold text-brand-600">{fmt(addPreview.costo)}</div></div>
              </div>
            )}
            {addErr && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Error: {addErr}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={closeForm}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button id="sr-agregar" type="submit" disabled={addLoading || !addSelId || !addNeta}
                className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {addLoading ? 'Guardando...' : editingRow ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        )}

        {rows.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Sin ingredientes todavía.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Ingrediente','Neto','Merma','Bruto','% Merma','Precio/u','Costo',''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h===''?'':(h==='Ingrediente'?'text-left':'text-right')}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.nombre}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.cantidad_neta} {row.unidad}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.peso_merma} {row.unidad}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.cantidad_bruta.toFixed(4)} {row.unidad}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${row.porcentaje_merma > 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {pct(row.porcentaje_merma)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">{fmt(row.precio_unitario)}/{row.unidad}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(row.costo)}</td>
                      <td className="px-4 py-3">
                        {!isLocked && (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900 text-sm">{row.nombre}</span>
                    <div className="flex gap-1">
                      {!isLocked && <>
                        <button onClick={() => openEdit(row)} className="p-1 text-slate-400 hover:text-slate-600"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(row.id)} className="text-slate-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                      </>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div><span className="block text-slate-400">Neto</span>{row.cantidad_neta} {row.unidad}</div>
                    <div><span className="block text-slate-400">Merma</span>{row.peso_merma} {row.unidad} ({pct(row.porcentaje_merma)})</div>
                    <div><span className="block text-slate-400">Costo</span><span className="font-semibold text-slate-800">{fmt(row.costo)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer totals */}
        {rows.length > 0 && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
            {/* Cost row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Costo total de la sub-receta</span>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-900">{fmt(costoTotal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Por {sr.unidad_rendimiento}</span>
                  <span className="font-bold text-brand-600">{fmt(costoPorUnidad)}</span>
                </div>
              </div>
            </div>

            {/* Margen de seguridad */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Margen de seguridad (%)</label>
                  <div className="relative w-28">
                    <input
                      type="number" value={margenSegStr}
                      onChange={e => setMargenSegStr(e.target.value)}
                      onBlur={e => saveMargenSeg(e.target.value)}
                      min="0" max="200" step="0.5" placeholder="0"
                      className="w-full pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">Buffer sobre el costo</p>
              </div>

              {margenSeg > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-amber-500 block">Total ajustado (+{margenSeg}%)</span>
                    <span className="font-bold text-amber-600">{fmt(costoAjustado)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-amber-500 block">Por {sr.unidad_rendimiento} ajustado</span>
                    <span className="font-bold text-amber-600">{fmt(costoAjustadoPorUnidad)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
