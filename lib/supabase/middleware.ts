import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../database.types'
import { parseUserFromCookieNameValueList } from '@/lib/supabase/tourify-session-cookie'

const isDev = process.env.NODE_ENV !== 'production'

function parseAuthFromCookies(request: NextRequest) {
  try {
    const cookies = request.cookies.getAll()
    if (isDev) console.log('[Middleware] All cookies:', cookies.map((c) => `${c.name}: ${c.value.length} chars`))
    const user = parseUserFromCookieNameValueList(cookies)
    if (isDev && user) console.log('[Middleware] User from cookie:', user.id)
    return user
  } catch (error) {
    if (isDev) console.log('[Middleware] Error parsing auth from cookies:', error)
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
          supabaseResponse.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set(name, '', options)
        },
      },
    }
  )

  try {
    if (isDev) console.log(`[Middleware] Checking auth for path: ${request.nextUrl.pathname}`)
    
    if (isDev) {
      const allCookies = request.cookies.getAll()
      const authCookies = allCookies.filter(cookie => 
        cookie.name.includes('supabase') || 
        cookie.name.includes('sb-') ||
        cookie.name.includes('tourify-auth')
      )
      console.log(`[Middleware] Found ${authCookies.length} auth-related cookies:`, authCookies.map(c => c.name))
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (isDev && userError) {
      console.log(`[Middleware] Supabase auth error:`, userError.message)
    }

    if (isDev) console.log(`[Middleware] Supabase method - User exists: ${!!user}`)
    
    let finalUser = user
    if (!user) {
      if (isDev) console.log(`[Middleware] Supabase method failed, trying manual cookie parsing...`)
      finalUser = parseAuthFromCookies(request)
    }
    
    if (isDev) {
      console.log(`[Middleware] Final result - User exists: ${!!finalUser}`)
      console.log(`[Middleware] User ID: ${finalUser?.id || 'none'}`)
    }

    return { supabaseResponse, user: finalUser }
  } catch (error) {
    console.error('[Middleware] Error in updateSession:', error)
    
    if (isDev) console.log('[Middleware] Exception occurred, trying manual fallback...')
    const fallbackUser = parseAuthFromCookies(request)
    return { supabaseResponse, user: fallbackUser }
  }
} 