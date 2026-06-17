export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProveedoresList from '@/components/proveedores/ProveedoresList'
import type { Proveedor } from '@/types'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('proveedores')
    .select('*')
    .eq('user_id', user.id)
    .order('nombre')

  return <ProveedoresList initialProveedores={(data as Proveedor[]) ?? []} />
}
