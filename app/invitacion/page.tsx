export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface Props {
  searchParams: { token?: string }
}

export default async function InvitacionPage({ searchParams }: Props) {
  const token = searchParams.token?.trim()

  if (!token) {
    return <ErrorPage message="Enlace de invitación inválido." />
  }

  // Buscar la invitación por token (sin RLS, con admin)
  const admin = getAdmin()
  const { data: colab } = await admin
    .from('colaboradores')
    .select('id, email, estado, propietario_id')
    .eq('token', token)
    .single()

  if (!colab) {
    return <ErrorPage message="Esta invitación no existe o ya expiró." />
  }

  if (colab.estado === 'revocado') {
    return <ErrorPage message="Esta invitación fue cancelada por el propietario." />
  }

  if (colab.estado === 'activo') {
    // Ya aceptada — ir directo al dashboard compartido
    redirect('/compartido')
  }

  // estado === 'pendiente' → verificar si el usuario está autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirigir a login con el token para que vuelvan aquí después
    redirect(`/login?redirect=/invitacion%3Ftoken%3D${token}`)
  }

  // Usuario autenticado
  if (user.email?.toLowerCase() !== colab.email.toLowerCase()) {
    return (
      <ErrorPage
        message={`Esta invitación es para ${colab.email}. Estás autenticado con ${user.email}.`}
      />
    )
  }

  // Aceptar la invitación
  await admin
    .from('colaboradores')
    .update({ colaborador_user_id: user.id, estado: 'activo' })
    .eq('id', colab.id)

  redirect('/compartido')
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Invitación no válida</h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <Link href="/login"
          className="inline-block px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
          Ir al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
