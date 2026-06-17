import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/configuracion/SettingsForm'
import type { PlataformaDelivery } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, plataformasRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('iva_porcentaje, margen_minimo, comision_bancaria, unidades_personalizadas, presentaciones_personalizadas')
      .eq('id', user.id)
      .single(),
    supabase
      .from('plataformas_delivery')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre'),
  ])

  if (profileRes.error) {
    console.error('[ConfiguracionPage] Error fetching user_profiles:', JSON.stringify(profileRes.error))
  }
  if (plataformasRes.error) {
    console.error('[ConfiguracionPage] Error fetching plataformas:', JSON.stringify(plataformasRes.error))
  }

  // Si el perfil no existe todavía, lo creamos con valores por defecto
  if (!profileRes.data && !profileRes.error?.message?.includes('column')) {
    await supabase
      .from('user_profiles')
      .insert({ id: user.id })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Personaliza los parámetros de costeo de tu restaurante
        </p>
      </div>

      <SettingsForm
        initialIva={profileRes.data?.iva_porcentaje ?? 16}
        initialMargen={profileRes.data?.margen_minimo ?? 65}
        initialComisionBancaria={profileRes.data?.comision_bancaria ?? 0}
        initialPlataformas={(plataformasRes.data as PlataformaDelivery[]) ?? []}
        initialUnidades={(profileRes.data?.unidades_personalizadas as string[]) ?? []}
        initialPresentaciones={(profileRes.data?.presentaciones_personalizadas as string[]) ?? []}
      />
    </div>
  )
}
