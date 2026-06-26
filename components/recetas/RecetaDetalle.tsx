'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft, Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown,
  ChefHat, Pencil, Check, X, Printer, Clock, AlertCircle, Camera, Loader2,
  HelpCircle, Lock, FileText, Share2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  insertIngredienteReceta,
  updateIngredienteReceta,
  deleteIngredienteReceta,
  syncCostosReceta,
  saveFotoUrl,
  saveNotas,
} from '@/app/(dashboard)/recetas/[id]/actions'
import PrintModal from './PrintModal'
import CompartirRecetaModal from './CompartirRecetaModal'
import QuickIngredienteModal from './QuickIngredienteModal'
import ComboBox from '@/components/ui/ComboBox'
import type { Ingrediente, Receta, PlataformaDelivery } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
interface IngRow {
  id: string
  ingrediente_id: string | null
  sub_receta_id: string | null
  nombre: string; unidad: string; precio_unitario: number
  cantidad_neta: number; peso_merma: number
  cantidad_bruta: number; porcentaje_merma: number; costo: number
  precio_unitario_capturado: number | null
  proveedor: string | null
}
interface SubRecetaOption {
  id: string; nombre: string; costo_total: number; rendimiento: number; unidad_rendimiento: string
}
interface Props {
  receta: Receta
  ingredientesReceta: IngRow[]
  ingredientesDisponibles: Ingrediente[]
  subRecetasDisponibles: SubRecetaOption[]
  plataformasDelivery: PlataformaDelivery[]
  iva: number; margenMinimo: number; comisionBancaria: number
  plan: 'free' | 'basic' | 'pro'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
const pct  = (v: number) => `${v.toFixed(2)}%`
const diff = (current: number, captured: number | null) =>
  captured !== null && Math.abs(current - captured) / (captured || 1) > 0.001

function calcRow(neta: number, merma: number, pu: number) {
  const bruta = neta + merma
  return {
    cantidad_bruta:    bruta,
    porcentaje_merma:  bruta > 0 ? (merma / bruta) * 100 : 0,
    costo:             pu * bruta,
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}
function isStale(iso: string) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + 3)
  return d < new Date()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RecetaDetalle({
  receta: recetaInit, ingredientesReceta, ingredientesDisponibles: ingredientesIniciales,
  subRecetasDisponibles, plataformasDelivery, iva, margenMinimo, comisionBancaria, plan,
}: Props) {
  const [receta, setReceta]         = useState(recetaInit)
  const [rows, setRows]             = useState<IngRow[]>(ingredientesReceta)
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState<Ingrediente[]>(ingredientesIniciales)
  const [editingHeader, setEditingHeader] = useState(false)
  const [nombreEdit, setNombreEdit] = useState(receta.nombre)
  const [porcionesEdit, setPorcionesEdit] = useState(String(receta.porciones))
  const [precioVenta, setPrecioVenta] = useState(String(receta.precio_venta ?? ''))
  const [margenSegStr, setMargenSegStr] = useState(String(receta.margen_seguridad ?? 0))
  const [plataformaId, setPlataformaId] = useState<string>(receta.plataforma_delivery_id ?? '')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRow, setEditingRow]   = useState<IngRow | null>(null)
  const [addLoading, setAddLoading]   = useState(false)
  const [addError, setAddError]       = useState<string | null>(null)
  const [showPrintModal, setShowPrintModal]       = useState(false)
  const [showShareModal, setShowShareModal]       = useState(false)
  const [fotoUrl, setFotoUrl]               = useState<string | null>(recetaInit.foto_url ?? null)
  const [fotoUploading, setFotoUploading]   = useState(false)
  const [fotoError, setFotoError]           = useState<string | null>(null)
  const [fotoLightbox, setFotoLightbox]     = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [editingNotas, setEditingNotas]     = useState(false)
  const [notasEdit, setNotasEdit]           = useState(recetaInit.notas ?? '')
  const [notasSaving, setNotasSaving]       = useState(false)

  // Add/edit form state — value is prefixed: "ing:<uuid>" or "sr:<uuid>"
  const [addSelId, setAddSelId] = useState('')
  const [addNeta, setAddNeta]   = useState('')
  const [addMerma, setAddMerma] = useState('0')

  // Ref solo para el ComboBox (retorno de foco tras agregar)
  const comboRef = useRef<HTMLInputElement>(null)

  // Quick-create ingrediente inline
  const [quickCreateQuery, setQuickCreateQuery] = useState<string | null>(null)

  const isLocked = false
  const canAddPhoto = plan === 'basic' || plan === 'pro'

  const router = useRouter()
  const supabase = createClient()

  // ── Totals ────────────────────────────────────────────────────────────────
  const costoTotal   = useMemo(() => rows.reduce((s, r) => s + r.costo, 0), [rows])
  const costoPorcion = useMemo(() => receta.porciones > 0 ? costoTotal / receta.porciones : 0, [costoTotal, receta.porciones])

  const margenSeg = Math.max(0, Number(margenSegStr) || 0)
  const costoAjustado = costoPorcion * (1 + margenSeg / 100)

  const precio = Number(precioVenta) || 0
  const plataformaActual = plataformasDelivery.find(p => p.id === plataformaId)

  const margenCalc = useMemo(() => {
    if (precio <= 0 || costoAjustado <= 0) return null
    const sinIva        = precio / (1 + iva / 100)
    const ivaMonto      = precio - sinIva
    const costosPct     = sinIva > 0 ? (costoAjustado / sinIva) * 100 : 0
    const margenBruto   = sinIva - costoAjustado
    const margenPct     = sinIva > 0 ? (margenBruto / sinIva) * 100 : 0
    const comBancaria   = plataformaActual ? 0 : precio * (comisionBancaria / 100)
    const comDelivery   = plataformaActual ? sinIva * (plataformaActual.comision_porcentaje / 100) : 0
    const margenNeto    = margenBruto - comBancaria - comDelivery
    const margenNetoPct = sinIva > 0 ? (margenNeto / sinIva) * 100 : 0
    return {
      sinIva, ivaMonto, costosPct, margenPesos: margenBruto, margenPct,
      comBancaria, comDelivery, margenNeto, margenNetoPct,
      pctBancaria: comisionBancaria,
      pctDelivery: plataformaActual?.comision_porcentaje ?? 0,
      plataformaNombre: plataformaActual?.nombre,
    }
  }, [precio, costoAjustado, iva, comisionBancaria, plataformaActual])

  const margenOk  = margenCalc !== null && margenCalc.margenNetoPct >= margenMinimo

  // ── Save margen_seguridad ─────────────────────────────────────────────────
  const saveMargenSeg = async (val: string) => {
    const num = Math.max(0, Number(val) || 0)
    setMargenSegStr(String(num))
    if (num === (receta.margen_seguridad ?? 0)) return
    const { error } = await supabase
      .from('recetas')
      .update({ margen_seguridad: num })
      .eq('id', receta.id)
    if (error) {
      console.error('[RecetaDetalle] Error al guardar margen_seguridad:', error)
    } else {
      setReceta(r => ({ ...r, margen_seguridad: num }))
    }
  }
  const stale     = isStale(receta.updated_at)
  const hasAlerts = rows.some(r => diff(r.precio_unitario, r.precio_unitario_capturado))

  // ── Header save ───────────────────────────────────────────────────────────
  const saveHeader = async () => {
    const pors = Math.max(1, parseInt(porcionesEdit) || 1)
    await supabase.from('recetas').update({ nombre: nombreEdit.trim(), porciones: pors }).eq('id', receta.id)
    setReceta(r => ({ ...r, nombre: nombreEdit.trim(), porciones: pors }))
    setEditingHeader(false)
  }

  // ── Save precio_venta + plataforma ────────────────────────────────────────
  const savePrecioVenta = async (val: string) => {
    const num = Number(val) || null
    await supabase.from('recetas').update({ precio_venta: num }).eq('id', receta.id)
    setReceta(r => ({ ...r, precio_venta: num }))
  }

  const savePlataforma = async (val: string) => {
    const id = val || null
    await supabase.from('recetas').update({ plataforma_delivery_id: id }).eq('id', receta.id)
    setReceta(r => ({ ...r, plataforma_delivery_id: id }))
    setPlataformaId(val)
  }

  // ── Sync costs to DB ──────────────────────────────────────────────────────
  const syncCostos = async (newRows: IngRow[]) => {
    const total = newRows.reduce((s, r) => s + r.costo, 0)
    const porcion = receta.porciones > 0 ? total / receta.porciones : 0
    await syncCostosReceta(receta.id, total, porcion)
  }

  // ── Photo upload ─────────────────────────────────────────────────────────
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoUploading(true)
    setFotoError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFotoUploading(false); setFotoError('No autenticado'); return }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${receta.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('recetas-fotos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setFotoError(`Error al subir imagen: ${uploadErr.message}`)
      setFotoUploading(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('recetas-fotos')
      .getPublicUrl(path)

    const { ok, error: saveErr } = await saveFotoUrl(receta.id, publicUrl)
    if (!ok) {
      setFotoError(`Imagen subida pero no se guardó la URL: ${saveErr}`)
    } else {
      setFotoUrl(`${publicUrl}?t=${Date.now()}`)
    }

    setFotoUploading(false)
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  async function handleSaveNotas() {
    setNotasSaving(true)
    await saveNotas(receta.id, notasEdit)
    setEditingNotas(false)
    setNotasSaving(false)
  }

  // ── Unified options list (ingredientes + sub-recetas), sorted by name ────
  const unifiedOptions = useMemo(() => [
    ...ingredientesDisponibles.map(i => ({
      value: `ing:${i.id}`,
      label: [i.nombre, i.marca ?? null].filter(Boolean).join(' · '),
      subLabel: [
        i.proveedor ?? null,
        `${fmt(i.precio_compra / i.cantidad_presentacion)} / ${i.unidad_medida}`,
      ].filter(Boolean).join('  ·  '),
      tag: { text: 'Ing', className: 'bg-brand-100 text-brand-700' },
    })),
    ...subRecetasDisponibles.map(s => ({
      value: `sr:${s.id}`,
      label: s.nombre,
      subLabel: `${s.rendimiento} ${s.unidad_rendimiento}  ·  ${fmt(s.rendimiento > 0 ? s.costo_total / s.rendimiento : 0)} / ${s.unidad_rendimiento}`,
      tag: { text: 'Sub', className: 'bg-blue-100 text-blue-700' },
    })),
  ].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
  [ingredientesDisponibles, subRecetasDisponibles])

  // ── Get selected option for add form ─────────────────────────────────────
  const getOption = () => {
    if (!addSelId) return null
    if (addSelId.startsWith('ing:')) {
      const id  = addSelId.slice(4)
      const ing = ingredientesDisponibles.find(i => i.id === id)
      if (!ing) return null
      const pu  = ing.precio_compra / ing.cantidad_presentacion
      return { nombre: ing.nombre, unidad: ing.unidad_medida, precio_unitario: pu, ingrediente_id: ing.id, sub_receta_id: null, proveedor: ing.proveedor ?? null }
    } else {
      const id = addSelId.slice(3)
      const sr = subRecetasDisponibles.find(s => s.id === id)
      if (!sr) return null
      const pu = sr.rendimiento > 0 ? sr.costo_total / sr.rendimiento : 0
      return { nombre: sr.nombre, unidad: sr.unidad_rendimiento, precio_unitario: pu, ingrediente_id: null, sub_receta_id: sr.id, proveedor: null }
    }
  }

  const addPreview = useMemo(() => {
    const opt = getOption()
    if (!opt || !addNeta) return null
    return calcRow(Number(addNeta), Number(addMerma) || 0, opt.precio_unitario)
  }, [addSelId, addNeta, addMerma])

  // ── Open edit row ─────────────────────────────────────────────────────────
  const openEdit = (row: IngRow) => {
    setEditingRow(row)
    setAddSelId(row.ingrediente_id ? `ing:${row.ingrediente_id}` : `sr:${row.sub_receta_id}`)
    setAddNeta(String(row.cantidad_neta))
    setAddMerma(String(row.peso_merma))
    setShowAddForm(true)
  }

  const closeForm = () => {
    setShowAddForm(false); setEditingRow(null)
    setAddSelId(''); setAddNeta(''); setAddMerma('0'); setAddError(null)
  }

  // ── Submit add/edit (core logic, no event needed) ────────────────────────
  const submitRow = async () => {
    if (!addSelId || !addNeta) return

    setAddError(null)

    // Resolve option from current addSelId
    const opt = getOption()
    if (!opt) {
      setAddError(`No se encontró el elemento seleccionado (addSelId: ${addSelId})`)
      return
    }

    setAddLoading(true)

    const neta  = Number(addNeta)
    const merma = Number(addMerma) || 0
    const calc  = calcRow(neta, merma, opt.precio_unitario)
    const payload = {
      cantidad_neta: neta, peso_merma: merma,
      cantidad_bruta: calc.cantidad_bruta, porcentaje_merma: calc.porcentaje_merma,
      costo: calc.costo, precio_unitario_capturado: opt.precio_unitario,
    }

    if (editingRow) {
      const { ok, error: updErr } = await updateIngredienteReceta(editingRow.id, receta.id, payload)
      if (!ok) {
        setAddError(`Error al actualizar: ${updErr}`)
        setAddLoading(false)
        return
      }
      const newRows = rows.map(r => r.id === editingRow.id
        ? { ...r, ...payload, nombre: opt.nombre, unidad: opt.unidad, precio_unitario: opt.precio_unitario,
            ingrediente_id: opt.ingrediente_id, sub_receta_id: opt.sub_receta_id, proveedor: opt.proveedor }
        : r)
      setRows(newRows)
      await syncCostos(newRows)
    } else {
      const { id: newId, error: insErr } = await insertIngredienteReceta({
        receta_id: receta.id,
        ingrediente_id: opt.ingrediente_id,
        sub_receta_id: opt.sub_receta_id,
        ...payload,
      })

      if (insErr || !newId) {
        setAddError(`Error al guardar: ${insErr ?? 'Sin ID devuelto'}`)
        setAddLoading(false)
        return
      }

      const newRow: IngRow = {
        id: newId, ingrediente_id: opt.ingrediente_id, sub_receta_id: opt.sub_receta_id,
        nombre: opt.nombre, unidad: opt.unidad, precio_unitario: opt.precio_unitario,
        cantidad_neta: neta, peso_merma: merma, ...calc,
        precio_unitario_capturado: opt.precio_unitario,
        proveedor: opt.proveedor,
      }
      const newRows = [...rows, newRow]
      setRows(newRows)
      await syncCostos(newRows)
    }

    setAddLoading(false)
    setEditingRow(null)
    setAddSelId(''); setAddNeta(''); setAddMerma('0')
    // Volver al primer campo — flujo Excel
    setTimeout(() => comboRef.current?.focus(), 30)
  }

  const handleSubmitRow = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitRow()
  }


  const handleDeleteRow = async (rowId: string) => {
    const { ok, error: delErr } = await deleteIngredienteReceta(rowId, receta.id)
    if (!ok) {
      console.error('[RecetaDetalle] DELETE error:', delErr)
      return
    }
    const newRows = rows.filter(r => r.id !== rowId)
    setRows(newRows)
    await syncCostos(newRows)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/recetas')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Regresar
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-indigo-200 text-indigo-600 bg-indigo-50 rounded-lg text-sm hover:bg-indigo-100 transition-colors">
              <Share2 size={15} /> Compartir
            </button>
            <button onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Alerts bar */}
        {(stale || hasAlerts) && (
          <div className="space-y-2">
            {stale && (
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <Clock size={16} className="text-amber-500 flex-shrink-0" />
                <span><strong>Verificar precios:</strong> Esta receta lleva más de 3 meses sin modificarse.</span>
              </div>
            )}
            {hasAlerts && (
              <div className="flex items-center gap-2.5 p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800">
                <AlertCircle size={16} className="text-brand-500 flex-shrink-0" />
                <span><strong>Cambio de precio detectado:</strong> Uno o más ingredientes cambiaron de precio desde la última vez que se guardaron.</span>
              </div>
            )}
          </div>
        )}

        {/* Recipe header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Photo strip */}
          <div className="relative w-full h-40 bg-gradient-to-br from-brand-50 to-amber-50">
            {fotoUrl ? (
              <button onClick={() => setFotoLightbox(true)} className="absolute inset-0 w-full h-full cursor-zoom-in">
                <Image src={fotoUrl} alt={receta.nombre} fill className="object-cover" />
              </button>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
                <ChefHat size={36} />
                <span className="text-xs">Sin foto</span>
              </div>
            )}
            {/* Upload overlay */}
            {canAddPhoto ? (
              <label className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors backdrop-blur-sm">
                {fotoUploading
                  ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</>
                  : <><Camera size={13} /> {fotoUrl ? 'Cambiar foto' : 'Subir foto'}</>}
                <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={handleFotoChange} disabled={fotoUploading} />
              </label>
            ) : (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 text-white/70 text-xs font-medium rounded-lg backdrop-blur-sm cursor-not-allowed"
                title="Foto del platillo disponible en Plan Básico">
                <Lock size={12} /> Foto · Plan Básico
              </div>
            )}
            {fotoError && (
              <div className="absolute bottom-2 left-2 right-24 p-2 bg-red-600/90 text-white text-xs rounded-lg font-mono break-all">
                {fotoError}
              </div>
            )}
          </div>

          <div className="p-5">
          {editingHeader ? (
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input value={nombreEdit} onChange={e => setNombreEdit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-500 mb-1">Porciones</label>
                <input type="number" value={porcionesEdit} onChange={e => setPorcionesEdit(e.target.value)} min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveHeader}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium">
                  <Check size={14} /> Guardar
                </button>
                <button onClick={() => setEditingHeader(false)}
                  className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">{receta.nombre}</h1>
                    {stale && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        <Clock size={11} /> Verificar precios
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    {receta.porciones} porción{receta.porciones !== 1 ? 'es' : ''}
                    <span className="mx-1.5">·</span>
                    Modificado: {fmtDate(receta.updated_at)}
                  </p>
                </div>
              </div>
              <button onClick={() => { setNombreEdit(receta.nombre); setPorcionesEdit(String(receta.porciones)); setEditingHeader(true) }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <Pencil size={16} />
              </button>
            </div>
          )}
          </div>{/* /p-5 */}
        </div>

        {/* Ingredients table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Ingredientes</h2>
            {isLocked ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock size={13} /> Plan Básico
              </span>
            ) : (
              <button onClick={() => { closeForm(); setShowAddForm(s => !s) }}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                <Plus size={15} /> Agregar
              </button>
            )}
          </div>

          {/* Lock banner */}
          {isLocked && (
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
              <Lock size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Receta bloqueada</span> — actualiza al plan Básico para editar ingredientes.
              </p>
            </div>
          )}

          {/* Add/Edit form */}
          {!isLocked && showAddForm && (
            <form onSubmit={handleSubmitRow} className="px-5 py-4 bg-brand-50 border-b border-brand-100 space-y-3">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                {editingRow ? 'Editar ingrediente' : 'Nuevo ingrediente'}
              </p>
              <p className="text-xs text-slate-500">
                Busca con texto · ↑↓ para navegar · <kbd className="bg-white border border-slate-200 rounded px-1">Enter</kbd> para seleccionar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ingrediente o Sub-Receta
                  </label>
                  <ComboBox
                    ref={comboRef}
                    options={unifiedOptions}
                    value={addSelId}
                    onChange={setAddSelId}
                    onConfirm={() => document.getElementById('r-cantidad')?.focus()}
                    placeholder="Escribe para buscar ingrediente o sub-receta…"
                    minChars={1}
                    maxResults={12}
                    tabIndex={1}
                    onCreateNew={q => setQuickCreateQuery(q)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-slate-600">
                      Cantidad neta {addSelId && `(${getOption()?.unidad ?? ''})`}
                    </label>
                    <span className="group relative cursor-help">
                      <HelpCircle size={12} className="text-slate-400" />
                      <span className="absolute left-0 top-5 z-20 w-56 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed">
                        1 = 1&nbsp;kg / 1&nbsp;L / 1&nbsp;Pz<br />
                        Para gramos usa decimales:<br />
                        0.200 = 200 g
                      </span>
                    </span>
                  </div>
                  <input
                    id="r-cantidad"
                    type="number" value={addNeta} onChange={e => setAddNeta(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('r-merma')?.focus() } }}
                    placeholder="0" min="0.0001" step="any"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Peso de merma {addSelId && `(${getOption()?.unidad ?? ''})`}
                  </label>
                  <input
                    id="r-merma"
                    type="number" value={addMerma} onChange={e => setAddMerma(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('r-agregar')?.click() } }}
                    placeholder="0" min="0" step="any"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <p className="text-xs text-slate-400 mt-1">
                    Ingresa el peso que se desperdicia en la misma unidad que la cantidad neta{addSelId && getOption()?.unidad ? ` (${getOption()?.unidad})` : ''}. Enter para agregar.
                  </p>
                </div>
              </div>
              {addPreview && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-white border border-brand-200 rounded-lg text-xs">
                  <div><span className="text-slate-400">Cantidad bruta</span>
                    <div className="font-semibold">{addPreview.cantidad_bruta.toFixed(4)} {getOption()?.unidad}</div></div>
                  <div><span className="text-slate-400">% Merma</span>
                    <div className="font-semibold">{pct(addPreview.porcentaje_merma)}</div></div>
                  <div><span className="text-slate-400">Costo</span>
                    <div className="font-bold text-brand-600">{fmt(addPreview.costo)}</div></div>
                </div>
              )}
              {addError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 font-mono break-all">
                  <span className="font-bold">Error: </span>{addError}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={closeForm}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button id="r-agregar" type="submit" disabled={addLoading || !addSelId || !addNeta}
                  className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {addLoading ? 'Guardando...' : editingRow ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          {rows.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Sin ingredientes. Haz clic en <strong>Agregar</strong> para comenzar.
            </div>
          ) : (
            <>
              {/* Desktop */}
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
                    {rows.map(row => {
                      const priceChanged = diff(row.precio_unitario, row.precio_unitario_capturado)
                      return (
                        <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${priceChanged ? 'bg-brand-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-900">{row.nombre}</span>
                              {priceChanged && (
                                <span title={`Precio capturado: ${fmt(row.precio_unitario_capturado!)} | Actual: ${fmt(row.precio_unitario)}`}
                                  className="flex items-center gap-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full cursor-help">
                                  <AlertTriangle size={10} /> Precio cambió
                                </span>
                              )}
                            </div>
                          </td>
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
                                <button onClick={() => openEdit(row)}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Editar">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDeleteRow(row.id)}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="Eliminar">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {rows.map(row => {
                  const priceChanged = diff(row.precio_unitario, row.precio_unitario_capturado)
                  return (
                    <div key={row.id} className={`px-4 py-3 ${priceChanged ? 'bg-brand-50/40' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-900 text-sm">{row.nombre}</span>
                          {priceChanged && <AlertTriangle size={13} className="text-brand-500" />}
                        </div>
                        {!isLocked && (
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(row)} className="p-1 text-slate-400 hover:text-slate-600"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteRow(row.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="block text-slate-400">Neto</span>{row.cantidad_neta} {row.unidad}</div>
                        <div><span className="block text-slate-400">Merma</span>{row.peso_merma} {row.unidad} ({pct(row.porcentaje_merma)})</div>
                        <div><span className="block text-slate-400">Costo</span><span className="font-semibold">{fmt(row.costo)}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {rows.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
              <span className="text-slate-500">Costo total</span>
              <div className="flex gap-4">
                <div className="text-right"><span className="text-xs text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-900">{fmt(costoTotal)}</span></div>
                <div className="text-right"><span className="text-xs text-slate-400 block">Por porción</span>
                  <span className="font-bold text-brand-600">{fmt(costoPorcion)}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Margin analysis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Análisis de Margen</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio de venta al público</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" value={precioVenta}
                    onChange={e => setPrecioVenta(e.target.value)}
                    onBlur={e => savePrecioVenta(e.target.value)}
                    min="0" step="0.01" placeholder="0.00"
                    className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Precio con IVA / VAT / Tax incluido</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Margen de seguridad (%)</label>
                <div className="relative">
                  <input type="number" value={margenSegStr}
                    onChange={e => setMargenSegStr(e.target.value)}
                    onBlur={e => saveMargenSeg(e.target.value)}
                    min="0" max="200" step="0.5" placeholder="0"
                    className="w-full pr-7 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Buffer sobre el costo para precio sugerido</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plataforma de delivery</label>
                <select value={plataformaId} onChange={e => savePlataforma(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Sin plataforma (venta directa)</option>
                  {plataformasDelivery.filter(p => p.activa).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.comision_porcentaje}%)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost breakdown (costo real vs ajustado) */}
            {costoPorcion > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Costo real / porción</div>
                  <div className="font-semibold text-slate-700">{fmt(costoPorcion)}</div>
                </div>
                {margenSeg > 0 ? (
                  <>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Margen de seguridad (+{margenSeg}%)</div>
                      <div className="font-semibold text-amber-600">+{fmt(costoAjustado - costoPorcion)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Costo ajustado / porción</div>
                      <div className="font-bold text-brand-600">{fmt(costoAjustado)}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 flex items-end pb-0.5 col-span-2">
                    Sin margen de seguridad aplicado
                  </div>
                )}
              </div>
            )}

            {margenCalc ? (
              <div className={`rounded-xl border-2 p-5 ${margenOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><div className="text-xs text-slate-500 mb-0.5">IVA / VAT / Tax ({iva}%)</div>
                    <div className="font-semibold text-slate-800">{fmt(margenCalc.ivaMonto)}</div></div>
                  <div><div className="text-xs text-slate-500 mb-0.5">Precio sin IVA / VAT / Tax</div>
                    <div className="font-semibold text-slate-800">{fmt(margenCalc.sinIva)}</div></div>
                  <div><div className="text-xs text-slate-500 mb-0.5">Costo ajustado como % precio</div>
                    <div className="font-semibold text-slate-800">{pct(margenCalc.costosPct)}</div></div>
                  <div><div className="text-xs text-slate-500 mb-0.5">Margen bruto</div>
                    <div className="font-semibold text-slate-800">{fmt(margenCalc.margenPesos)} ({pct(margenCalc.margenPct)})</div></div>
                </div>

                {(comisionBancaria > 0 || plataformaActual) && (
                  <div className="bg-white/60 rounded-lg p-3 mb-4 space-y-1.5 text-xs">
                    {comisionBancaria > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>− Comisión bancaria ({pct(comisionBancaria)})</span>
                        <span className="font-medium text-red-600">−{fmt(margenCalc.comBancaria)}</span>
                      </div>
                    )}
                    {plataformaActual && (
                      <div className="flex justify-between text-slate-600">
                        <span>− {plataformaActual.nombre} ({pct(plataformaActual.comision_porcentaje)})</span>
                        <span className="font-medium text-red-600">−{fmt(margenCalc.comDelivery)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
                      <span>Margen neto</span>
                      <span>{fmt(margenCalc.margenNeto)}</span>
                    </div>
                  </div>
                )}

                <div className={`flex items-center justify-between p-3 rounded-lg ${margenOk ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className="flex items-center gap-2">
                    {margenOk ? <TrendingUp size={18} className="text-green-600" /> : <TrendingDown size={18} className="text-red-500" />}
                    <span className={`text-sm font-bold ${margenOk ? 'text-green-700' : 'text-red-600'}`}>
                      % Margen {plataformaActual || comisionBancaria > 0 ? 'neto' : 'bruto'}: {pct(margenCalc.margenNetoPct)}
                    </span>
                  </div>
                  {!margenOk && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertTriangle size={13} /> Por debajo del mínimo ({pct(margenMinimo)})
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                {costoPorcion > 0
                  ? 'Ingresa el precio de venta para ver el análisis.'
                  : 'Agrega ingredientes y el precio de venta.'}
              </div>
            )}
          </div>
        </div>

        {/* Notas de la receta */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Notas de la receta</h2>
            </div>
            {!editingNotas ? (
              <button
                onClick={() => setEditingNotas(true)}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                <Pencil size={12} /> Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setNotasEdit(receta.notas ?? ''); setEditingNotas(false) }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                >
                  <X size={12} /> Cancelar
                </button>
                <button
                  onClick={handleSaveNotas}
                  disabled={notasSaving}
                  className="flex items-center gap-1 text-xs bg-brand-600 text-white hover:bg-brand-700 px-3 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {notasSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Guardar
                </button>
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            {editingNotas ? (
              <textarea
                value={notasEdit}
                onChange={e => setNotasEdit(e.target.value)}
                placeholder="Instrucciones de preparación, tips, alérgenos, observaciones..."
                rows={6}
                className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y leading-relaxed"
              />
            ) : notasEdit ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{notasEdit}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin notas. Haz clic en Editar para agregar instrucciones, tips o alérgenos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Foto lightbox */}
      {fotoLightbox && fotoUrl && (
        <div
          onClick={() => setFotoLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
            <Image
              src={fotoUrl}
              alt={receta.nombre}
              width={1200}
              height={800}
              className="rounded-xl object-contain max-h-[85vh] w-full shadow-2xl"
            />
            <button
              onClick={() => setFotoLightbox(false)}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Print modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        recetaNombre={receta.nombre}
        porciones={receta.porciones}
        costoTotal={costoTotal}
        costoPorcion={costoPorcion}
        updatedAt={receta.updated_at}
        fotoUrl={fotoUrl}
        notas={notasEdit || null}
        rows={rows}
        margen={margenCalc ? {
          sinIva: margenCalc.sinIva, ivaMonto: margenCalc.ivaMonto,
          costosPct: margenCalc.costosPct, margenPesos: margenCalc.margenPesos,
          margenPct: margenCalc.margenNetoPct,
          pctBancaria: comisionBancaria, despuésBancaria: margenCalc.comBancaria,
          pctDelivery: margenCalc.pctDelivery, despuésDelivery: margenCalc.comDelivery,
          plataformaNombre: margenCalc.plataformaNombre,
        } : null}
        precioVenta={precio}
        iva={iva}
      />

      {/* Share modal */}
      {showShareModal && (
        <CompartirRecetaModal
          recetaId={receta.id}
          recetaNombre={receta.nombre}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Quick create ingrediente */}
      {quickCreateQuery !== null && (
        <QuickIngredienteModal
          nombreInicial={quickCreateQuery}
          onCerrar={() => setQuickCreateQuery(null)}
          onCreado={ing => {
            setIngredientesDisponibles(prev => [...prev, ing])
            setAddSelId(`ing:${ing.id}`)
            setQuickCreateQuery(null)
            setTimeout(() => document.getElementById('r-cantidad')?.focus(), 50)
          }}
        />
      )}
    </>
  )
}
