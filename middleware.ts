import { NextResponse, type NextRequest } from 'next/server'

// In-memory rate limit store — resets on cold start (Edge/Node restarts)
// Structure: key → { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

function getIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// Referencia del proyecto Supabase, extraída de la URL (sin llamadas de red).
// El SDK guarda la sesión en cookies con nombre `sb-<ref>-auth-token`
// (o `sb-<ref>-auth-token.0`, `.1`, ... si el valor se fragmenta por tamaño).
const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /^https:\/\/([^.]+)\.supabase\.co/
)?.[1]
const AUTH_COOKIE_PREFIX = SUPABASE_PROJECT_REF ? `sb-${SUPABASE_PROJECT_REF}-auth-token` : null

// Presencia de la cookie de sesión, sin validar su firma ni llamar a Supabase.
// Es solo una señal para decidir redirects de UX; la verificación real ocurre
// en cada página/layout del dashboard vía `supabase.auth.getUser()` server-side.
function hasSessionCookie(request: NextRequest): boolean {
  if (!AUTH_COOKIE_PREFIX) return false
  return request.cookies.getAll().some(
    (c) => c.name === AUTH_COOKIE_PREFIX || c.name.startsWith(`${AUTH_COOKIE_PREFIX}.`)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIP(request)

  // Rate limiting — only on POST (form submission)
  if (request.method === 'POST') {
    if (pathname.startsWith('/login')) {
      // 5 attempts per minute per IP
      if (isRateLimited(`login:${ip}`, 5, 60_000)) {
        return new NextResponse('Demasiados intentos. Espera un momento.', {
          status: 429,
          headers: { 'Retry-After': '60', 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    } else if (pathname.startsWith('/registro')) {
      // 3 attempts per hour per IP
      if (isRateLimited(`registro:${ip}`, 3, 3_600_000)) {
        return new NextResponse('Demasiados intentos de registro. Intenta más tarde.', {
          status: 429,
          headers: { 'Retry-After': '3600', 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    }
  }

  const hasSession = hasSessionCookie(request)

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/privacidad') ||
    pathname.startsWith('/terminos') ||
    pathname.startsWith('/cumplimiento') ||
    pathname.startsWith('/reembolsos') ||
    pathname.startsWith('/cancelacion') ||
    pathname.startsWith('/arco') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/')

  if (!hasSession && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/ingredientes'
    return NextResponse.redirect(url)
  }

  // Usuario autenticado en landing → dashboard
  // Cubre el caso donde Supabase redirige a la Site URL en vez del callback
  if (hasSession && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/analisis'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|invitacion|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
}
