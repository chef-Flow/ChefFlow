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

  if (error) {
    const url = new URL('/login', origin)
    url.searchParams.set('error', 'Acceso con Google cancelado.')
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
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
    const url = new URL('/login', origin)
    url.searchParams.set('error', 'No se pudo iniciar sesión.')
    return NextResponse.redirect(url)
  }

  // Si es recuperación de contraseña, ir a reset-password
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', origin))
  }

  // Destino seguro: solo rutas internas
  const redirectTo = next.startsWith('/') ? next : '/analisis'
  return NextResponse.redirect(new URL(redirectTo, origin))
}
