import { createClient, getUser } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await getUser()

  // ── Onboarding checklist ─────────────────────────────────────────────────
  // Solo se calcula si hay usuario y no ha completado el onboarding todavía.
  let onboardingPasos: { ingrediente: boolean; receta: boolean; menuReceta: boolean } | null = null

  if (user) {
    const emailLower = user.email?.toLowerCase().trim()

    try {
      // Estas tres consultas son independientes entre sí — se corren en
      // paralelo en vez de una tras otra para no encadenar round-trips.
      const [, , { data: checklist }] = await Promise.all([
        emailLower
          ? supabase
              .from('colaboradores')
              .update({ colaborador_user_id: user.id, estado: 'activo' })
              .eq('email', emailLower)
              .eq('estado', 'pendiente')
          : Promise.resolve(null),
        // Tabla puede no existir aún — ignorar error sin crashear el layout
        emailLower
          ? (supabase as any)
              .from('recetas_compartidas')
              .update({ receptor_user_id: user.id, estado: 'activo' })
              .eq('receptor_email', emailLower)
              .eq('estado', 'pendiente')
              .then(() => {}).catch(() => {})
          : Promise.resolve(null),
        (supabase as any)
          .from('onboarding_checklist')
          .select('completado')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (!checklist?.completado) {
        const [ingRes, recRes, menusRes] = await Promise.all([
          supabase.from('ingredientes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('recetas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('menus').select('id').eq('user_id', user.id),
        ])

        const menusCount = (menusRes.data ?? []).length

        const pasos = {
          ingrediente: (ingRes.count ?? 0) > 0,
          receta:      (recRes.count ?? 0) > 0,
          menuReceta:  menusCount > 0,
        }

        // Usuario sin fila en onboarding que ya tiene todo hecho →
        // marcar silenciosamente sin mostrar el panel (caso: usuarios existentes al desplegar)
        if (!checklist && pasos.ingrediente && pasos.receta && pasos.menuReceta) {
          await (supabase as any)
            .from('onboarding_checklist')
            .insert({ user_id: user.id, completado: true })
            .catch(() => {})
        } else {
          onboardingPasos = pasos
        }
      }
    } catch { /* tabla no existe aún — skip */ }
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

      {onboardingPasos && <OnboardingChecklist pasos={onboardingPasos} />}
    </div>
  )
}
