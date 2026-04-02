import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface AuthSession {
  access_token: string
  user: {
    id: string
    email: string
    [key: string]: any
  }
  expires_at: number
  [key: string]: any
}

// Helper function to manually parse the auth session from request cookies (same logic as middleware)
function parseAuthFromRequestCookies(request: NextRequest): any | null {
  try {
    const cookies = request.headers.get('cookie') || ''
    const cookieArray = cookies.split(';').map(c => c.trim())
    
    // Look for the auth cookie that matches our client configuration
    const authCookie = cookieArray.find(cookie => 
      cookie.startsWith('sb-tourify-auth-token=')
    )
    
    if (!authCookie) {
      // Fallback to old patterns for existing users
      const fallbackCookie = cookieArray.find(cookie => 
        (cookie.includes('sb-') && 
         cookie.includes('auth-token') && 
         !cookie.includes('code-verifier') &&
         !cookie.includes('refresh') &&
         cookie.split('=')[1]?.length > 100) ||
        (cookie.startsWith('sb-') && 
         cookie.includes('auqddrodjezjlypkzfpi') &&
         !cookie.includes('code-verifier') &&
         cookie.split('=')[1]?.length > 100)
      )
      
      if (fallbackCookie) {
        const cookieValue = fallbackCookie.split('=')[1]
        return tryParseCookieValue(cookieValue)
      }
      
      return null
    }
    
    const cookieValue = authCookie.split('=')[1]
    
    return tryParseCookieValue(cookieValue)
  } catch (error) {
    return null
  }
}

function tryParseCookieValue(cookieValue: string): any | null {
  if (!cookieValue) {
    return null
  }
  
  try {
    // Try to parse the session data
    const sessionData: AuthSession = JSON.parse(decodeURIComponent(cookieValue))
    
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
      const sessionData2: AuthSession = JSON.parse(cookieValue)
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
 * Create a service role Supabase client for API operations
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Authenticate API request and return user + user-scoped Supabase client.
 * Uses server session first, then falls back to manual cookie parsing.
 */
export async function authenticateApiRequest(request?: NextRequest): Promise<{ user: any; supabase: any } | null> {
  try {
    if (!request) {
      return null
    }
    
    const supabase = await createServerClient()
    const { data: { user: sessionUser } } = await supabase.auth.getUser()
    if (sessionUser) {
      return { user: sessionUser, supabase }
    }

    // Fallback path while session cookie handling is being stabilized
    const fallbackUser = parseAuthFromRequestCookies(request)
    if (!fallbackUser) return null

    return { user: fallbackUser, supabase }
  } catch (error) {
    console.error('[API Auth] 💥 Authentication error:', error)
    return null
  }
}

/**
 * Check if user has organizer permissions.
 * Verifies the user owns at least one admin/organizer profile.
 * When tourId is supplied, also checks tour ownership or confirmed team membership.
 */
export async function checkAdminPermissions(user: any, opts?: { tourId?: string }): Promise<boolean> {
  if (!user?.id) return false
  try {
    const supabase = createServiceClient()

    const { data: organizerAccount } = await supabase
      .from('organizer_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, account_type, role, is_admin, account_settings')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const hasLegacyOrganizerData = Boolean(
      adminProfile?.account_settings?.organizer_data?.organization_name ||
      adminProfile?.account_settings?.organizer_accounts?.length
    )
    const hasAdminProfile =
      adminProfile?.account_type === 'admin' ||
      adminProfile?.role === 'admin' ||
      adminProfile?.is_admin === true

    const hasOrganizerAccess = Boolean(organizerAccount || hasLegacyOrganizerData || hasAdminProfile)
    if (!hasOrganizerAccess) return false

    if (!opts?.tourId) return true

    const tourId = opts.tourId

    const { data: tourOwner } = await supabase
      .from('tours')
      .select('id')
      .eq('id', tourId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (tourOwner) return true

    const { data: team } = await supabase
      .from('tour_team_members')
      .select('id')
      .eq('tour_id', tourId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .maybeSingle()

    return !!team
  } catch (err) {
    console.error('[API Auth] checkAdminPermissions error:', err)
    return false
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 * Usage: export const POST = withAuth(async (request, { user, supabase }) => { ... })
 */
export function withAuth(
  handler: (
    request: NextRequest, 
    auth: { user: any; supabase: any }
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest) => {
    const authResult = await authenticateApiRequest(request)
    
    // If authentication failed, return error response
    if (!authResult) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 })
    }
    
    // Call the handler with authenticated user and supabase client
    return handler(request, authResult)
  }
}

/**
 * Middleware wrapper for API routes that require admin/organizer permissions
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    auth: { user: any; supabase: any }
  ) => Promise<NextResponse> | NextResponse,
  opts?: { tourIdFromRequest?: (request: NextRequest) => string | undefined }
) {
  return withAuth(async (request, auth) => {
    const tourId = opts?.tourIdFromRequest?.(request)
    const hasAdminAccess = await checkAdminPermissions(auth.user, { tourId })
    if (!hasAdminAccess) {
      return NextResponse.json({
        error: 'Forbidden',
        details: 'Admin access required'
      }, { status: 403 })
    }

    return handler(request, auth)
  })
}

/**
 * Check if request has valid authentication without throwing errors
 */
export async function checkAuth(request: NextRequest): Promise<{ user: any; supabase: any } | null> {
  try {
    return await authenticateApiRequest(request)
  } catch (error) {
    console.error('[API Auth] Auth check failed:', error)
    return null
  }
}

// Alias for backward compatibility
export { authenticateApiRequest as parseAuthFromCookies }
