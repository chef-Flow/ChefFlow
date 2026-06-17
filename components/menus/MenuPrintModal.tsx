'use client'

import { useState, useEffect } from 'react'
import { Printer, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import type { Menu } from '@/types'

interface MenuItemRow {
  id: string
  receta:     { id: string; nombre: string; porciones: number; costo_por_porcion: number; precio_venta: number | null } | null
  sub_receta: { id: string; nombre: string; rendimiento: number; unidad_rendimiento: string; costo_total: number } | null
}

interface IngLine {
  nombre: string
  unidad: string
  proveedor: string | null
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  precio_unitario: number
  costo: number
}

interface ItemData {
  notas: string | null
  foto_url: string | null
  ingredientes: IngLine[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  menu: Menu
  rows: MenuItemRow[]
}

export default function MenuPrintModal({ isOpen, onClose, menu, rows }: Props) {
  const [selected, setSelected]         = useState<Set<string>>(new Set(rows.map(r => r.id)))
  const [inclPrecios, setInclPrecios]   = useState(true)
  const [inclProv, setInclProv]         = useState(false)
  const [inclNotas, setInclNotas]       = useState(true)
  const [inclFoto, setInclFoto]         = useState(true)
  const [loading, setLoading]           = useState(false)
  const [itemsData, setItemsData]       = useState<Map<string, ItemData>>(new Map())

  const supabase = createClient()

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
  const pct = (v: number) => `${v.toFixed(1)}%`
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  useEffect(() => {
    setSelected(new Set(rows.map(r => r.id)))
  }, [rows])

  useEffect(() => {
    if (!isOpen || rows.length === 0) return
    loadData()
  }, [isOpen])

  async function loadData() {
    setLoading(true)
    const map = new Map<string, ItemData>()

    await Promise.all(rows.map(async row => {
      if (row.receta) {
        const r = row.receta

        const [recetaRes, ingRes] = await Promise.all([
          supabase.from('recetas').select('notas, foto_url').eq('id', r.id).single(),
          supabase
            .from('ingredientes_receta')
            .select(`
              cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
              precio_unitario_capturado,
              ingrediente:ingrediente_id(nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor),
              sub_receta_link:sub_receta_id(nombre, costo_total, rendimiento, unidad_rendimiento)
            `)
            .eq('receta_id', r.id),
        ])

        const ingredientes: IngLine[] = (ingRes.data ?? []).map((row: any) => {
          const isIng = !!row.ingrediente
          const nombre = isIng ? row.ingrediente.nombre : row.sub_receta_link?.nombre ?? '?'
          const unidad = isIng ? row.ingrediente.unidad_medida : row.sub_receta_link?.unidad_rendimiento ?? ''
          const precio_unitario = isIng
            ? (row.ingrediente.precio_compra ?? 0) / (row.ingrediente.cantidad_presentacion ?? 1)
            : (row.sub_receta_link?.rendimiento ?? 0) > 0
              ? (row.sub_receta_link.costo_total ?? 0) / row.sub_receta_link.rendimiento
              : 0
          return {
            nombre,
            unidad,
            proveedor: row.ingrediente?.proveedor ?? null,
            cantidad_neta: Number(row.cantidad_neta),
            peso_merma: Number(row.peso_merma ?? 0),
            cantidad_bruta: Number(row.cantidad_bruta),
            porcentaje_merma: Number(row.porcentaje_merma ?? 0),
            precio_unitario: row.precio_unitario_capturado ?? precio_unitario,
            costo: Number(row.costo),
          }
        })

        map.set(r.id, {
          notas: recetaRes.data?.notas ?? null,
          foto_url: recetaRes.data?.foto_url ?? null,
          ingredientes,
        })
      }

      if (row.sub_receta) {
        const s = row.sub_receta

        const { data: ings } = await supabase
          .from('ingredientes_subreceta')
          .select(`
            cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
            ingrediente:ingrediente_id(nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor)
          `)
          .eq('sub_receta_id', s.id)

        const ingredientes: IngLine[] = (ings ?? []).map((row: any) => ({
          nombre: row.ingrediente?.nombre ?? '?',
          unidad: row.ingrediente?.unidad_medida ?? '',
          proveedor: row.ingrediente?.proveedor ?? null,
          cantidad_neta: Number(row.cantidad_neta),
          peso_merma: Number(row.peso_merma ?? 0),
          cantidad_bruta: Number(row.cantidad_bruta),
          porcentaje_merma: Number(row.porcentaje_merma ?? 0),
          precio_unitario: (row.ingrediente?.precio_compra ?? 0) / (row.ingrediente?.cantidad_presentacion ?? 1),
          costo: Number(row.costo),
        }))

        map.set(s.id, { notas: null, foto_url: null, ingredientes })
      }
    }))

    setItemsData(map)
    setLoading(false)
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }

  const selectedRows = rows.filter(r => selected.has(r.id))
  const anyFoto = selectedRows.some(r => r.receta && itemsData.get(r.receta.id)?.foto_url)

  function ingTable(ings: IngLine[], accentColor: string) {
    const th  = `padding:5px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#555;border-bottom:2px solid #e2e8f0;text-align:left;white-space:nowrap;`
    const thR = th + 'text-align:right;'
    const td  = `padding:5px 8px;font-size:11px;color:#1e293b;border-bottom:1px solid #f1f5f9;`
    const tdR = td + 'text-align:right;'

    const bodyRows = ings.map((ing, i) => {
      const bg = i % 2 === 1 ? 'background:#f8fafc;' : ''
      return `<tr style="${bg}">
        <td style="${td}font-weight:500;">${esc(ing.nombre)}</td>
        ${inclProv ? `<td style="${td}color:#64748b;">${ing.proveedor ? esc(ing.proveedor) : '—'}</td>` : ''}
        <td style="${tdR}">${ing.cantidad_neta} ${esc(ing.unidad)}</td>
        <td style="${tdR}">${ing.peso_merma} ${esc(ing.unidad)}</td>
        <td style="${tdR}">${ing.cantidad_bruta.toFixed(3)} ${esc(ing.unidad)}</td>
        <td style="${tdR}">${pct(ing.porcentaje_merma)}</td>
        ${inclPrecios ? `<td style="${tdR}color:#64748b;">${fmt(ing.precio_unitario)}/${esc(ing.unidad)}</td>` : ''}
        ${inclPrecios ? `<td style="${tdR}font-weight:700;color:${accentColor};">${fmt(ing.costo)}</td>` : ''}
      </tr>`
    }).join('')

    return `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="${th}">Ingrediente</th>
            ${inclProv ? `<th style="${th}">Proveedor</th>` : ''}
            <th style="${thR}">Neto</th>
            <th style="${thR}">Merma</th>
            <th style="${thR}">Bruto</th>
            <th style="${thR}">% Merma</th>
            ${inclPrecios ? `<th style="${thR}">Precio/u</th><th style="${thR}">Costo</th>` : ''}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`
  }

  function buildHTML(): string {
    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

    const sections = selectedRows.map(row => {
      if (row.receta) {
        const r = row.receta
        const data = itemsData.get(r.id) ?? { notas: null, ingredientes: [] }
        const ings = data.ingredientes
        const totalCosto = ings.reduce((s, i) => s + i.costo, 0)

        const tableHTML = ings.length > 0
          ? ingTable(ings, '#c2410c')
          : `<p style="font-size:11px;color:#94a3b8;font-style:italic;margin:6px 0;">Sin ingredientes registrados.</p>`

        const totalesHTML = inclPrecios && ings.length > 0 ? `
          <div style="margin-top:6px;display:flex;justify-content:flex-end;gap:24px;padding:8px 10px;background:#fff7ed;border-radius:4px;border:1px solid #fed7aa;">
            <div style="text-align:right;">
              <div style="font-size:9px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Costo total</div>
              <div style="font-size:13px;font-weight:800;color:#9a3412;">${fmt(totalCosto)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:9px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Costo / porción</div>
              <div style="font-size:13px;font-weight:800;color:#ea580c;">${fmt(r.costo_por_porcion)}</div>
            </div>
          </div>` : ''

        const notasHTML = inclNotas && data.notas ? `
          <div style="margin-top:10px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:5px;">Notas</div>
            <p style="font-size:11px;color:#334155;line-height:1.65;white-space:pre-wrap;margin:0;">${esc(data.notas)}</p>
          </div>` : ''

        const fotoHTML = inclFoto && data.foto_url
          ? `<img src="${data.foto_url.split('?')[0]}" alt="${esc(r.nombre)}"
               style="width:100px;height:70px;object-fit:cover;border-radius:5px;border:1px solid #e2e8f0;flex-shrink:0;" />`
          : ''

        return `
          <div style="margin-bottom:28px;page-break-inside:avoid;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #1a3a2a;">
              <div style="flex:1;">
                <h2 style="font-size:15px;font-weight:800;color:#0f172a;margin:0 0 2px;">${esc(r.nombre)}</h2>
                <span style="font-size:11px;color:#64748b;">
                  ${r.porciones} porción${r.porciones !== 1 ? 'es' : ''}
                  ${r.precio_venta && inclPrecios ? ` &nbsp;·&nbsp; P.V. ${fmt(r.precio_venta)}` : ''}
                </span>
              </div>
              ${fotoHTML}
            </div>
            ${tableHTML}
            ${totalesHTML}
            ${notasHTML}
          </div>`
      }

      if (row.sub_receta) {
        const s = row.sub_receta
        const data = itemsData.get(s.id) ?? { notas: null, ingredientes: [] }
        const ings = data.ingredientes
        const totalCosto = ings.reduce((sum, i) => sum + i.costo, 0)

        const tableHTML = ings.length > 0
          ? ingTable(ings, '#7c3aed')
          : `<p style="font-size:11px;color:#94a3b8;font-style:italic;margin:6px 0;">Sin ingredientes registrados.</p>`

        const totalesHTML = inclPrecios && ings.length > 0 ? `
          <div style="margin-top:6px;display:flex;justify-content:flex-end;gap:24px;padding:8px 10px;background:#f5f3ff;border-radius:4px;border:1px solid #ddd6fe;">
            <div style="text-align:right;">
              <div style="font-size:9px;color:#5b21b6;text-transform:uppercase;letter-spacing:0.05em;">Costo total</div>
              <div style="font-size:13px;font-weight:800;color:#7c3aed;">${fmt(totalCosto)}</div>
            </div>
          </div>` : ''

        return `
          <div style="margin-bottom:28px;page-break-inside:avoid;">
            <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #7c3aed;">
              <h2 style="font-size:15px;font-weight:800;color:#0f172a;margin:0;">
                <span style="font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.06em;margin-right:6px;">Sub-receta</span>
                ${esc(s.nombre)}
              </h2>
              <span style="font-size:11px;color:#64748b;">Rend. ${s.rendimiento} ${esc(s.unidad_rendimiento)}</span>
            </div>
            ${tableHTML}
            ${totalesHTML}
          </div>`
      }

      return ''
    }).join('')

    return `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;max-width:780px;margin:0 auto;padding:24px 32px;">

        <div style="padding-bottom:14px;border-bottom:3px solid #1a3a2a;margin-bottom:22px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1a3a2a;margin-bottom:4px;">ChefFlow · Menú</div>
          <h1 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#0f172a;">${esc(menu.nombre)}</h1>
          ${menu.descripcion ? `<div style="font-size:12px;color:#64748b;">${esc(menu.descripcion)}</div>` : ''}
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
            ${selectedRows.length} elemento${selectedRows.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Impreso: ${fecha}
          </div>
        </div>

        ${sections}

        <div style="margin-top:20px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">
          Generado con ChefFlow &nbsp;·&nbsp; ${fecha}
        </div>
      </div>`
  }

  function handlePrint() {
    if (loading || selectedRows.length === 0) return

    const printDiv = document.createElement('div')
    printDiv.id = 'chefflow-menu-print-root'
    printDiv.innerHTML = buildHTML()
    document.body.appendChild(printDiv)

    const style = document.createElement('style')
    style.id = 'chefflow-menu-print-style'
    style.textContent = `
      @media print {
        body > *:not(#chefflow-menu-print-root) { display: none !important; }
        #chefflow-menu-print-root { display: block !important; }
        @page { margin: 12mm 15mm; }
      }
    `
    document.head.appendChild(style)

    const cleanup = () => {
      document.body.removeChild(printDiv)
      document.head.removeChild(style)
      onClose()
    }

    const imgs = Array.from(printDiv.querySelectorAll('img'))
    if (imgs.length === 0) {
      window.print()
      cleanup()
      return
    }

    let pending = imgs.length
    const onDone = () => { if (--pending === 0) { window.print(); cleanup() } }
    const timeout = setTimeout(() => { window.print(); cleanup() }, 5000)

    imgs.forEach(img => {
      if (img.complete) { onDone(); return }
      img.onload  = () => { onDone() }
      img.onerror = () => { onDone() }
    })

    // If all images were already complete, the timeout is still set —
    // clearTimeout after print to avoid double cleanup
    if (pending === 0) { clearTimeout(timeout) }
  }

  const toggle = (label: string, val: boolean, set: (v: boolean) => void, disabled?: boolean) => (
    <label className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-brand-500" disabled={disabled} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir menú" size="md">
      <div className="space-y-5">

        {/* Recipe selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Recetas a imprimir</p>
            <button onClick={toggleAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              {selected.size === rows.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4 border border-slate-200 rounded-lg">
              Este menú no tiene elementos.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {rows.map(row => {
                const nombre = row.receta?.nombre ?? row.sub_receta?.nombre ?? ''
                const isSR   = !!row.sub_receta
                return (
                  <label key={row.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="w-4 h-4 accent-brand-500 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-800 flex-1 leading-tight">{nombre}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      isSR ? 'bg-violet-100 text-violet-600' : 'bg-brand-100 text-brand-600'
                    }`}>
                      {isSR ? 'Sub-receta' : 'Receta'}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Global options */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Opciones</p>
          <div className="space-y-2">
            {toggle('Incluir precios y costos', inclPrecios, setInclPrecios)}
            {toggle('Incluir columna de proveedor', inclProv, setInclProv)}
            {toggle('Incluir notas', inclNotas, setInclNotas)}
            {toggle('Incluir foto del platillo', inclFoto, setInclFoto, !anyFoto)}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            Cargando ingredientes…
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || selectedRows.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Printer size={15} />
            {loading ? 'Cargando…' : `Imprimir (${selectedRows.length})`}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          En el diálogo de impresión, elige "Guardar como PDF" para exportar.
        </p>
      </div>
    </Modal>
  )
}
