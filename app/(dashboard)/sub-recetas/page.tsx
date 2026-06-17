export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubRecetasList from '@/components/subrecetas/SubRecetasList'
import type { SubReceta, Menu } from '@/types'

export default async function SubRecetasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: subRecetas }, { data: menus }] = await Promise.all([
    supabase.from('sub_recetas').select('*').order('nombre'),
    supabase.from('menus').select('id, nombre, color').eq('user_id', user.id).order('orden'),
  ])

  return (
    <SubRecetasList
      initialSubRecetas={(subRecetas as SubReceta[]) ?? []}
      menus={(menus as Pick<Menu, 'id' | 'nombre' | 'color'>[]) ?? []}
    />
  )
}
