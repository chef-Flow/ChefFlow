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

export default async function CompartidoRecetaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: recetaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()

  // ── 1. Verificar acceso ────────────────────────────────────────────────────
  // Fuente A: share directo de receta
  let directShare: { id: string; puede_ver_precios: boolean; puede_ver_proveedores: boolean; vista: boolean } | null = null
  try {
    const r = await (admin as any)
      .from('recetas_compartidas')
      .select('id, puede_ver_precios, puede_ver_proveedores, vista')
      .eq('receta_id', recetaId)
      .eq('receptor_user_id', user.id)
      .eq('estado', 'activo')
      .single()
    directShare = r?.data ?? null
  } catch { /* tabla no existe aún */ }

  // Fuente B: acceso vía colaboración de menú
  const { data: colabs } = await admin
    .from('colaboradores')
    .select('id')
    .eq('colaborador_user_id', user.id)
    .eq('estado', 'activo')

  const colabIds = (colabs ?? []).map(c => c.id)

  let colabPuedeVerPrecios     = false
  let colabPuedeVerProveedores = false
  let hasColabAccess           = false

  if (colabIds.length) {
    const { data: acceso } = await admin
      .from('colaborador_menus')
      .select('menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores')
      .in('colaborador_id', colabIds)
      .eq('puede_ver_recetas', true)

    if (acceso?.length) {
      const menuIdsPermitidos = acceso.map(a => a.menu_id)
      const { data: menuRelations } = await admin
        .from('menu_recetas')
        .select('menu_id')
        .eq('receta_id', recetaId)
        .in('menu_id', menuIdsPermitidos)

      if (menuRelations?.length) {
        hasColabAccess = true
        const permisosEfectivos = acceso.filter(a =>
          menuRelations.some(mr => mr.menu_id === a.menu_id)
        )
        colabPuedeVerPrecios     = permisosEfectivos.some(p => p.puede_ver_precios)
        colabPuedeVerProveedores = permisosEfectivos.some(p => p.puede_ver_proveedores)
      }
    }
  }

  if (!directShare && !hasColabAccess) notFound()

  // Permisos efectivos: OR de ambas fuentes
  const puedeVerPrecios     = (directShare?.puede_ver_precios ?? false)     || colabPuedeVerPrecios
  const puedeVerProveedores = (directShare?.puede_ver_proveedores ?? false) || colabPuedeVerProveedores

  // Marcar como vista si era nueva
  if (directShare && !directShare.vista) {
    await marcarRecetaVista(directShare.id)
  }

  // ── 2. Obtener datos de la receta ──────────────────────────────────────────
  const [recetaRes, ingRes] = await Promise.all([
    admin
      .from('recetas')
      .select('id, nombre, porciones, costo_total, costo_por_porcion, precio_venta, foto_url, notas, updated_at')
      .eq('id', recetaId)
      .single(),
    admin
      .from('ingredientes_receta')
      .select(`
        id, ingrediente_id, sub_receta_id,
        cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
        precio_unitario_capturado,
        ingrediente:ingrediente_id(nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor),
        sub_receta:sub_receta_id(nombre, costo_total, rendimiento, unidad_rendimiento)
      `)
      .eq('receta_id', recetaId),
  ])

  if (!recetaRes.data) notFound()
  const receta = recetaRes.data as any

  const rows = (ingRes.data ?? []).map((row: any) => {
    const isIng = !!row.ingrediente
    const nombre = isIng ? row.ingrediente.nombre : (row.sub_receta?.nombre ?? '')
    const unidad = isIng ? row.ingrediente.unidad_medida : (row.sub_receta?.unidad_rendimiento ?? '')
    const precio_unitario = isIng
      ? (row.ingrediente.precio_compra ?? 0) / (row.ingrediente.cantidad_presentacion ?? 1)
      : (row.sub_receta?.rendimiento ?? 0) > 0
        ? (row.sub_receta.costo_total ?? 0) / row.sub_receta.rendimiento
        : 0
    return {
      id: row.id,
      nombre,
      unidad,
      precio_unitario,
      cantidad_neta:    Number(row.cantidad_neta),
      peso_merma:       Number(row.peso_merma ?? 0),
      cantidad_bruta:   Number(row.cantidad_bruta),
      porcentaje_merma: Number(row.porcentaje_merma),
      costo:            Number(row.costo),
      proveedor:        isIng ? (row.ingrediente?.proveedor ?? null) : null,
    }
  })

  const fecha = receta.updated_at
    ? new Date(receta.updated_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
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
          {receta.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receta.foto_url}
              alt={receta.nombre}
              className="w-24 h-24 object-cover rounded-lg border border-slate-200 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{receta.nombre}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {receta.porciones} porción{receta.porciones !== 1 ? 'es' : ''}
              {fecha && <> · Actualizado {fecha}</>}
            </p>

            {puedeVerPrecios && (
              <div className="flex gap-5 mt-3">
                <div>
                  <p className="text-xs text-slate-400">Costo total</p>
                  <p className="text-sm font-bold text-orange-700">{fmt(receta.costo_total ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Costo / porción</p>
                  <p className="text-sm font-bold text-orange-600">{fmt(receta.costo_por_porcion ?? 0)}</p>
                </div>
                {receta.precio_venta != null && (
                  <div>
                    <p className="text-xs text-slate-400">Precio de venta</p>
                    <p className="text-sm font-bold text-slate-700">{fmt(receta.precio_venta)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ingredients table */}
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Esta receta no tiene ingredientes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Ingrediente
                  </th>
                  {puedeVerProveedores && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Proveedor
                    </th>
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
                  <tr key={r.id}
                    className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
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

      {/* Notas */}
      {receta.notas && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notas</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{receta.notas}</p>
        </div>
      )}
    </div>
  )
}
