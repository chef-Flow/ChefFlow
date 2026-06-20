'use client'

import { useState, useTransition } from 'react'
import { Share2, Printer, Eye, EyeOff, Pencil, Check, X, Loader2, ChefHat } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { actualizarPrecioCompartido, getRecetaParaImpresion } from '@/app/(dashboard)/colaboradores/actions'
import type { DatosImpresion } from '@/app/(dashboard)/colaboradores/actions'
import { getRecetaDirectaParaImpresion } from '@/app/(dashboard)/recetas/compartir-actions'

interface RecetaShared {
  id: string
  nombre: string
  costo_por_porcion: number
  precio_venta: number | null
  foto_url: string | null
  porciones: number
}

interface PermisoConMenu {
  permisoId: string
  menuId: string
  puedeVerRecetas: boolean
  puedeVerPrecios: boolean
  puedeEditar: boolean
  menu: {
    id: string
    nombre: string
    color: string
    recetas: RecetaShared[]
  }
}

interface Comparticion {
  colaboradorId: string
  permisos: PermisoConMenu[]
}

interface RecetaDirecta {
  shareId: string
  recetaId: string
  puedeVerPrecios: boolean
  puedeVerProveedores: boolean
  vista: boolean
  receta: {
    id: string
    nombre: string
    porciones: number
    costo_por_porcion: number
    precio_venta: number | null
    foto_url: string | null
  }
}

interface Props {
  comparticiones: Comparticion[]
  recetasDirectas?: RecetaDirecta[]
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

function buildPrintHTML(menuNombre: string, items: DatosImpresion[]): string {
  const styles = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:32px; color:#1e293b; }
    .receta { margin-bottom:48px; }
    .receta+.receta { padding-top:40px; border-top:2px solid #e2e8f0; }
    .menu-tag { font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
    .title { font-size:24px; font-weight:700; }
    .subtitle { font-size:13px; color:#64748b; margin:4px 0 18px; }
    .stats { display:flex; gap:28px; margin-bottom:22px; padding:14px 16px; background:#f8fafc; border-radius:8px; }
    .stat-label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.07em; margin-bottom:3px; }
    .stat-value { font-size:18px; font-weight:700; }
    .orange { color:#ea580c; }
    h3 { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; border-bottom:2px solid #e2e8f0; padding:7px 10px; }
    td { font-size:12px; padding:8px 10px; border-bottom:1px solid #f1f5f9; }
    td strong { font-weight:600; }
    .notas { margin-top:18px; padding:12px 14px; background:#fffbeb; border-radius:6px; border-left:3px solid #fcd34d; }
    .notas-label { font-size:10px; font-weight:600; color:#92400e; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
    .notas p { font-size:13px; color:#1e293b; line-height:1.5; white-space:pre-wrap; }
    @media print { @page { margin:18mm; } }
  `

  const recetasHTML = items.map(({ receta, puedeVerPrecios, puedeVerProveedores }) => {
    const margen =
      receta.precio_venta && receta.precio_venta > 0
        ? Math.round((1 - (receta.costo_por_porcion ?? 0) / receta.precio_venta) * 100)
        : null

    const statsHTML = puedeVerPrecios
      ? `<div class="stats">
          <div><div class="stat-label">Costo total</div><div class="stat-value orange">${fmt(receta.costo_total ?? 0)}</div></div>
          <div><div class="stat-label">Costo/porción</div><div class="stat-value orange">${fmt(receta.costo_por_porcion ?? 0)}</div></div>
          ${receta.precio_venta != null ? `<div><div class="stat-label">Precio venta</div><div class="stat-value">${fmt(receta.precio_venta)}</div></div>` : ''}
          ${margen != null ? `<div><div class="stat-label">Margen</div><div class="stat-value">${margen}%</div></div>` : ''}
        </div>`
      : ''

    const thProv    = puedeVerProveedores ? '<th>Proveedor</th>' : ''
    const thPrecios = puedeVerPrecios ? '<th>Precio/u</th><th>Costo</th>' : ''

    const filas = receta.ingredientes.map(ing => {
      const tdProv    = puedeVerProveedores ? `<td>${ing.proveedor ?? '—'}</td>` : ''
      const tdPrecios = puedeVerPrecios
        ? `<td>${fmt(ing.precio_unitario)}/${ing.unidad}</td><td><strong>${fmt(ing.costo)}</strong></td>`
        : ''
      return `<tr>
        <td>${ing.nombre}</td>${tdProv}
        <td>${ing.cantidad_neta} ${ing.unidad}</td>
        <td>${ing.cantidad_bruta.toFixed(3)} ${ing.unidad}</td>
        <td>${ing.porcentaje_merma.toFixed(1)}%</td>
        ${tdPrecios}
      </tr>`
    }).join('')

    const tableHTML = receta.ingredientes.length === 0
      ? '<p style="color:#94a3b8;font-size:13px;margin-top:4px;">Sin ingredientes registrados.</p>'
      : `<table>
          <thead><tr><th>Ingrediente</th>${thProv}<th>Neto</th><th>Bruto</th><th>% Merma</th>${thPrecios}</tr></thead>
          <tbody>${filas}</tbody>
        </table>`

    const notasHTML = receta.notas
      ? `<div class="notas"><div class="notas-label">Notas</div><p>${receta.notas}</p></div>`
      : ''

    return `<div class="receta">
      <div class="menu-tag">${menuNombre}</div>
      <div class="title">${receta.nombre}</div>
      <div class="subtitle">${receta.porciones} porción${receta.porciones !== 1 ? 'es' : ''}</div>
      ${statsHTML}
      <h3>Ingredientes</h3>
      ${tableHTML}
      ${notasHTML}
    </div>`
  }).join('')

  return `<!DOCTYPE html><html><head><title>Recetas — ${menuNombre}</title>
    <style>${styles}</style></head><body>
    ${recetasHTML}
    <script>window.print(); window.close();</script>
    </body></html>`
}

function PrecioEditable({
  recetaId,
  initial,
  canEdit,
}: {
  recetaId: string
  initial: number | null
  canEdit: boolean
}) {
  const [editing, setEditing]   = useState(false)
  const [val, setVal]           = useState(initial == null ? '' : String(initial))
  const [current, setCurrent]   = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError]       = useState<string | null>(null)

  const commit = () => {
    const num = val.trim() === '' ? null : parseFloat(val)
    if (num !== null && isNaN(num)) { setError('Precio inválido'); return }
    setError(null)
    startTransition(async () => {
      const res = await actualizarPrecioCompartido(recetaId, num)
      if (res.ok) {
        setCurrent(num)
        setEditing(false)
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  const cancel = () => {
    setVal(current == null ? '' : String(current))
    setError(null)
    setEditing(false)
  }

  if (!canEdit) {
    return (
      <span className="text-sm font-medium text-slate-700">
        {current != null ? fmt(current) : <span className="text-slate-300 text-xs">Sin precio</span>}
      </span>
    )
  }

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
            className="w-24 text-right border border-brand-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            min="0" step="0.01"
          />
          {isPending
            ? <Loader2 size={13} className="animate-spin text-brand-400" />
            : <>
                <button onClick={commit} className="p-0.5 text-green-600 hover:text-green-700"><Check size={13} /></button>
                <button onClick={cancel} className="p-0.5 text-slate-400 hover:text-slate-600"><X size={13} /></button>
              </>
          }
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 group"
      title="Editar precio"
    >
      {current != null ? fmt(current) : <span className="text-slate-300 text-xs">Sin precio</span>}
      <Pencil size={11} className="opacity-0 group-hover:opacity-100 text-brand-400 transition-opacity" />
    </button>
  )
}

function RecetaDirectaCard({ item }: { item: RecetaDirecta }) {
  const [printing, setPrinting] = useState(false)

  const openPrint = (html: string) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  const handlePrint = async () => {
    setPrinting(true)
    const result = await getRecetaDirectaParaImpresion(item.recetaId)
    setPrinting(false)
    if (!result.ok || !result.data) { alert(result.error ?? 'Error al cargar la receta'); return }
    openPrint(buildPrintHTML('Receta compartida', [result.data]))
  }

  const { receta, puedeVerPrecios, vista } = item

  return (
    <li className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group/row">
      <Link href={`/compartido/receta/${receta.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-brand-50 overflow-hidden">
            {receta.foto_url ? (
              <Image src={receta.foto_url} alt={receta.nombre} width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat size={16} className="text-brand-200" />
              </div>
            )}
          </div>
          {!vista && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
              {receta.nombre}
            </p>
            {!vista && (
              <span className="flex-shrink-0 text-xs bg-indigo-100 text-indigo-600 font-semibold px-1.5 py-0.5 rounded-full">
                Nueva
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{receta.porciones} porción{receta.porciones !== 1 ? 'es' : ''}</p>
        </div>
      </Link>

      {puedeVerPrecios && (
        <div className="flex items-center gap-6 text-right flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400">Costo/porción</p>
            <p className="text-sm text-slate-600">{fmt(receta.costo_por_porcion)}</p>
          </div>
          {receta.precio_venta != null && (
            <div>
              <p className="text-xs text-slate-400">Precio venta</p>
              <p className="text-sm font-medium text-slate-700">{fmt(receta.precio_venta)}</p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handlePrint}
        disabled={printing}
        className="flex-shrink-0 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100 disabled:opacity-100"
        title="Imprimir receta"
      >
        {printing
          ? <Loader2 size={14} className="animate-spin text-slate-400" />
          : <Printer size={14} />}
      </button>
    </li>
  )
}

function MenuCard({ permiso }: { permiso: PermisoConMenu }) {
  const [printingId,   setPrintingId]   = useState<string | null>(null)
  const [printingMenu, setPrintingMenu] = useState(false)

  const openPrint = (html: string) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  const handlePrintMenu = async () => {
    setPrintingMenu(true)
    const results = await Promise.all(permiso.menu.recetas.map(r => getRecetaParaImpresion(r.id)))
    setPrintingMenu(false)
    const validas = results.filter(r => r.ok && r.data).map(r => r.data!)
    if (!validas.length) { alert('No se pudo cargar la información de las recetas'); return }
    openPrint(buildPrintHTML(permiso.menu.nombre, validas))
  }

  const handlePrintReceta = async (r: RecetaShared) => {
    setPrintingId(r.id)
    const result = await getRecetaParaImpresion(r.id)
    setPrintingId(null)
    if (!result.ok || !result.data) { alert(result.error ?? 'Error al cargar la receta'); return }
    openPrint(buildPrintHTML(permiso.menu.nombre, [result.data]))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: permiso.menu.color }} />
          <h2 className="text-base font-semibold text-slate-800">{permiso.menu.nombre}</h2>
          {permiso.puedeEditar ? (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">Puede editar</span>
          ) : (
            <span className="text-xs bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Eye size={10} /> Solo lectura
            </span>
          )}
        </div>
        <button
          onClick={handlePrintMenu}
          disabled={printingMenu}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {printingMenu
            ? <Loader2 size={13} className="animate-spin" />
            : <Printer size={13} />}
          {printingMenu ? 'Cargando…' : 'Imprimir menú'}
        </button>
      </div>

      {/* Recipe list */}
      {!permiso.puedeVerRecetas ? (
        <div className="px-5 py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <EyeOff size={15} />
          No tienes permiso para ver las recetas de este menú.
        </div>
      ) : permiso.menu.recetas.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-300 text-sm">
          Este menú no tiene recetas.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {permiso.menu.recetas.map(r => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group/row">
              {/* Thumbnail + name */}
              <Link href={`/compartido/receta/${r.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex-shrink-0 overflow-hidden">
                  {r.foto_url ? (
                    <Image src={r.foto_url} alt={r.nombre} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat size={16} className="text-brand-200" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{r.nombre}</p>
                  <p className="text-xs text-slate-400">{r.porciones} porción{r.porciones !== 1 ? 'es' : ''}</p>
                </div>
              </Link>

              {/* Prices */}
              {permiso.puedeVerPrecios && (
                <div className="flex items-center gap-6 text-right flex-shrink-0">
                  <div>
                    <p className="text-xs text-slate-400">Costo/porción</p>
                    <p className="text-sm text-slate-600">{fmt(r.costo_por_porcion)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Precio venta</p>
                    <PrecioEditable recetaId={r.id} initial={r.precio_venta} canEdit={permiso.puedeEditar} />
                  </div>
                </div>
              )}

              {!permiso.puedeVerPrecios && permiso.puedeEditar && (
                <div className="flex-shrink-0">
                  <PrecioEditable recetaId={r.id} initial={r.precio_venta} canEdit={true} />
                </div>
              )}

              {/* Per-recipe print button */}
              <button
                onClick={() => handlePrintReceta(r)}
                disabled={printingId === r.id}
                className="flex-shrink-0 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100 disabled:opacity-100"
                title="Imprimir esta receta"
              >
                {printingId === r.id
                  ? <Loader2 size={14} className="animate-spin text-slate-400" />
                  : <Printer size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CompartidoConmigo({ comparticiones, recetasDirectas = [] }: Props) {
  const allPermisos = comparticiones.flatMap(c => c.permisos)
  const nuevas = recetasDirectas.filter(r => !r.vista)
  const isEmpty = allPermisos.length === 0 && recetasDirectas.length === 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="text-indigo-500" size={22} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compartido conmigo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Menús y recetas que otros chefs han compartido contigo</p>
        </div>
        {nuevas.length > 0 && (
          <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold">
            {nuevas.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Share2 className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Nada compartido contigo aún.</p>
          <p className="text-slate-400 text-xs mt-1">
            Cuando alguien te comparta un menú o una receta, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Recetas individuales compartidas ── */}
          {recetasDirectas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Recetas compartidas contigo
              </p>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {recetasDirectas.map(item => (
                    <RecetaDirectaCard key={item.shareId} item={item} />
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Menús compartidos (colaboraciones) ── */}
          {allPermisos.length > 0 && (
            <div>
              {recetasDirectas.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Menús compartidos
                </p>
              )}
              {allPermisos.map(p => (
                <MenuCard key={p.permisoId} permiso={p} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
