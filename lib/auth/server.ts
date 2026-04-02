import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface AuthResult {
  user: any
  supabase: any
}

export interface AuthError {
  error: string
  details?: string
  status: number
}

// Helper function to manually parse auth session from cookies (API route version)
async function parseAuthFromApiCookies() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Look for the main auth cookie
    const authCookie = allCookies.find(cookie => 
      cookie.name === 'sb-tourify-auth-token'
    )
    
    if (!authCookie) {
      // Fallback to old patterns for existing users
      const fallbackCookie = allCookies.find(cookie => 
        (cookie.name.includes('sb-') && 
         cookie.name.includes('auth-token') && 
         !cookie.name.includes('code-verifier') &&
         !cookie.name.includes('refresh') &&
         cookie.value.length > 100) ||
        (cookie.name.startsWith('sb-') && 
         cookie.name.includes('auqddrodjezjlypkzfpi') &&
         !cookie.name.includes('code-verifier') &&
         cookie.value.length > 100)
      )
      
      if (fallbackCookie) {
        return tryParseCookieValue(fallbackCookie.value)
      }
      
      return null
    }
    
    return tryParseCookieValue(authCookie.value)
  } catch (error) {
    return null
  }
}

function tryParseCookieValue(cookieValue: string) {
  try {
    // Try to parse the session data
    const sessionData = JSON.parse(decodeURIComponent(cookieValue))
    
    if (sessionData && sessionData.access_token && sessionData.user) {
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (sessionData.expires_at && sessionData.expires_at > now) {
        return sessionData.user
      } else {
        return null
      }
    } else {
      return null
    }
  } catch (parseError) {
    // Try parsing without URL decoding
    try {
      const sessionData2 = JSON.parse(cookieValue)
      if (sessionData2 && sessionData2.access_token && sessionData2.user) {
        return sessionData2.user
      }
    } catch (parseError2) {
      // ignore
    }
    
    return null
  }
}

/**
 * Create service role client that bypasses RLS for database operations
 */
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for service role')
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Authenticate user in API routes with proper Next.js 15 compatibility
 * Returns either authenticated user + supabase client or error response
 */
export async function authenticateApiRequest(): Promise<AuthResult | NextResponse> {
  try {
    // First try the standard Supabase method
    const standardSupabase = await createClient()
    const { data: { user } } = await standardSupabase.auth.getUser()
    
    let finalUser = user
    
    // If Supabase method fails, try manual cookie parsing (like middleware does)
    if (!user) {
      finalUser = await parseAuthFromApiCookies()
    }
    
    if (!finalUser) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        details: 'User session not found'
      }, { status: 401 })
    }
    
    // Create service role client for database operations that bypass RLS
    const serviceSupabase = createServiceRoleClient()
    
    return { user: finalUser, supabase: serviceSupabase }
  } catch (error) {
    console.error('[API Auth] 💥 Authentication error:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 * Usage: export const POST = withAuth(async (request, { user, supabase }) => { ... })
 */
export function withAuth(
  handler: (
    request: Request, 
    auth: AuthResult
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: Request) => {
    const authResult = await authenticateApiRequest()
    
    // If authentication failed, return the error response
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    // Call the handler with authenticated user and supabase client
    return handler(request, authResult)
  }
}

/**
 * Check if request has valid authentication without throwing errors
 * Useful for optional authentication scenarios
 */
export async function checkAuth(): Promise<{ user: any; supabase: any } | null> {
  try {
    // Try manual cookie parsing first since it's more reliable
    const userFromCookies = await parseAuthFromApiCookies()
    
    if (userFromCookies) {
      const supabase = createServiceRoleClient()
      return { user: userFromCookies, supabase }
    }
    
    // Fallback to standard Supabase method
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return { user, supabase: createServiceRoleClient() }
  } catch (error) {
    console.error('[API Auth] Auth check failed:', error)
    return null
  }
}
