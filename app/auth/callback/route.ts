import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const type  = searchParams.get('type')
  const next  = searchParams.get('next') ?? '/analisis'
  const error = searchParams.get('error')

  // En producción (Vercel) el hostname público viene en x-forwarded-host.
  // Usar origin directamente puede dar la URL interna del proxy en algunos entornos.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const baseUrl = forwardedHost ? `https://${forwardedHost}` : origin

  if (error) {
    const url = new URL('/login', baseUrl)
    url.searchParams.set('error', 'Acceso con Google cancelado.')
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const url = new URL('/login', baseUrl)
    url.searchParams.set('error', 'No se pudo iniciar sesión.')
    return NextResponse.redirect(url)
  }

  // Si es recuperación de contraseña, ir a reset-password
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', baseUrl))
  }

  // Destino seguro: solo rutas internas (rechaza //host y URLs absolutas)
  let redirectTo = next.startsWith('/') && !next.startsWith('//') ? next : '/analisis'

  // Respaldo: si el ?next= no llegó (Supabase a veces ignora la query string
  // de redirectTo/emailRedirectTo si la URL exacta no está en su lista de
  // Redirect URLs y cae al destino por default), usamos el plan que la
  // pantalla de registro/login guardó en una cookie antes de arrancar el
  // login con Google o el signup por correo.
  const pendingPlan = cookieStore.get('cf_pending_plan')?.value
  const pendingBilling = cookieStore.get('cf_pending_billing')?.value
  if (redirectTo === '/analisis' && (pendingPlan === 'basic' || pendingPlan === 'pro')) {
    redirectTo = `/upgrade?plan=${pendingPlan}${pendingPlan === 'pro' && pendingBilling === 'annual' ? '&billing=annual' : ''}`
  }

  const response = NextResponse.redirect(new URL(redirectTo, baseUrl))
  if (pendingPlan)    response.cookies.set('cf_pending_plan', '', { maxAge: 0, path: '/' })
  if (pendingBilling) response.cookies.set('cf_pending_billing', '', { maxAge: 0, path: '/' })
  return response
}
