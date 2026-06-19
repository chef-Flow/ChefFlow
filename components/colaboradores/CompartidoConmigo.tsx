'use client'

import { useState, useTransition } from 'react'
import { Share2, Printer, Eye, EyeOff, Pencil, Check, X, Loader2, ChefHat } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { actualizarPrecioCompartido } from '@/app/(dashboard)/colaboradores/actions'

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

interface Props {
  comparticiones: Comparticion[]
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

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

function MenuCard({ permiso }: { permiso: PermisoConMenu }) {
  const handlePrint = () => {
    const el = document.getElementById(`print-menu-${permiso.menuId}`)
    if (!el) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${permiso.menu.nombre}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
        td { font-size: 13px; padding: 8px; border-bottom: 1px solid #f1f5f9; }
        @media print { button { display: none; } }
      </style></head><body>
      ${el.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: permiso.menu.color }} />
          <h2 className="text-base font-semibold text-slate-800">{permiso.menu.nombre}</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {permiso.puedeEditar ? (
              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">Puede editar</span>
            ) : (
              <span className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Eye size={10} /> Solo lectura
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
        >
          <Printer size={13} />
          Imprimir
        </button>
      </div>

      {/* Print content — invisible, only used by handlePrint */}
      <div id={`print-menu-${permiso.menuId}`} className="hidden">
        <h1>{permiso.menu.nombre}</h1>
        {permiso.puedeVerRecetas && permiso.menu.recetas.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Receta</th>
                <th>Porciones</th>
                {permiso.puedeVerPrecios && <th>Costo/porción</th>}
                {permiso.puedeVerPrecios && <th>Precio venta</th>}
              </tr>
            </thead>
            <tbody>
              {permiso.menu.recetas.map(r => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>{r.porciones}</td>
                  {permiso.puedeVerPrecios && <td>{fmt(r.costo_por_porcion)}</td>}
                  {permiso.puedeVerPrecios && <td>{r.precio_venta != null ? fmt(r.precio_venta) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Sin recetas en este menú.</p>
        )}
      </div>

      {/* Visible recipe list */}
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
            <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors">
              {/* Thumbnail + name — clickable to recipe detail */}
              <Link
                href={`/compartido/receta/${r.id}`}
                className="flex items-center gap-4 flex-1 min-w-0 group"
              >
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
                    <PrecioEditable
                      recetaId={r.id}
                      initial={r.precio_venta}
                      canEdit={permiso.puedeEditar}
                    />
                  </div>
                </div>
              )}

              {!permiso.puedeVerPrecios && permiso.puedeEditar && (
                <div className="flex-shrink-0">
                  <PrecioEditable
                    recetaId={r.id}
                    initial={r.precio_venta}
                    canEdit={true}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CompartidoConmigo({ comparticiones }: Props) {
  const allPermisos = comparticiones.flatMap(c => c.permisos)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="text-indigo-500" size={22} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compartido conmigo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Menús y recetas que otros chefs han compartido contigo</p>
        </div>
      </div>

      {allPermisos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Share2 className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Ningún menú compartido contigo aún.</p>
          <p className="text-slate-400 text-xs mt-1">
            Cuando alguien te invite a un menú, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {allPermisos.map(p => (
            <MenuCard key={p.permisoId} permiso={p} />
          ))}
        </div>
      )}
    </div>
  )
}
