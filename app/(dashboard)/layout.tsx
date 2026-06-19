import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    const emailLower = user.email.toLowerCase().trim()
    await Promise.all([
      supabase
        .from('colaboradores')
        .update({ colaborador_user_id: user.id, estado: 'activo' })
        .eq('email', emailLower)
        .eq('estado', 'pendiente'),
      supabase
        .from('recetas_compartidas')
        .update({ receptor_user_id: user.id, estado: 'activo' })
        .eq('receptor_email', emailLower)
        .eq('estado', 'pendiente'),
    ])
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden">
          <MobileHeader />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
