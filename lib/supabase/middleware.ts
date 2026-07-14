import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../database.types'
import { parseUserFromCookieNameValueList } from '@/lib/supabase/tourify-session-cookie'
import { mergeAuthCookieOptions } from '@/lib/supabase/auth-cookie-options'

export type MiddlewareSupabase = SupabaseClient<Database>

const isDev = process.env.NODE_ENV !== 'production'

function parseAuthFromCookies(request: NextRequest) {
  try {
    const cookies = request.cookies.getAll()
    // Avoid dumping every cookie on every request (dev hot-path noise).
    if (isDev && process.env.PERF_DEBUG_MIDDLEWARE === '1') {
      console.log('[Middleware] All cookies:', cookies.map((c) => `${c.name}: ${c.value.length} chars`))
    }
    const user = parseUserFromCookieNameValueList(cookies)
    if (isDev && process.env.PERF_DEBUG_MIDDLEWARE === '1' && user) {
      console.log('[Middleware] User from cookie:', user.id)
    }
    return user
  } catch (error) {
    if (isDev && process.env.PERF_DEBUG_MIDDLEWARE === '1') {
      console.log('[Middleware] Error parsing auth from cookies:', error)
    }
    return null
  }
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (debugMiddleware && userError) {
      console.log(`[Middleware] Supabase auth error:`, userError.message)
    }

    let finalUser = user
    if (!user) {
      if (debugMiddleware) console.log(`[Middleware] Supabase method failed, trying manual cookie parsing...`)
      finalUser = parseAuthFromCookies(request)
    }

    if (debugMiddleware) {
      console.log(`[Middleware] Final result - User exists: ${!!finalUser}`)
      console.log(`[Middleware] User ID: ${finalUser?.id || 'none'}`)
    }

    return { supabaseResponse, user: finalUser, supabase }
  } catch (error) {
    console.error('[Middleware] Error in updateSession:', error)

    const fallbackUser = parseAuthFromCookies(request)
    return { supabaseResponse, user: fallbackUser, supabase }
  }
} 