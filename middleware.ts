import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
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

export async function middleware(request: NextRequest) {
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

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/privacidad') ||
    pathname.startsWith('/terminos') ||
    pathname.startsWith('/cumplimiento') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/')

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/ingredientes'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|invitacion|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
}
