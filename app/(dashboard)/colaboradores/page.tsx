export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ColaboradoresList from '@/components/colaboradores/ColaboradoresList'
import type { Colaborador, ColaboradorMenu, Menu } from '@/types'

interface ColabWithPerms extends Colaborador {
  permisos: ColaboradorMenu[]
}

export default async function ColaboradoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [colabsRes, menusRes, profileRes] = await Promise.all([
    supabase.from('colaboradores')
      .select('*, colaborador_menus(*)')
      .eq('propietario_id', user.id)
      .order('created_at'),
    supabase.from('menus')
      .select('id, nombre, color, orden')
      .eq('user_id', user.id)
      .order('nombre'),
    supabase.from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .single(),
  ])

  const colabs: ColabWithPerms[] = ((colabsRes.data ?? []) as any[]).map(c => ({
    ...c,
    permisos: c.colaborador_menus ?? [],
  }))

  return (
    <ColaboradoresList
      initialColabs={colabs}
      menus={(menusRes.data as Menu[]) ?? []}
      ownerPlan={(profileRes.data?.plan ?? 'free') as 'free' | 'basic' | 'pro'}
    />
  )
}
