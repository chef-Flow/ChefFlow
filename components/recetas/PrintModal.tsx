'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface IngRowPrint {
  nombre: string; unidad: string; proveedor?: string | null
  cantidad_neta: number; peso_merma: number
  cantidad_bruta: number; porcentaje_merma: number
  precio_unitario: number; costo: number
}

interface MargenPrint {
  sinIva: number; ivaMonto: number
  costosPct: number; margenPesos: number; margenPct: number
  despuésBancaria?: number; pctBancaria?: number
  despuésDelivery?: number; pctDelivery?: number
  plataformaNombre?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  recetaNombre: string
  porciones: number
  costoTotal: number
  costoPorcion: number
  updatedAt: string
  fotoUrl?: string | null
  notas?: string | null
  rows: IngRowPrint[]
  margen: MargenPrint | null
  precioVenta: number
  iva: number
}

export default function PrintModal({
  isOpen, onClose, recetaNombre, porciones, costoTotal, costoPorcion,
  updatedAt, fotoUrl, notas, rows, margen, precioVenta, iva,
}: Props) {
  const [inclPrecios, setInclPrecios]         = useState(true)
  const [inclProveedores, setInclProveedores] = useState(false)
  const [inclFoto, setInclFoto]               = useState(true)
  const [inclNotas, setInclNotas]             = useState(true)

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
  const pct = (v: number) => `${v.toFixed(1)}%`
  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) {
      alert('Permite las ventanas emergentes en tu navegador para imprimir.')
      return
    }
    const content = buildHTML()
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(recetaNombre)}</title>
  <style>
    * { box-sizing: border-box; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { @page { margin: 12mm 15mm; } }
    @media screen { body { padding: 20px; } }
  </style>
</head>
<body>
${content}
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 400);
    window.addEventListener('afterprint', function () { window.close(); });
  });
<\/script>
</body>
</html>`)
    win.document.close()
  }

  const buildHTML = () => {
    const fecha = new Date(updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

    const th  = 'padding:6px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#555;border-bottom:2px solid #e2e8f0;text-align:left;white-space:nowrap;'
    const thR = th + 'text-align:right;'
    const td  = 'padding:6px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;'
    const tdR = td + 'text-align:right;'

    const rowsHTML = rows.map((r, i) => {
      const bg = i % 2 === 1 ? 'background:#f8fafc;' : ''
      const u = esc(r.unidad)
      return `<tr style="${bg}">
        <td style="${td}font-weight:500;">${esc(r.nombre)}</td>
        ${inclProveedores ? `<td style="${td}color:#64748b;">${r.proveedor ? esc(r.proveedor) : '—'}</td>` : ''}
        <td style="${tdR}">${r.cantidad_neta} ${u}</td>
        <td style="${tdR}">${r.peso_merma} ${u}</td>
        <td style="${tdR}">${r.cantidad_bruta.toFixed(3)} ${u}</td>
        <td style="${tdR}">${pct(r.porcentaje_merma)}</td>
        ${inclPrecios ? `<td style="${tdR}color:#64748b;">${fmt(r.precio_unitario)}/${u}</td>` : ''}
        ${inclPrecios ? `<td style="${tdR}font-weight:700;color:#c2410c;">${fmt(r.costo)}</td>` : ''}
      </tr>`
    }).join('')

    const fotoHTML = inclFoto && fotoUrl ? `
      <img src="${esc(fotoUrl)}"
        style="width:180px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;"
        alt="${esc(recetaNombre)}" />` : ''

    const margenHTML = margen && inclPrecios ? `
      <div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="background:#fff7ed;padding:10px 14px;border-bottom:1px solid #fed7aa;">
          <span style="font-size:13px;font-weight:700;color:#9a3412;">Análisis de Margen</span>
          <span style="font-size:12px;color:#64748b;margin-left:8px;">Precio de venta: ${fmt(precioVenta)}</span>
        </div>
        <div style="padding:10px 14px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="font-size:12px;color:#475569;padding:3px 0;">IVA (${iva}%)</td><td style="font-size:12px;text-align:right;color:#475569;">${fmt(margen.ivaMonto)}</td></tr>
            <tr><td style="font-size:12px;color:#475569;padding:3px 0;">Precio sin IVA</td><td style="font-size:12px;text-align:right;color:#475569;">${fmt(margen.sinIva)}</td></tr>
            <tr><td style="font-size:12px;color:#475569;padding:3px 0;">Costo por porción (${pct(margen.costosPct)})</td><td style="font-size:12px;text-align:right;color:#475569;">${fmt(costoPorcion)}</td></tr>
            <tr><td style="font-size:12px;color:#475569;padding:3px 0;">Margen bruto</td><td style="font-size:12px;text-align:right;color:#475569;">${fmt(margen.margenPesos)}</td></tr>
            ${margen.pctBancaria ? `<tr><td style="font-size:12px;color:#475569;padding:3px 0;">Comisión bancaria (${pct(margen.pctBancaria || 0)})</td><td style="font-size:12px;text-align:right;color:#dc2626;">−${fmt(margen.despuésBancaria || 0)}</td></tr>` : ''}
            ${margen.pctDelivery ? `<tr><td style="font-size:12px;color:#475569;padding:3px 0;">${esc(margen.plataformaNombre) || 'Delivery'} (${pct(margen.pctDelivery || 0)})</td><td style="font-size:12px;text-align:right;color:#dc2626;">−${fmt(margen.despuésDelivery || 0)}</td></tr>` : ''}
            <tr style="border-top:2px solid #e2e8f0;">
              <td style="font-size:13px;font-weight:700;color:#1e293b;padding:6px 0 3px;">% Margen</td>
              <td style="font-size:13px;font-weight:700;text-align:right;color:#1e293b;">${pct(margen.margenPct)}</td>
            </tr>
          </table>
        </div>
      </div>` : ''

    return `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;max-width:780px;margin:0 auto;padding:24px 32px;">

        <!-- Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:3px solid #ea580c;margin-bottom:18px;">
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ea580c;margin-bottom:4px;">ChefFlow · Costeo de Receta</div>
            <h1 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#0f172a;">${esc(recetaNombre)}</h1>
            <div style="font-size:12px;color:#64748b;">${porciones} porción${porciones !== 1 ? 'es' : ''} &nbsp;·&nbsp; Actualizado: ${fecha}</div>
          </div>
          ${fotoHTML}
        </div>

        <!-- Ingredientes -->
        <div style="margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Ingredientes</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="${th}">Ingrediente</th>
              ${inclProveedores ? `<th style="${th}">Proveedor</th>` : ''}
              <th style="${thR}">Neto</th>
              <th style="${thR}">Merma</th>
              <th style="${thR}">Bruto</th>
              <th style="${thR}">% Merma</th>
              ${inclPrecios ? `<th style="${thR}">Precio/u</th><th style="${thR}">Costo</th>` : ''}
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>

        <!-- Totales -->
        ${inclPrecios ? `
        <div style="margin-top:12px;padding:10px 14px;background:#fff7ed;border-radius:6px;border:1px solid #fed7aa;display:flex;justify-content:flex-end;gap:32px;">
          <div style="text-align:right;">
            <div style="font-size:10px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Costo total</div>
            <div style="font-size:16px;font-weight:800;color:#9a3412;">${fmt(costoTotal)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Costo por porción</div>
            <div style="font-size:16px;font-weight:800;color:#ea580c;">${fmt(costoPorcion)}</div>
          </div>
        </div>` : ''}

        ${margenHTML}

        ${inclNotas && notas ? `
        <!-- Notas -->
        <div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Notas de la receta</span>
          </div>
          <div style="padding:12px 14px;">
            <p style="font-size:12px;color:#334155;line-height:1.65;white-space:pre-wrap;margin:0;">${esc(notas)}</p>
          </div>
        </div>` : ''}

        <!-- Footer -->
        <div style="margin-top:28px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">
          Generado con ChefFlow · ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    `
  }

  const toggle = (label: string, val: boolean, set: (v: boolean) => void, disabled?: boolean) => (
    <label key={label} className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-brand-500" disabled={disabled} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir / Exportar PDF" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Selecciona qué información incluir:</p>
        <div className="space-y-2">
          {toggle('Incluir precios y costos', inclPrecios, setInclPrecios)}
          {toggle('Incluir columna de proveedor', inclProveedores, setInclProveedores)}
          {toggle('Incluir foto de la receta', inclFoto, setInclFoto, !fotoUrl)}
          {toggle('Incluir notas', inclNotas, setInclNotas, !notas)}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center">
          En el diálogo de impresión, elige "Guardar como PDF" para exportar.
        </p>
      </div>
    </Modal>
  )
}
