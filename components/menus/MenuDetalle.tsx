'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, ChefHat, Search, Printer,
  BookOpen, ExternalLink, Layers, TrendingUp, TrendingDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import MenuPrintModal from './MenuPrintModal'
import type { Menu, Receta, SubReceta } from '@/types'

// ── Row types ─────────────────────────────────────────────────────────────────

interface RecetaInfo {
  id: string; nombre: string
  costo_por_porcion: number; precio_venta: number | null; porciones: number
}

interface SubRecetaInfo {
  id: string; nombre: string
  rendimiento: number; unidad_rendimiento: string; costo_total: number
}

interface MenuItemRow {
  id: string  // menu_recetas.id
  receta:     RecetaInfo    | null
  sub_receta: SubRecetaInfo | null
}

interface Props {
  menu:                   Menu
  menuItems:              MenuItemRow[]
  recetasDisponibles:     Receta[]
  subRecetasDisponibles:  SubReceta[]
  margenMinimoGlobal:     number   // valor de user_profiles
  iva:                    number   // para calcular margen sin IVA
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

export default function MenuDetalle({
  menu: menuInit,
  menuItems: init,
  recetasDisponibles,
  subRecetasDisponibles,
  margenMinimoGlobal,
  iva,
}: Props) {
  const [menu, setMenu] = useState(menuInit)
  const [rows, setRows] = useState<MenuItemRow[]>(init)

  // ── Margen mínimo personalizado ───────────────────────────────────────────
  // El valor en pantalla: cadena vacía = usar el global
  const [margenStr, setMargenStr] = useState<string>(
    menu.margen_minimo != null ? String(menu.margen_minimo) : '',
  )
  const [savingMargen, setSavingMargen] = useState(false)

  // Margen efectivo: el del menú si está definido, si no el global
  const margenEfectivo = menu.margen_minimo ?? margenMinimoGlobal

  const handleMargenBlur = async () => {
    const trimmed = margenStr.trim()
    const parsed  = trimmed === '' ? null : Number(trimmed)

    // Validar: debe ser null o número entre 0 y 100
    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) return

    // Si no cambió, no guardar
    if (parsed === menu.margen_minimo) return

    setSavingMargen(true)
    const { error } = await supabase
      .from('menus')
      .update({ margen_minimo: parsed })
      .eq('id', menu.id)
    if (error) {
      console.error('[MenuDetalle] Error al guardar margen_minimo:', error)
    } else {
      setMenu(m => ({ ...m, margen_minimo: parsed }))
    }
    setSavingMargen(false)
  }

  // Calcular % de margen bruto sin IVA para una receta
  const calcMargen = (costo: number, precio: number | null): number | null => {
    if (!precio || precio <= 0 || costo <= 0) return null
    const sinIva = precio / (1 + iva / 100)
    if (sinIva <= 0) return null
    return ((sinIva - costo) / sinIva) * 100
  }

  // ── Add existing receta ───────────────────────────────────────────────────
  const [showAddReceta, setShowAddReceta]   = useState(false)
  const [searchReceta, setSearchReceta]     = useState('')
  const [addingReceta, setAddingReceta]     = useState<string | null>(null)

  // ── Add existing sub-receta ───────────────────────────────────────────────
  const [showAddSR, setShowAddSR]           = useState(false)
  const [searchSR, setSearchSR]             = useState('')
  const [addingSR, setAddingSR]             = useState<string | null>(null)

  // ── Create new receta inside menu ─────────────────────────────────────────
  const [showNewReceta, setShowNewReceta]       = useState(false)
  const [newRecetaNombre, setNewRecetaNombre]   = useState('')
  const [newPorciones, setNewPorciones]         = useState('1')
  const [creatingReceta, setCreatingReceta]     = useState(false)
  const [createRecetaErr, setCreateRecetaErr]   = useState<string | null>(null)

  // ── Create new sub-receta inside menu ────────────────────────────────────
  const [showPrintModal, setShowPrintModal]     = useState(false)
  const [showNewSR, setShowNewSR]               = useState(false)
  const [newSRNombre, setNewSRNombre]           = useState('')
  const [newSRRendimiento, setNewSRRendimiento] = useState('1')
  const [newSRUnidad, setNewSRUnidad]           = useState('kg')
  const [creatingSR, setCreatingSR]             = useState(false)
  const [createSRErr, setCreateSRErr]           = useState<string | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addedRecetaIds   = new Set(rows.map(r => r.receta?.id).filter(Boolean))
  const addedSRIds       = new Set(rows.map(r => r.sub_receta?.id).filter(Boolean))

  const filteredRecetas  = recetasDisponibles.filter(r =>
    !addedRecetaIds.has(r.id) && r.nombre.toLowerCase().includes(searchReceta.toLowerCase()))
  const filteredSRs      = subRecetasDisponibles.filter(s =>
    !addedSRIds.has(s.id) && s.nombre.toLowerCase().includes(searchSR.toLowerCase()))

  const recetaCount    = rows.filter(r => r.receta).length
  const srCount        = rows.filter(r => r.sub_receta).length
  const totalCount     = rows.length

  // ── Add existing receta ───────────────────────────────────────────────────
  const handleAddReceta = async (receta: Receta) => {
    setAddingReceta(receta.id)
    const { data, error } = await supabase.from('menu_recetas')
      .insert({ menu_id: menu.id, receta_id: receta.id })
      .select('id').single()
    if (error) {
      console.error('[MenuDetalle] insert receta error:', JSON.stringify(error))
      alert(`No se pudo agregar la receta.\nCódigo: ${(error as any).code ?? ''}\n${error.message}`)
    }
    if (data) {
      setRows(rs => [...rs, {
        id: data.id,
        receta: {
          id: receta.id, nombre: receta.nombre,
          costo_por_porcion: receta.costo_por_porcion,
          precio_venta: receta.precio_venta, porciones: receta.porciones,
        },
        sub_receta: null,
      }])
    }
    setAddingReceta(null)
  }

  // ── Add existing sub-receta ───────────────────────────────────────────────
  const handleAddSR = async (sr: SubReceta) => {
    setAddingSR(sr.id)
    const { data, error } = await supabase.from('menu_recetas')
      .insert({ menu_id: menu.id, sub_receta_id: sr.id })
      .select('id').single()
    if (error) {
      console.error('[MenuDetalle] insert sub_receta error:', JSON.stringify(error))
      alert(`No se pudo agregar la sub-receta.\nCódigo: ${(error as any).code ?? ''}\n${error.message}`)
    }
    if (data) {
      setRows(rs => [...rs, {
        id: data.id,
        receta: null,
        sub_receta: {
          id: sr.id, nombre: sr.nombre,
          rendimiento: sr.rendimiento, unidad_rendimiento: sr.unidad_rendimiento,
          costo_total: sr.costo_total,
        },
      }])
    }
    setAddingSR(null)
  }

  // ── Create new receta + link to menu ─────────────────────────────────────
  const handleCreateReceta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRecetaNombre.trim()) return
    setCreatingReceta(true); setCreateRecetaErr(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreateRecetaErr('Sin sesión activa.'); setCreatingReceta(false); return }

    const { data: receta, error: recetaErr } = await supabase.from('recetas')
      .insert({
        user_id: user.id,
        nombre: newRecetaNombre.trim(),
        porciones: Math.max(1, Number(newPorciones) || 1),
      })
      .select('id, nombre, porciones, costo_por_porcion, precio_venta')
      .single()

    if (recetaErr || !receta) {
      setCreateRecetaErr('No se pudo crear la receta. Intenta de nuevo.')
      setCreatingReceta(false); return
    }

    const { data: mr } = await supabase.from('menu_recetas')
      .insert({ menu_id: menu.id, receta_id: receta.id })
      .select('id').single()

    if (mr) {
      setRows(rs => [...rs, {
        id: mr.id,
        receta: {
          id: receta.id, nombre: receta.nombre,
          porciones: receta.porciones,
          costo_por_porcion: receta.costo_por_porcion,
          precio_venta: receta.precio_venta,
        },
        sub_receta: null,
      }])
    }

    setCreatingReceta(false)
    setShowNewReceta(false)
    setNewRecetaNombre(''); setNewPorciones('1')
    router.push(`/recetas/${receta.id}`)
  }

  // ── Create new sub-receta + link to menu ─────────────────────────────────
  const handleCreateSR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSRNombre.trim()) return
    setCreatingSR(true); setCreateSRErr(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreateSRErr('Sin sesión activa.'); setCreatingSR(false); return }

    const { data: sr, error: srErr } = await supabase.from('sub_recetas')
      .insert({
        user_id: user.id,
        nombre: newSRNombre.trim(),
        rendimiento: Math.max(0.0001, Number(newSRRendimiento) || 1),
        unidad_rendimiento: newSRUnidad,
      })
      .select('id, nombre, rendimiento, unidad_rendimiento, costo_total')
      .single()

    if (srErr || !sr) {
      setCreateSRErr('No se pudo crear la sub-receta. Intenta de nuevo.')
      setCreatingSR(false); return
    }

    const { data: mr } = await supabase.from('menu_recetas')
      .insert({ menu_id: menu.id, sub_receta_id: sr.id })
      .select('id').single()

    if (mr) {
      setRows(rs => [...rs, {
        id: mr.id,
        receta: null,
        sub_receta: {
          id: sr.id, nombre: sr.nombre,
          rendimiento: sr.rendimiento, unidad_rendimiento: sr.unidad_rendimiento,
          costo_total: sr.costo_total,
        },
      }])
    }

    setCreatingSR(false)
    setShowNewSR(false)
    setNewSRNombre(''); setNewSRRendimiento('1'); setNewSRUnidad('kg')
    router.push(`/sub-recetas/${sr.id}`)
  }

  // ── Remove item from menu ─────────────────────────────────────────────────
  const handleRemove = async (rowId: string) => {
    await supabase.from('menu_recetas').delete().eq('id', rowId)
    setRows(rs => rs.filter(r => r.id !== rowId))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/menus')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Regresar a menús
          </button>
          <button onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            <Printer size={15} /> Imprimir menú
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-2" style={{ backgroundColor: menu.color }} />
          <div className="p-5">
            <h1 className="text-xl font-bold text-slate-900">{menu.nombre}</h1>
            {menu.descripcion && <p className="text-sm text-slate-400 mt-1">{menu.descripcion}</p>}
            <p className="text-sm text-slate-400 mt-1">
              {recetaCount > 0 && `${recetaCount} receta${recetaCount !== 1 ? 's' : ''}`}
              {recetaCount > 0 && srCount > 0 && ' · '}
              {srCount > 0 && `${srCount} sub-receta${srCount !== 1 ? 's' : ''}`}
              {totalCount === 0 && 'Sin elementos'}
            </p>
          </div>

          {/* Margen mínimo del menú */}
          <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium">Margen mínimo del menú</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={margenStr}
                  onChange={e => setMargenStr(e.target.value)}
                  onBlur={handleMargenBlur}
                  min="0" max="100" step="0.1"
                  placeholder={String(margenMinimoGlobal)}
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-500">%</span>
                {savingMargen && (
                  <span className="text-xs text-slate-400">Guardando…</span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {menu.margen_minimo != null ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium">
                    Personalizado: {menu.margen_minimo}%
                  </span>
                  <button
                    onClick={async () => {
                      setMargenStr('')
                      setSavingMargen(true)
                      const { error } = await supabase
                        .from('menus')
                        .update({ margen_minimo: null })
                        .eq('id', menu.id)
                      if (error) {
                        console.error('[MenuDetalle] Error al restablecer margen_minimo:', error)
                      } else {
                        setMenu(m => ({ ...m, margen_minimo: null }))
                      }
                      setSavingMargen(false)
                    }}
                    className="text-slate-400 hover:text-slate-600 underline"
                  >
                    Usar global
                  </button>
                </>
              ) : (
                <span>Usando global: <strong>{margenMinimoGlobal}%</strong> · Escribe un valor para personalizar</span>
              )}
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-2 flex-wrap">
            <h2 className="font-semibold text-slate-900 text-sm">Contenido del menú</h2>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Recetas */}
              <button onClick={() => setShowAddReceta(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
                <Search size={13} /> Receta existente
              </button>
              <button onClick={() => setShowNewReceta(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50">
                <Plus size={13} /> Nueva receta
              </button>
              {/* Sub-recetas */}
              <span className="text-slate-200 select-none">|</span>
              <button onClick={() => setShowAddSR(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
                <Search size={13} /> Sub-receta existente
              </button>
              <button onClick={() => setShowNewSR(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-1 rounded hover:bg-violet-50">
                <Plus size={13} /> Nueva sub-receta
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto mb-3 text-slate-200" size={40} />
              <p className="text-slate-400 text-sm mb-3">Este menú no tiene elementos aún.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowNewReceta(true)}
                  className="text-brand-600 text-sm font-semibold hover:text-brand-700">
                  Nueva receta →
                </button>
                <span className="text-slate-300">o</span>
                <button onClick={() => setShowNewSR(true)}
                  className="text-violet-600 text-sm font-semibold hover:text-violet-700">
                  Nueva sub-receta →
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map(row => {
                if (row.receta) {
                  const r = row.receta
                  const margenPct = calcMargen(r.costo_por_porcion, r.precio_venta)
                  const margenOk  = margenPct !== null && margenPct >= margenEfectivo
                  return (
                    <li key={row.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ChefHat size={14} className="text-brand-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/recetas/${r.id}`}
                              className="text-sm font-medium text-slate-900 hover:text-brand-600 transition-colors">
                              {r.nombre}
                            </Link>
                            <Link href={`/recetas/${r.id}`}
                              className="text-slate-300 hover:text-slate-500" title="Abrir receta">
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400">
                            <span className="text-brand-500 font-medium">Receta</span>
                            {' · '}{r.porciones} porción{r.porciones !== 1 ? 'es' : ''}
                            {r.precio_venta && ` · ${fmt(r.precio_venta)}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {/* Indicador de margen */}
                        {margenPct !== null ? (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            margenOk
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                            title={`Margen ${margenPct.toFixed(1)}% — mínimo ${margenEfectivo}%`}
                          >
                            {margenOk
                              ? <TrendingUp size={11} />
                              : <TrendingDown size={11} />}
                            {margenPct.toFixed(1)}%
                          </div>
                        ) : r.precio_venta == null ? (
                          <span className="text-xs text-slate-300 italic">sin precio</span>
                        ) : null}
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Costo/porción</div>
                          <div className="text-sm font-semibold text-slate-800">
                            {r.costo_por_porcion > 0 ? fmt(r.costo_por_porcion) : '—'}
                          </div>
                        </div>
                        <button onClick={() => handleRemove(row.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          title="Quitar del menú">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                }

                if (row.sub_receta) {
                  const s = row.sub_receta
                  return (
                    <li key={row.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Layers size={14} className="text-violet-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/sub-recetas/${s.id}`}
                              className="text-sm font-medium text-slate-900 hover:text-violet-600 transition-colors">
                              {s.nombre}
                            </Link>
                            <Link href={`/sub-recetas/${s.id}`}
                              className="text-slate-300 hover:text-slate-500" title="Abrir sub-receta">
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400">
                            <span className="text-violet-500 font-medium">Sub-receta</span>
                            {' · '}Rend. {s.rendimiento} {s.unidad_rendimiento}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Costo total</div>
                          <div className="text-sm font-semibold text-slate-800">
                            {s.costo_total > 0 ? fmt(s.costo_total) : '—'}
                          </div>
                        </div>
                        <button onClick={() => handleRemove(row.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          title="Quitar del menú">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                }

                return null
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Modal: nueva receta ────────────────────────────────────────────────── */}
      <Modal isOpen={showNewReceta} onClose={() => { setShowNewReceta(false); setCreateRecetaErr(null) }}
        title="Nueva receta en este menú" size="sm">
        <form onSubmit={handleCreateReceta} className="space-y-4">
          <p className="text-xs text-slate-500">
            Se creará la receta y quedarás listo para agregar sus ingredientes.
          </p>
          {createRecetaErr && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {createRecetaErr}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del platillo <span className="text-red-500">*</span>
            </label>
            <input type="text" value={newRecetaNombre} onChange={e => setNewRecetaNombre(e.target.value)}
              placeholder="Ej: Hamburguesa clásica" autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Porciones</label>
            <input type="number" value={newPorciones} onChange={e => setNewPorciones(e.target.value)}
              min="1" step="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowNewReceta(false); setCreateRecetaErr(null) }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={creatingReceta || !newRecetaNombre.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {creatingReceta ? 'Creando...' : 'Crear receta →'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: nueva sub-receta ───────────────────────────────────────────── */}
      <Modal isOpen={showNewSR} onClose={() => { setShowNewSR(false); setCreateSRErr(null) }}
        title="Nueva sub-receta en este menú" size="sm">
        <form onSubmit={handleCreateSR} className="space-y-4">
          <p className="text-xs text-slate-500">
            Se creará la sub-receta y quedarás listo para agregar sus ingredientes.
          </p>
          {createSRErr && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {createSRErr}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input type="text" value={newSRNombre} onChange={e => setNewSRNombre(e.target.value)}
              placeholder="Ej: Salsa de tomate base" autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rendimiento</label>
              <input type="number" value={newSRRendimiento} onChange={e => setNewSRRendimiento(e.target.value)}
                min="0.001" step="any"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select value={newSRUnidad} onChange={e => setNewSRUnidad(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['kg','g','L','ml','Pz'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowNewSR(false); setCreateSRErr(null) }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={creatingSR || !newSRNombre.trim()}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              {creatingSR ? 'Creando...' : 'Crear sub-receta →'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: agregar receta existente ──────────────────────────────────── */}
      <Modal isOpen={showAddReceta}
        onClose={() => { setShowAddReceta(false); setSearchReceta('') }}
        title="Agregar receta existente" size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchReceta} onChange={e => setSearchReceta(e.target.value)}
              placeholder="Buscar receta..." autoFocus
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {filteredRecetas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              {searchReceta ? 'Sin resultados.' : 'Todas las recetas ya están en este menú.'}
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
              {filteredRecetas.map(r => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{r.nombre}</div>
                    <div className="text-xs text-slate-400">{r.porciones} porción{r.porciones !== 1 ? 'es' : ''}</div>
                  </div>
                  <button onClick={() => handleAddReceta(r)} disabled={addingReceta === r.id}
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-brand-50">
                    <Plus size={13} />
                    {addingReceta === r.id ? 'Agregando...' : 'Agregar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => { setShowAddReceta(false); setSearchReceta('') }}
            className="w-full px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </Modal>

      <MenuPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        menu={menu}
        rows={rows}
      />

      {/* ── Modal: agregar sub-receta existente ──────────────────────────────── */}
      <Modal isOpen={showAddSR}
        onClose={() => { setShowAddSR(false); setSearchSR('') }}
        title="Agregar sub-receta existente" size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchSR} onChange={e => setSearchSR(e.target.value)}
              placeholder="Buscar sub-receta..." autoFocus
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {filteredSRs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              {searchSR ? 'Sin resultados.' : 'Todas las sub-recetas ya están en este menú.'}
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
              {filteredSRs.map(s => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{s.nombre}</div>
                    <div className="text-xs text-slate-400">Rend. {s.rendimiento} {s.unidad_rendimiento}</div>
                  </div>
                  <button onClick={() => handleAddSR(s)} disabled={addingSR === s.id}
                    className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-violet-50">
                    <Plus size={13} />
                    {addingSR === s.id ? 'Agregando...' : 'Agregar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => { setShowAddSR(false); setSearchSR('') }}
            className="w-full px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </Modal>
    </>
  )
}
