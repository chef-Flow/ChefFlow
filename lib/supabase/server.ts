import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies set via middleware
          }
        },
      },
    }
  )
}

// Deduplicado por request: layout.tsx y page.tsx llaman a esto en el mismo
// render y antes disparaban una llamada de red a Supabase Auth cada uno.
// `cache()` de React memoiza el resultado dentro del mismo request-render.
export const getUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})
