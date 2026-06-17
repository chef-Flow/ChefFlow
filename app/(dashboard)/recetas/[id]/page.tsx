export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RecetaDetalle from '@/components/recetas/RecetaDetalle'
import type { Ingrediente, Receta, PlataformaDelivery } from '@/types'

interface IngRow {
  id: string
  ingrediente_id: string | null
  sub_receta_id: string | null
  nombre: string
  unidad: string
  precio_unitario: number
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
  precio_unitario_capturado: number | null
  proveedor: string | null
}

export default async function RecetaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recetaRes, ingRes, ingredientesRes, subRecetasRes, profileRes, plataformasRes] =
    await Promise.all([
      supabase.from('recetas').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase
        .from('ingredientes_receta')
        .select(`
          id, ingrediente_id, sub_receta_id,
          cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
          precio_unitario_capturado,
          ingrediente:ingrediente_id ( nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor ),
          sub_receta:sub_receta_id ( nombre, costo_total, rendimiento, unidad_rendimiento )
        `)
        .eq('receta_id', id),
      supabase.from('ingredientes').select('*').eq('user_id', user.id).order('nombre'),
      supabase.from('sub_recetas')
        .select('id, nombre, costo_total, rendimiento, unidad_rendimiento')
        .eq('user_id', user.id).order('nombre'),
      supabase.from('user_profiles')
        .select('iva_porcentaje, margen_minimo, comision_bancaria, plan')
        .eq('id', user.id).single(),
      supabase.from('plataformas_delivery')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre'),
    ])

  if (!recetaRes.data) notFound()

  const rows: IngRow[] = (ingRes.data ?? []).map((row: any) => {
    const isIng = !!row.ingrediente
    const nombre = isIng ? row.ingrediente.nombre : row.sub_receta?.nombre ?? ''
    const unidad = isIng ? row.ingrediente.unidad_medida : row.sub_receta?.unidad_rendimiento ?? ''
    const precio_unitario = isIng
      ? (row.ingrediente.precio_compra ?? 0) / (row.ingrediente.cantidad_presentacion ?? 1)
      : (row.sub_receta?.rendimiento ?? 0) > 0
        ? (row.sub_receta.costo_total ?? 0) / row.sub_receta.rendimiento
        : 0
    return {
      id: row.id,
      ingrediente_id: row.ingrediente_id,
      sub_receta_id: row.sub_receta_id,
      nombre,
      unidad,
      precio_unitario,
      cantidad_neta: Number(row.cantidad_neta),
      peso_merma: Number(row.peso_merma ?? 0),
      cantidad_bruta: Number(row.cantidad_bruta),
      porcentaje_merma: Number(row.porcentaje_merma),
      costo: Number(row.costo),
      precio_unitario_capturado: row.precio_unitario_capturado != null
        ? Number(row.precio_unitario_capturado)
        : null,
      proveedor: isIng ? (row.ingrediente?.proveedor ?? null) : null,
    }
  })

  return (
    <RecetaDetalle
      receta={recetaRes.data as Receta}
      ingredientesReceta={rows}
      ingredientesDisponibles={(ingredientesRes.data as Ingrediente[]) ?? []}
      subRecetasDisponibles={subRecetasRes.data ?? []}
      plataformasDelivery={(plataformasRes.data as PlataformaDelivery[]) ?? []}
      iva={profileRes.data?.iva_porcentaje ?? 16}
      margenMinimo={profileRes.data?.margen_minimo ?? 65}
      comisionBancaria={profileRes.data?.comision_bancaria ?? 0}
      plan={(profileRes.data?.plan ?? 'free') as 'free' | 'basic' | 'pro'}
    />
  )
}
