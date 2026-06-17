'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function signUpWithTerminos(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta.' }

  const service = createServiceClient()
  await service
    .from('user_profiles')
    .upsert({ id: data.user.id, terminos_aceptados_at: new Date().toISOString() })

  return { ok: true }
}
