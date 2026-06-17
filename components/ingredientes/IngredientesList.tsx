'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, Printer, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import IngredienteForm from './IngredienteForm'
import { CLASIFICACIONES, type Ingrediente } from '@/types'

const BADGE_COLORS: Record<string, string> = {
  'Lácteos':                 'bg-blue-100 text-blue-700',
  'Carnes':                  'bg-red-100 text-red-700',
  'Frutas y verduras':       'bg-green-100 text-green-700',
  'Abarrotes':               'bg-amber-100 text-amber-800',
  'Bebidas':                 'bg-cyan-100 text-cyan-700',
  'Especias y Condimentos':  'bg-purple-100 text-purple-700',
  'Aceites y Grasas':        'bg-yellow-100 text-yellow-800',
  'Panadería':               'bg-rose-100 text-rose-700',
  'Mariscos':                'bg-teal-100 text-teal-700',
  'Desechables':             'bg-indigo-100 text-indigo-700',
  'Embutidos':               'bg-pink-100 text-pink-700',
  'Otros':                   'bg-slate-100 text-slate-600',
  // Legacy compatibility (existing rows saved before merge)
  'Frutas':                  'bg-brand-100 text-brand-700',
  'Verduras':                'bg-green-100 text-green-700',
}

const fmt = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)

interface Props {
  initialIngredientes: Ingrediente[]
  plan: 'free' | 'basic' | 'pro'
}

export default function IngredientesList({ initialIngredientes, plan }: Props) {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(initialIngredientes)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [isFormOpen, setIsFormOpen]     = useState(false)
  const [editing, setEditing]           = useState<Ingrediente | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading]         = useState(false)
  const supabase = createClient()

  const fetchIngredientes = async () => {
    const { data } = await supabase.from('ingredientes').select('*').order('nombre')
    if (data) setIngredientes(data as Ingrediente[])
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ingredientes.filter(i => {
      const matchSearch =
        !q ||
        i.nombre.toLowerCase().includes(q) ||
        i.marca?.toLowerCase().includes(q) ||
        i.proveedor?.toLowerCase().includes(q)
      const matchCat = !filterCat || i.clasificacion === filterCat
      return matchSearch && matchCat
    })
  }, [ingredientes, search, filterCat])

  const handleFormSuccess = async () => {
    await fetchIngredientes()
    setIsFormOpen(false)
    setEditing(null)
  }

  const openEdit  = (ing: Ingrediente) => { setEditing(ing); setIsFormOpen(true) }
  const openAdd   = () => { setEditing(null); setIsFormOpen(true) }
  const openDeleteConfirm = (id: string) => { setDeletingId(id); setDeleteConfirmOpen(true) }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    await supabase.from('ingredientes').delete().eq('id', deletingId)
    await fetchIngredientes()
    setDeleteLoading(false)
    setDeleteConfirmOpen(false)
    setDeletingId(null)
  }

  const precioUnitario = (ing: Ingrediente) =>
    ing.cantidad_presentacion > 0 ? ing.precio_compra / ing.cantidad_presentacion : 0

  // ── Print as PDF ────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const catLabel = filterCat ? ` — ${filterCat}` : ''

    const rowsHTML = filtered.map(i => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <strong style="display:block;font-size:11px;color:#111">${i.nombre}</strong>
          ${i.marca ? `<span style="display:block;font-size:10px;color:#9ca3af">${i.marca}</span>` : ''}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;vertical-align:top">${i.clasificacion}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;vertical-align:top">${i.unidad_presentacion} &times; ${i.cantidad_presentacion} ${i.unidad_medida}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;vertical-align:top">${i.proveedor ?? '&mdash;'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#111;text-align:right;vertical-align:top">${fmt(i.precio_compra)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;color:#ea580c;text-align:right;vertical-align:top">${fmt(precioUnitario(i))}<span style="font-weight:400;color:#9ca3af">/${i.unidad_medida}</span></td>
      </tr>`).join('')

    // 1. Crear el contenedor de impresión como hijo directo de <body>
    //    (así "body > *" del CSS puede ocultarlo/mostrarlo con precisión)
    const root = document.createElement('div')
    root.id = 'cf-print'
    root.innerHTML = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#111">
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
          <tr>
            <td style="border-bottom:2px solid #111;padding-bottom:8px">
              <div style="font-size:17px;font-weight:700">Ingredientes${catLabel}</div>
              <div style="font-size:10px;color:#6b7280;margin-top:3px">${filtered.length} ingrediente${filtered.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; ${fecha}</div>
            </td>
            <td style="border-bottom:2px solid #111;padding-bottom:8px;text-align:right;font-size:10px;color:#9ca3af;vertical-align:bottom">ChefFlow Costeo</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid #374151">
              <th style="text-align:left;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Producto</th>
              <th style="text-align:left;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Categ.</th>
              <th style="text-align:left;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Presentaci&oacute;n</th>
              <th style="text-align:left;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Proveedor</th>
              <th style="text-align:right;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Precio compra</th>
              <th style="text-align:right;padding:5px 8px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151">Precio/unidad</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>`
    document.body.appendChild(root)

    // 2. Inyectar CSS de impresión temporal.
    //    - En pantalla: ocultar el contenedor (no se ve nada raro).
    //    - Al imprimir: ocultar TODOS los hijos directos de body con "body > *",
    //      luego mostrar solo #cf-print (tiene mayor especificidad = gana).
    const styleEl = document.createElement('style')
    styleEl.id = 'cf-print-style'
    styleEl.textContent = `
      #cf-print { display: none; }
      @page  { margin: 1.5cm; }
      @media print {
        body > *          { display: none !important; }
        body > #cf-print  { display: block !important; }
        body              { margin: 0; padding: 0; background: #fff; }
        body, #cf-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `
    document.head.appendChild(styleEl)

    // 3. Limpiar después de imprimir (o cancelar el diálogo)
    const cleanup = () => {
      root.remove()
      styleEl.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    window.print()
  }

  // ── Export as CSV ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Nombre', 'Marca', 'Categoría', 'Presentación', 'Cantidad',
      'Unidad medida', 'Proveedor', 'Precio compra', 'Precio / unidad',
    ]
    const rows = filtered.map(i => [
      i.nombre,
      i.marca ?? '',
      i.clasificacion,
      i.unidad_presentacion,
      i.cantidad_presentacion,
      i.unidad_medida,
      i.proveedor ?? '',
      i.precio_compra.toFixed(2),
      precioUnitario(i).toFixed(4),
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const catSlug = filterCat ? `-${filterCat.replace(/\s+/g, '-').toLowerCase()}` : ''
    a.href     = url
    a.download = `ingredientes${catSlug}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ingredientes</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ingredientes.length} ingrediente{ingredientes.length !== 1 ? 's' : ''} registrado
              {ingredientes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Agregar ingrediente
          </button>
        </div>

        {/* Filters + export buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text" placeholder="Buscar por nombre, marca o proveedor..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>
          <select
            value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:min-w-[190px]"
          >
            <option value="">Todas las categorías</option>
            {CLASIFICACIONES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {filtered.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                title="Imprimir / Guardar como PDF"
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                <Printer size={15} /> PDF
              </button>
              {plan === 'pro' ? (
                <button
                  onClick={handleExportCSV}
                  title="Exportar a Excel / CSV"
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  <Download size={15} /> Excel
                </button>
              ) : (
                <div
                  title="Exportar a Excel disponible en Plan Pro"
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-300 rounded-lg text-sm cursor-not-allowed select-none"
                >
                  <Download size={15} /> Excel · Pro
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Package className="mx-auto mb-3 text-slate-200" size={52} />
            <p className="text-slate-500 font-medium text-sm">
              {search || filterCat
                ? 'No se encontraron ingredientes con ese filtro.'
                : 'Aún no tienes ingredientes.'}
            </p>
            {!search && !filterCat && (
              <button onClick={openAdd} className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700">
                Agrega tu primer ingrediente →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Producto', 'Categoría', 'Presentación', 'Precio compra', 'Precio / unidad', ''].map(h => (
                      <th key={h}
                        className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                          h === '' ? '' : h.startsWith('Precio') ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{ing.nombre}</div>
                        {ing.marca     && <div className="text-xs text-slate-400 mt-0.5">{ing.marca}</div>}
                        {ing.proveedor && <div className="text-xs text-slate-400">{ing.proveedor}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[ing.clasificacion] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ing.clasificacion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ing.unidad_presentacion} &times; {ing.cantidad_presentacion} {ing.unidad_medida}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">
                        {fmt(ing.precio_compra)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-brand-600">{fmt(precioUnitario(ing))}</span>
                        <span className="text-xs text-slate-400 ml-1">/{ing.unidad_medida}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(ing)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => openDeleteConfirm(ing.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(ing => (
                <div key={ing.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{ing.nombre}</div>
                      {ing.marca     && <div className="text-xs text-slate-400">{ing.marca}</div>}
                      {ing.proveedor && <div className="text-xs text-slate-400">{ing.proveedor}</div>}
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[ing.clasificacion] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ing.clasificacion}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Presentación</div>
                      <div className="text-slate-700 text-xs">
                        {ing.unidad_presentacion} × {ing.cantidad_presentacion} {ing.unidad_medida}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Precio compra</div>
                      <div className="text-slate-700 font-medium text-xs">{fmt(ing.precio_compra)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Precio/{ing.unidad_medida}</div>
                      <div className="font-semibold text-brand-600 text-xs">{fmt(precioUnitario(ing))}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button onClick={() => openEdit(ing)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                      <Pencil size={13} /> Editar
                    </button>
                    <button onClick={() => openDeleteConfirm(ing.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors font-medium">
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add / Edit modal */}
        <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditing(null) }}
          title={editing ? 'Editar ingrediente' : 'Agregar ingrediente'} size="lg">
          <IngredienteForm
            ingrediente={editing}
            onSuccess={handleFormSuccess}
            onCancel={() => { setIsFormOpen(false); setEditing(null) }}
          />
        </Modal>

        {/* Delete confirm modal */}
        <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}
          title="Eliminar ingrediente" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="text-sm text-slate-600 pt-1.5">
                ¿Seguro que quieres eliminar este ingrediente? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  )
}
