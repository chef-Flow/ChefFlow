'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getResend, buildInvitacionEmail } from '@/lib/resend'
import type { Colaborador, ColaboradorMenu } from '@/types'

interface ColabWithPerms extends Colaborador {
  permisos: ColaboradorMenu[]
}

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function enviarCorreoInvitacion({
  to,
  token,
  ownerName,
}: {
  to: string
  token: string
  ownerName: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const html = buildInvitacionEmail({ ownerName, appUrl, token })

  const { error } = await getResend().emails.send({
    from: 'ChefFlow <onboarding@resend.dev>',
    to,
    subject: `${ownerName} te invita a colaborar en ChefFlow`,
    html,
  })

  if (error) throw new Error(error.message)
}

export async function invitarColaborador(
  email: string
): Promise<{ ok: boolean; colab?: ColabWithPerms; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) || user.email || 'El propietario'

  const emailLower = email.trim().toLowerCase()

  const admin = getAdmin()

  // Rate limit: max 10 invitaciones por hora por usuario
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentInvites } = await admin
    .from('colaboradores')
    .select('id', { count: 'exact', head: true })
    .eq('propietario_id', user.id)
    .gte('created_at', oneHourAgo)
  if ((recentInvites ?? 0) >= 10) {
    return { ok: false, error: 'Has enviado demasiadas invitaciones. Intenta de nuevo en una hora.' }
  }

  // Usar admin para el insert y leer el token generado
  const { data: inserted, error: insertError } = await admin
    .from('colaboradores')
    .insert({ propietario_id: user.id, email: emailLower })
    .select('id, propietario_id, colaborador_user_id, email, estado, token, created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') return { ok: false, error: 'Este colaborador ya fue invitado.' }
    return { ok: false, error: insertError.message }
  }

  try {
    await enviarCorreoInvitacion({ to: emailLower, token: inserted.token, ownerName })
  } catch (err: any) {
    console.error('[invitarColaborador] Resend error:', err.message)
    // El registro ya fue insertado — avisamos pero no revertimos
    return {
      ok: true,
      colab: { ...(inserted as Colaborador), permisos: [] },
      error: `Colaborador agregado, pero el correo no se pudo enviar: ${err.message}`,
    }
  }

  revalidatePath('/colaboradores')
  return { ok: true, colab: { ...(inserted as Colaborador), permisos: [] } }
}

export async function reenviarInvitacion(
  colaboradorId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) || user.email || 'El propietario'

  const admin = getAdmin()
  const { data: colab, error: fetchError } = await admin
    .from('colaboradores')
    .select('id, email, token, estado, propietario_id')
    .eq('id', colaboradorId)
    .eq('propietario_id', user.id)
    .single()

  if (fetchError || !colab) return { ok: false, error: 'Colaborador no encontrado.' }
  if (colab.estado !== 'pendiente') return { ok: false, error: 'La invitación ya fue aceptada o revocada.' }

  try {
    await enviarCorreoInvitacion({ to: colab.email, token: colab.token, ownerName })
  } catch (err: any) {
    return { ok: false, error: err.message }
  }

  return { ok: true }
}
