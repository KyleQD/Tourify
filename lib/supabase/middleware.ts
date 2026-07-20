import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../database.types'
import { mergeAuthCookieOptions } from '@/lib/supabase/auth-cookie-options'

export type MiddlewareSupabase = SupabaseClient<Database>

const isDev = process.env.NODE_ENV !== 'production'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-tourify-auth-token',
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set(name, value, mergeAuthCookieOptions(options) as any)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set(name, '', mergeAuthCookieOptions(options) as any)
        },
      },
    }
  )

  try {
    const debugMiddleware = isDev && process.env.PERF_DEBUG_MIDDLEWARE === '1'
    if (debugMiddleware) {
      console.log(`[Middleware] Checking auth for path: ${request.nextUrl.pathname}`)
      const allCookies = request.cookies.getAll()
      const authCookies = allCookies.filter(cookie =>
        cookie.name.includes('supabase') ||
        cookie.name.includes('sb-') ||
        cookie.name.includes('tourify-auth')
      )
      console.log(`[Middleware] Found ${authCookies.length} auth-related cookies:`, authCookies.map(c => c.name))
    }

    // Authorization decisions must use JWT-validated getUser() only.
    // Never trust unsigned cookie JSON as a user identity.
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (debugMiddleware && userError) {
      console.log(`[Middleware] Supabase auth error:`, userError.message)
    }

    if (debugMiddleware) {
      console.log(`[Middleware] Final result - User exists: ${!!user}`)
      console.log(`[Middleware] User ID: ${user?.id || 'none'}`)
    }

    return { supabaseResponse, user, supabase }
  } catch (error) {
    console.error('[Middleware] Error in updateSession:', error)
    return { supabaseResponse, user: null, supabase }
  }
} 