import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SubRecetaDetalle from '@/components/subrecetas/SubRecetaDetalle'
import type { Ingrediente, SubReceta } from '@/types'

export const dynamic = 'force-dynamic'

interface IngRow {
  id: string
  ingrediente_id: string
  nombre: string
  unidad: string
  precio_unitario: number
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
}

export default async function SubRecetaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [srRes, ingRes, disponiblesRes, profileRes] = await Promise.all([
    supabase.from('sub_recetas').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('ingredientes_subreceta')
      .select(`
        id, ingrediente_id,
        cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
        ingrediente:ingrediente_id ( nombre, precio_compra, cantidad_presentacion, unidad_medida )
      `)
      .eq('sub_receta_id', id),
    supabase.from('ingredientes').select('*').eq('user_id', user.id).order('nombre'),
    supabase.from('user_profiles').select('plan').eq('id', user.id).single(),
  ])

  if (!srRes.data) notFound()

  const rows: IngRow[] = (ingRes.data ?? []).map((row: any) => {
    const ing = row.ingrediente
    const precio_unitario = ing ? ing.precio_compra / ing.cantidad_presentacion : 0
    return {
      id: row.id,
      ingrediente_id: row.ingrediente_id,
      nombre: ing?.nombre ?? '',
      unidad: ing?.unidad_medida ?? '',
      precio_unitario,
      cantidad_neta: Number(row.cantidad_neta),
      peso_merma: Number(row.peso_merma ?? 0),
      cantidad_bruta: Number(row.cantidad_bruta),
      porcentaje_merma: Number(row.porcentaje_merma),
      costo: Number(row.costo),
    }
  })

  return (
    <SubRecetaDetalle
      subReceta={srRes.data as SubReceta}
      ingredientesSubreceta={rows}
      ingredientesDisponibles={(disponiblesRes.data as Ingrediente[]) ?? []}
      plan={(profileRes.data?.plan ?? 'free') as 'free' | 'basic' | 'pro'}
    />
  )
}
