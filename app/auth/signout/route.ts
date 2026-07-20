import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { mergeAuthCookieOptions } from '@/lib/supabase/auth-cookie-options'

/**
 * Server-side sign-out clears SSR auth cookies on the redirect response.
 * Client-only signOut can leave cookies intact when React auth state is already null.
 */
export async function GET(request: NextRequest) {
  return handleSignOut(request)
}

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}

async function handleSignOut(request: NextRequest) {
  const redirectUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-cloudify-auth-token',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, mergeAuthCookieOptions(options) as any)
          })
        },
      },
    }
  )

  const authCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(
      (name) =>
        name.includes('sb-') ||
        name.includes('supabase') ||
        name.includes('cloudify-auth')
    )

  await supabase.auth.signOut({ scope: 'global' })

  // Belt-and-suspenders: expire any remaining auth cookies on the redirect.
  for (const name of authCookieNames) {
    response.cookies.set(
      name,
      '',
      mergeAuthCookieOptions({ path: '/', maxAge: 0 }) as any
    )
  }

  return response
}
