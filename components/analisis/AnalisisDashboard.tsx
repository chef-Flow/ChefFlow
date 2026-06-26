'use client'

import { memo, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  TrendingUp, TrendingDown, Minus, ChefHat, ArrowUpDown,
  CheckCircle2, AlertTriangle, XCircle, BarChart2,
  UtensilsCrossed, Settings2, ArrowRight, Check, Loader2, Truck,
} from 'lucide-react'
import type { Receta } from '@/types'
import {
  actualizarPreciosMenu,
  actualizarPrecioReceta,
  actualizarPlataformaReceta,
} from '@/app/(dashboard)/analisis/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuSimple {
  id: string
  nombre: string
  color: string
  recetaIds: string[]
}

interface Plataforma {
  id: string
  nombre: string
  comision_porcentaje: number
  activa: boolean
}

interface Props {
  recetas: Receta[]
  iva: number
  margenMinimo: number
  comisionBancaria: number
  menus: MenuSimple[]
  plataformas: Plataforma[]
}

type SortKey = 'nombre' | 'costo' | 'precio' | 'margen'
type SortDir = 'asc' | 'desc'
type ModoAjuste = 'pct' | 'fijo' | 'margen'
type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-precio'

interface PreviewRow {
  id: string
  nombre: string
  precioActual: number | null
  precioNuevo: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
const pct = (v: number) => `${v.toFixed(1)}%`

function calcMargen(costoXPorcion: number, precioVenta: number | null, iva: number, comisionPlataforma = 0, comisionBancaria = 0) {
  if (!precioVenta || precioVenta <= 0 || costoXPorcion <= 0) return null
  // Si hay plataforma, solo su comisión. Si no, solo bancaria.
  const comisionEfectiva = comisionPlataforma > 0 ? comisionPlataforma : comisionBancaria
  const ingresoBruto = precioVenta * (1 - comisionEfectiva / 100)
  const sinIva = ingresoBruto / (1 + iva / 100)
  return sinIva > 0 ? ((sinIva - costoXPorcion) / sinIva) * 100 : 0
}

function semaforo(margen: number | null, minimo: number): Semaforo {
  if (margen === null) return 'sin-precio'
  if (margen >= minimo) return 'verde'
  if (margen >= minimo * 0.75) return 'amarillo'
  return 'rojo'
}

const SEMAFORO_CONFIG = {
  verde:        { label: 'OK',          cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2 },
  amarillo:     { label: 'Revisar',     cls: 'bg-amber-100 text-amber-700',  Icon: AlertTriangle },
  rojo:         { label: 'Bajo margen', cls: 'bg-red-100 text-red-600',      Icon: XCircle },
  'sin-precio': { label: 'Sin precio',  cls: 'bg-slate-100 text-slate-400',  Icon: Minus },
}

function buildPreview(
  rows: { id: string; nombre: string; costo_por_porcion: number; precio_venta: number | null }[],
  modo: ModoAjuste,
  valor: number,
  iva: number,
): PreviewRow[] {
  return rows
    .map(r => {
      let precioNuevo: number
      if (modo === 'pct') {
        if (!r.precio_venta) return null
        precioNuevo = r.precio_venta * (1 + valor / 100)
      } else if (modo === 'fijo') {
        if (!r.precio_venta) return null
        precioNuevo = r.precio_venta + valor
      } else {
        if (r.costo_por_porcion <= 0 || valor <= 0 || valor >= 100) return null
        const sinIva = r.costo_por_porcion / (1 - valor / 100)
        precioNuevo = sinIva * (1 + iva / 100)
      }
      return {
        id: r.id,
        nombre: r.nombre,
        precioActual: r.precio_venta ?? null,
        precioNuevo: Math.round(precioNuevo * 100) / 100,
      }
    })
    .filter((x): x is PreviewRow => x !== null)
}

// ─── PriceCell ────────────────────────────────────────────────────────────────

const PriceCell = memo(function PriceCell({
  id,
  initialValue,
  onOptimistic,
  onSave,
}: {
  id: string
  initialValue: number | null
  onOptimistic: (id: string, val: number | null) => void
  onSave: (id: string, val: number | null) => Promise<void>
}) {
  const [val, setVal]       = useState(initialValue == null ? '' : String(initialValue))
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const commit = async () => {
    const num = val === '' ? null : Number(val)
    if (num !== null && isNaN(num)) return
    if (num === initialValue) return
    setSaving(true)
    setError(null)
    try {
      await onSave(id, num)
    } catch (e: any) {
      setError(e?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-slate-300 text-xs">$</span>
        <input
          type="number"
          value={val}
          onChange={e => {
            setVal(e.target.value)
            onOptimistic(id, e.target.value === '' ? null : Number(e.target.value))
          }}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          disabled={saving}
          placeholder="—"
          min="0"
          step="0.01"
          className="w-24 text-right border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-slate-50 disabled:text-slate-300"
        />
        {saving && <Loader2 size={12} className="animate-spin text-brand-400 flex-shrink-0" />}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
})

// ─── PlatformCell ─────────────────────────────────────────────────────────────

function PlatformCell({
  id,
  platformId,
  platforms,
  onSave,
}: {
  id: string
  platformId: string | null
  platforms: Plataforma[]
  onSave: (id: string, platId: string | null) => Promise<void>
}) {
  const [selecting, setSelecting] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const currentPlatform = platforms.find(p => p.id === platformId) ?? null

  const handleToggle = async () => {
    setError(null)
    if (platformId) {
      setSaving(true)
      try { await onSave(id, null) } catch (e: any) { setError(e?.message ?? 'Error') }
      setSaving(false)
    } else {
      setSelecting(true)
    }
  }

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setSelecting(false)
    if (!v) return
    setSaving(true)
    setError(null)
    try { await onSave(id, v) } catch (e: any) { setError(e?.message ?? 'Error') }
    setSaving(false)
  }

  if (platforms.length === 0) {
    return <span className="text-xs text-slate-300">Sin plataformas</span>
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center justify-end gap-2">
        {selecting ? (
          <select
            autoFocus
            onChange={handleSelect}
            onBlur={() => setSelecting(false)}
            className="text-xs border border-brand-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white max-w-[160px]"
          >
            <option value="">— Seleccionar —</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        ) : (
          <>
            {currentPlatform && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[110px]">
                {currentPlatform.nombre}
                {currentPlatform.comision_porcentaje > 0 && (
                  <span className="text-slate-400 ml-1">{currentPlatform.comision_porcentaje}%</span>
                )}
              </span>
            )}
            <button
              onClick={handleToggle}
              disabled={saving}
              title={platformId ? 'Desactivar plataforma' : 'Activar plataforma'}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${platformId ? 'bg-brand-500' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${platformId ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
            </button>
            {saving && <Loader2 size={12} className="animate-spin text-brand-400" />}
          </>
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AnalisisDashboard({ recetas, iva, margenMinimo, comisionBancaria, menus, plataformas }: Props) {
  const [sort, setSort]     = useState<SortKey>('margen')
  const [dir, setDir]       = useState<SortDir>('desc')
  const [filtro, setFiltro] = useState<Semaforo | 'todos'>('todos')
  const [menuId, setMenuId] = useState('')

  // Optimistic overrides — updated instantly so margins recalc in real-time
  const [priceOverrides,    setPriceOverrides]    = useState<Record<string, number | null>>({})
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string | null>>({})

  // Price adjustment tool
  const [modoAjuste,  setModoAjuste]  = useState<ModoAjuste>('pct')
  const [valorAjuste, setValorAjuste] = useState('')
  const [preview,     setPreview]     = useState<PreviewRow[] | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saveMsg,     setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [ajusteError, setAjusteError] = useState<string | null>(null)

  // Computed every render — no useMemo so state changes always propagate immediately
  const rows = recetas.map(r => {
    const effectivePlatId = r.id in platformOverrides
      ? platformOverrides[r.id]
      : r.plataforma_delivery_id
    const effectivePrice = r.id in priceOverrides
      ? priceOverrides[r.id]
      : r.precio_venta
    const plat = effectivePlatId
      ? plataformas.find(p => p.id === effectivePlatId)
      : null
    const comision = plat ? Number(plat.comision_porcentaje) : 0
    const margen = calcMargen(r.costo_por_porcion, effectivePrice, iva, comision, comisionBancaria)
    const margenBase = comision > 0
      ? calcMargen(r.costo_por_porcion, effectivePrice, iva, 0, 0)
      : null
    return {
      ...r,
      precio_venta: effectivePrice,
      plataforma_delivery_id: effectivePlatId,
      margen,
      margenBase,
      semaforo: semaforo(margen, margenMinimo),
      comisionActiva: comision,
      nombrePlataforma: plat?.nombre ?? null,
    }
  })

  const counts = {
    verde:        rows.filter(r => r.semaforo === 'verde').length,
    amarillo:     rows.filter(r => r.semaforo === 'amarillo').length,
    rojo:         rows.filter(r => r.semaforo === 'rojo').length,
    'sin-precio': rows.filter(r => r.semaforo === 'sin-precio').length,
  }

  const withMargen = rows.filter(r => r.margen !== null)
  const avgMargen = withMargen.length === 0
    ? null
    : withMargen.reduce((s, r) => s + r.margen!, 0) / withMargen.length

  const selectedMenu = menus.find(m => m.id === menuId)

  const rowsByMenu = useMemo(() => {
    if (!menuId) return rows
    const ids = new Set(selectedMenu?.recetaIds ?? [])
    return rows.filter(r => ids.has(r.id))
  }, [rows, menuId, selectedMenu])

  const filtered = useMemo(() => {
    const base = filtro === 'todos' ? rowsByMenu : rowsByMenu.filter(r => r.semaforo === filtro)
    return [...base].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0
      if (sort === 'nombre') { va = a.nombre;            vb = b.nombre }
      if (sort === 'costo')  { va = a.costo_por_porcion; vb = b.costo_por_porcion }
      if (sort === 'precio') { va = a.precio_venta ?? 0; vb = b.precio_venta ?? 0 }
      if (sort === 'margen') { va = a.margen ?? -999;    vb = b.margen ?? -999 }
      if (typeof va === 'string')
        return dir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      return dir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [rowsByMenu, sort, dir, filtro])

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('desc') }
  }

  const handleMenuChange = (id: string) => {
    setMenuId(id)
    setPreview(null)
    setSaveMsg(null)
    setAjusteError(null)
    setValorAjuste('')
  }

  // Called on every keystroke — updates margin in real-time
  const handlePriceOptimistic = useCallback((id: string, val: number | null) => {
    setPriceOverrides(prev => ({ ...prev, [id]: val }))
  }, [])

  // Called on blur/Enter — persists to Supabase
  const handlePriceSave = useCallback(async (id: string, val: number | null) => {
    const res = await actualizarPrecioReceta(id, val)
    if (!res.ok) throw new Error(res.error)
  }, [])

  // Called by platform toggle — updates state immediately then persists
  const handlePlatformSave = async (id: string, platId: string | null) => {
    setPlatformOverrides(prev => ({ ...prev, [id]: platId }))
    const res = await actualizarPlataformaReceta(id, platId)
    if (!res.ok) {
      setPlatformOverrides(prev => ({ ...prev, [id]: recetas.find(r => r.id === id)?.plataforma_delivery_id ?? null }))
      throw new Error(res.error)
    }
  }

  const handleVerPreview = () => {
    setAjusteError(null)
    const val = Number(valorAjuste)
    if (!valorAjuste || isNaN(val)) { setAjusteError('Ingresa un valor numérico.'); return }
    if (modoAjuste === 'margen' && (val <= 0 || val >= 100)) {
      setAjusteError('El margen objetivo debe ser entre 1% y 99%.'); return
    }
    const result = buildPreview(rowsByMenu, modoAjuste, val, iva)
    if (result.length === 0) {
      setAjusteError('No hay recetas con precio de venta en este menú para ajustar.'); return
    }
    setPreview(result)
    setSaveMsg(null)
  }

  const handleConfirmar = async () => {
    if (!preview) return
    setSaving(true)
    setSaveMsg(null)
    const updates = preview.map(p => ({ id: p.id, precio_venta: p.precioNuevo }))
    const res = await actualizarPreciosMenu(updates)
    setSaving(false)
    if (res.ok) {
      // Apply bulk optimistic updates
      setPriceOverrides(prev => {
        const next = { ...prev }
        updates.forEach(u => { next[u.id] = u.precio_venta })
        return next
      })
      setSaveMsg({ ok: true, text: `${res.count} precio${res.count !== 1 ? 's' : ''} actualizado${res.count !== 1 ? 's' : ''} correctamente.` })
      setPreview(null)
      setValorAjuste('')
    } else {
      setSaveMsg({ ok: false, text: res.error ?? 'Error al guardar.' })
    }
  }

  const inMenuMode = !!menuId

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:text-slate-700 transition-colors ${sort === k ? 'text-brand-600' : 'text-slate-400'}`}>
      {label}
      <ArrowUpDown size={11} className={sort === k ? 'text-brand-500' : 'text-slate-300'} />
    </button>
  )

  const modoLabel = {
    pct:    `+${valorAjuste || '0'}% sobre precio actual`,
    fijo:   `+${fmt(Number(valorAjuste) || 0)} por receta`,
    margen: `margen objetivo ${valorAjuste || '0'}%`,
  }

  const emptyColSpan = inMenuMode ? 7 : 5

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análisis</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comparativo de rentabilidad de tus recetas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={14} className="text-brand-500" />
            <span className="text-xs text-slate-400 font-medium">Margen promedio</span>
          </div>
          <div className={`text-2xl font-bold ${avgMargen !== null ? (avgMargen >= margenMinimo ? 'text-green-600' : 'text-red-500') : 'text-slate-300'}`}>
            {avgMargen !== null ? pct(avgMargen) : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">mínimo: {pct(margenMinimo)}</div>
        </div>

        {(['verde', 'amarillo', 'rojo', 'sin-precio'] as Semaforo[]).map(s => {
          const cfg = SEMAFORO_CONFIG[s]
          const Icon = cfg.Icon
          return (
            <button key={s} onClick={() => setFiltro(filtro === s ? 'todos' : s)}
              className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${filtro === s ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={s === 'verde' ? 'text-green-500' : s === 'amarillo' ? 'text-amber-500' : s === 'rojo' ? 'text-red-500' : 'text-slate-400'} />
                <span className="text-xs text-slate-400 font-medium">{cfg.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s === 'verde' ? 'text-green-700' : s === 'amarillo' ? 'text-amber-700' : s === 'rojo' ? 'text-red-600' : 'text-slate-400'}`}>
                {counts[s]}
              </div>
              <div className="text-xs text-slate-400">receta{counts[s] !== 1 ? 's' : ''}</div>
            </button>
          )
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Menu selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={15} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Menú:</span>
          </div>
          {menus.length === 0 ? (
            <span className="text-sm text-slate-400">No tienes menús creados.</span>
          ) : (
            <select
              value={menuId}
              onChange={e => handleMenuChange(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 min-w-[200px]"
            >
              <option value="">Todas las recetas</option>
              {menus.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          )}
          {menuId && selectedMenu && (
            <span className="text-xs text-slate-400 sm:ml-auto">
              {rowsByMenu.length} receta{rowsByMenu.length !== 1 ? 's' : ''} en este menú
            </span>
          )}
        </div>

        {/* Semaforo filter bar */}
        {filtro !== 'todos' && (
          <div className="flex items-center gap-2 px-5 py-3 bg-brand-50 border-b border-brand-100">
            <span className="text-xs text-brand-700 font-medium">
              Filtrando: {SEMAFORO_CONFIG[filtro].label}
            </span>
            <button onClick={() => setFiltro('todos')}
              className="text-xs text-brand-500 hover:text-brand-700 underline ml-auto">
              Ver todas
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left"><SortBtn k="nombre" label="Platillo" /></th>
                <th className="px-4 py-3 text-right"><SortBtn k="costo" label="Costo/porción" /></th>
                <th className="px-4 py-3 text-right">
                  {inMenuMode
                    ? <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Precio venta</span>
                    : <SortBtn k="precio" label="Precio venta" />}
                </th>
                <th className="px-4 py-3 text-right"><SortBtn k="margen" label="% Margen bruto" /></th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</span>
                </th>
                {inMenuMode && (
                  <th className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Truck size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={emptyColSpan} className="text-center py-10 text-slate-400 text-sm">Sin recetas</td>
                </tr>
              ) : filtered.map(r => {
                const cfg = SEMAFORO_CONFIG[r.semaforo]
                const Icon = cfg.Icon
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/recetas/${r.id}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-brand-100">
                          {r.foto_url ? (
                            <Image src={r.foto_url} alt={r.nombre} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ChefHat size={16} className="text-brand-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{r.nombre}</div>
                          <div className="text-xs text-slate-400">{r.porciones} porción{r.porciones !== 1 ? 'es' : ''}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-700">
                        {r.costo_por_porcion > 0 ? fmt(r.costo_por_porcion) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inMenuMode ? (
                        <PriceCell
                          id={r.id}
                          initialValue={recetas.find(x => x.id === r.id)?.precio_venta ?? null}
                          onOptimistic={handlePriceOptimistic}
                          onSave={handlePriceSave}
                        />
                      ) : (
                        r.precio_venta ? fmt(r.precio_venta) : <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.margen !== null ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {/* Margen con delivery (o normal si no hay plataforma) */}
                          <div className="flex items-center gap-1.5">
                            {r.margen >= margenMinimo
                              ? <TrendingUp size={14} className="text-green-500" />
                              : <TrendingDown size={14} className="text-red-400" />}
                            <span className={`font-bold ${r.margen >= margenMinimo ? 'text-green-700' : r.margen >= margenMinimo * 0.75 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct(r.margen)}
                            </span>
                            {r.comisionActiva > 0 && r.nombrePlataforma && (
                              <span className="text-xs text-brand-500 font-medium">
                                {r.nombrePlataforma}
                              </span>
                            )}
                          </div>
                          {/* Margen base sin delivery para comparar */}
                          {r.margenBase !== null && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <span className="text-xs">{pct(r.margenBase)} sin delivery</span>
                              <span className="text-xs text-red-400 font-medium">
                                ({pct(r.margen - r.margenBase)})
                              </span>
                            </div>
                          )}
                          {r.plataforma_delivery_id && r.comisionActiva === 0 && r.nombrePlataforma && (
                            <span className="text-xs text-slate-400">{r.nombrePlataforma} (sin comisión)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">Sin precio</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.cls}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    {inMenuMode && (
                      <td className="px-4 py-3 text-right">
                        <PlatformCell
                          id={r.id}
                          platformId={r.plataforma_delivery_id}
                          platforms={plataformas}
                          onSave={handlePlatformSave}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Sin recetas</div>
          ) : filtered.map(r => {
            const cfg = SEMAFORO_CONFIG[r.semaforo]
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link href={`/recetas/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-brand-100">
                      {r.foto_url ? (
                        <Image src={r.foto_url} alt={r.nombre} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat size={18} className="text-brand-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{r.nombre}</div>
                      <div className="text-xs text-slate-400">
                        Costo: {r.costo_por_porcion > 0 ? fmt(r.costo_por_porcion) : '—'}
                      </div>
                    </div>
                  </Link>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${r.semaforo === 'verde' ? 'text-green-700' : r.semaforo === 'amarillo' ? 'text-amber-600' : r.semaforo === 'rojo' ? 'text-red-600' : 'text-slate-400'}`}>
                      {r.margen !== null ? pct(r.margen) : '—'}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Mobile menu-mode extras */}
                {inMenuMode && (
                  <div className="mt-2 flex items-center gap-3 pl-[60px]">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Precio venta</label>
                      <PriceCell
                        id={r.id}
                        initialValue={recetas.find(x => x.id === r.id)?.precio_venta ?? null}
                        onOptimistic={handlePriceOptimistic}
                        onSave={handlePriceSave}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Delivery</label>
                      <PlatformCell
                        id={r.id}
                        platformId={r.plataforma_delivery_id}
                        platforms={plataformas}
                        onSave={handlePlatformSave}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Price adjustment tool — only when menu is selected */}
      {inMenuMode && selectedMenu && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <Settings2 size={16} className="text-brand-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Ajustar precios del menú</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedMenu.nombre}</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { id: 'pct',    label: 'Subir por porcentaje', desc: 'Aplica un % a todos los precios actuales', icon: '📈' },
                { id: 'fijo',   label: 'Subir por monto fijo', desc: 'Suma una cantidad fija a cada precio',     icon: '💲' },
                { id: 'margen', label: 'Ajustar por margen',   desc: 'Recalcula precios para alcanzar un margen objetivo', icon: '🎯' },
              ] as { id: ModoAjuste; label: string; desc: string; icon: string }[]).map(m => (
                <button
                  key={m.id}
                  onClick={() => { setModoAjuste(m.id); setPreview(null); setAjusteError(null) }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${modoAjuste === m.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="text-xl mb-1">{m.icon}</div>
                  <div className={`text-sm font-semibold ${modoAjuste === m.id ? 'text-brand-700' : 'text-slate-700'}`}>{m.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Input + preview button */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {modoAjuste === 'pct'    ? 'Porcentaje de incremento (%)' :
                   modoAjuste === 'fijo'   ? 'Monto a agregar ($)' :
                                             'Margen bruto objetivo (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={modoAjuste === 'margen' ? '99' : undefined}
                    step={modoAjuste === 'fijo' ? '1' : '0.1'}
                    value={valorAjuste}
                    onChange={e => { setValorAjuste(e.target.value); setPreview(null); setAjusteError(null) }}
                    placeholder={modoAjuste === 'fijo' ? 'ej: 50' : 'ej: 15'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                    {modoAjuste === 'fijo' ? '$' : '%'}
                  </span>
                </div>
                {modoAjuste === 'pct' && valorAjuste && (
                  <p className="text-xs text-slate-400 mt-1">ej: $100 → {fmt(100 * (1 + Number(valorAjuste) / 100))}</p>
                )}
                {modoAjuste === 'margen' && valorAjuste && (
                  <p className="text-xs text-slate-400 mt-1">Recalcula precio con IVA / VAT / Tax {iva}% incluido.</p>
                )}
              </div>
              <button
                onClick={handleVerPreview}
                disabled={!valorAjuste}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Ver vista previa
                <ArrowRight size={14} />
              </button>
            </div>

            {ajusteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{ajusteError}</p>
            )}

            {/* Preview table */}
            {preview && preview.length > 0 && (
              <div className="border border-brand-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-brand-50 border-b border-brand-200">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                    Vista previa — {preview.length} receta{preview.length !== 1 ? 's' : ''} · {modoLabel[modoAjuste]}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Receta</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Precio actual</th>
                        <th className="px-2 py-2"></th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Precio nuevo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.map(p => {
                        const diff = p.precioNuevo - (p.precioActual ?? 0)
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{p.nombre}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">
                              {p.precioActual ? fmt(p.precioActual) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-300 text-xs">→</td>
                            <td className="px-4 py-2.5 text-right font-bold text-brand-600">{fmt(p.precioNuevo)}</td>
                            <td className={`px-4 py-2.5 text-right text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {diff >= 0 ? '+' : ''}{fmt(diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <button onClick={() => { setPreview(null); setSaveMsg(null) }}
                    className="text-sm text-slate-400 hover:text-slate-600">
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {saving
                      ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                      : <><Check size={14} /> Confirmar y actualizar precios</>}
                  </button>
                </div>
              </div>
            )}

            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${saveMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {saveMsg.ok ? <Check size={14} /> : <XCircle size={14} />}
                {saveMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {recetas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <BarChart2 className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes recetas para analizar.</p>
          <Link href="/recetas" className="mt-3 inline-block text-brand-600 text-sm font-semibold hover:text-brand-700">
            Crear mi primera receta →
          </Link>
        </div>
      )}
    </div>
  )
}
