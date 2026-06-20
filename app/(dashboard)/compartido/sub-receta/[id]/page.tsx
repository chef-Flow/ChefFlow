export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { marcarRecetaVista } from '@/app/(dashboard)/recetas/compartir-actions'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

export default async function CompartidoSubRecetaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: subRecetaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()

  // Verificar share activo
  let directShare: { id: string; puede_ver_precios: boolean; puede_ver_proveedores: boolean; vista: boolean } | null = null
  try {
    const r = await (admin as any)
      .from('recetas_compartidas')
      .select('id, puede_ver_precios, puede_ver_proveedores, vista')
      .eq('sub_receta_id', subRecetaId)
      .eq('receptor_user_id', user.id)
      .eq('estado', 'activo')
      .single()
    directShare = r?.data ?? null
  } catch { /* tabla no existe aún */ }

  if (!directShare) notFound()

  const { puedeVerPrecios: puedeVerPrecios, puedeVerProveedores } = {
    puedeVerPrecios:     directShare.puede_ver_precios,
    puedeVerProveedores: directShare.puede_ver_proveedores,
  }

  // Marcar como vista
  if (!directShare.vista) {
    await marcarRecetaVista(directShare.id)
  }

  // Datos de la sub-receta e ingredientes
  const [srRes, ingRes] = await Promise.all([
    admin
      .from('sub_recetas')
      .select('id, nombre, rendimiento, unidad_rendimiento, costo_total, margen_seguridad, updated_at')
      .eq('id', subRecetaId)
      .single(),
    admin
      .from('ingredientes_subreceta')
      .select(`
        id, ingrediente_id,
        cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
        ingrediente:ingrediente_id(nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor)
      `)
      .eq('sub_receta_id', subRecetaId),
  ])

  if (!srRes.data) notFound()
  const sr = srRes.data as any

  const rows = (ingRes.data ?? []).map((row: any) => ({
    id:               row.id,
    nombre:           row.ingrediente?.nombre ?? '',
    unidad:           row.ingrediente?.unidad_medida ?? '',
    precio_unitario:  (row.ingrediente?.precio_compra ?? 0) / (row.ingrediente?.cantidad_presentacion ?? 1),
    cantidad_neta:    Number(row.cantidad_neta),
    peso_merma:       Number(row.peso_merma ?? 0),
    cantidad_bruta:   Number(row.cantidad_bruta),
    porcentaje_merma: Number(row.porcentaje_merma),
    costo:            Number(row.costo),
    proveedor:        row.ingrediente?.proveedor ?? null,
  }))

  const costoPorUnidad = sr.rendimiento > 0 ? (sr.costo_total ?? 0) / sr.rendimiento : 0
  const fecha = sr.updated_at
    ? new Date(sr.updated_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/compartido"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft size={15} />
        Volver a Compartido conmigo
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="flex items-start gap-5 p-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Sub-receta</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{sr.nombre}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Rendimiento: {sr.rendimiento} {sr.unidad_rendimiento}
              {fecha && <> · Actualizado {fecha}</>}
            </p>

            {puedeVerPrecios && (
              <div className="flex gap-5 mt-3">
                <div>
                  <p className="text-xs text-slate-400">Costo total</p>
                  <p className="text-sm font-bold text-orange-700">{fmt(sr.costo_total ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Costo / {sr.unidad_rendimiento}</p>
                  <p className="text-sm font-bold text-orange-600">{fmt(costoPorUnidad)}</p>
                </div>
                {(sr.margen_seguridad ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-slate-400">Margen seguridad</p>
                    <p className="text-sm font-bold text-slate-600">{sr.margen_seguridad}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ingredients table */}
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Esta sub-receta no tiene ingredientes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingrediente</th>
                  {puedeVerProveedores && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Proveedor</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Neto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Merma</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Bruto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% Merma</th>
                  {puedeVerPrecios && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio/u</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{r.nombre}</td>
                    {puedeVerProveedores && (
                      <td className="px-4 py-2.5 text-sm text-slate-500">{r.proveedor ?? '—'}</td>
                    )}
                    <td className="px-4 py-2.5 text-sm text-right text-slate-600 whitespace-nowrap">
                      {r.cantidad_neta} {r.unidad}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-slate-500 whitespace-nowrap">
                      {r.peso_merma} {r.unidad}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-slate-600 whitespace-nowrap">
                      {r.cantidad_bruta.toFixed(3)} {r.unidad}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-slate-400">
                      {r.porcentaje_merma.toFixed(1)}%
                    </td>
                    {puedeVerPrecios && (
                      <>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-500 whitespace-nowrap">
                          {fmt(r.precio_unitario)}/{r.unidad}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right font-semibold text-orange-600 whitespace-nowrap">
                          {fmt(r.costo)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
