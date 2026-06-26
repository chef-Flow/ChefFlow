'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { signUpSchema } from '@/lib/validations'

export async function signUpWithTerminos(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = signUpSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chefflow.mx'}/auth/callback`,
    },
  })

  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta.' }

  const service = createServiceClient()
  await service
    .from('user_profiles')
    .upsert({ id: data.user.id, terminos_aceptados_at: new Date().toISOString() })

  return { ok: true }
}
