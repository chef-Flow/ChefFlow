'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markOnboardingComplete(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('onboarding_checklist')
    .upsert({ user_id: user.id, completado: true }, { onConflict: 'user_id' })

  revalidatePath('/', 'layout')
}
