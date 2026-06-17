export const dynamic = 'force-dynamic'

import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UpgradeSuccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan ?? 'pro'
  const planLabel = plan === 'basic' ? 'Plan Básico' : 'Plan Pro'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{planLabel} activado</h1>
        <p className="text-slate-500 text-sm mb-6">
          Tu suscripción está activa. Ya tienes acceso a todas las funciones incluidas en tu plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/cuenta"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Ver mi cuenta
          </a>
          <a
            href="/recetas"
            className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Ir a recetas
          </a>
        </div>
      </div>
    </div>
  )
}
