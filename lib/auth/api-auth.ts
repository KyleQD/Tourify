import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { authenticateRequestWithBearerFallback } from '@/lib/auth/mobile-request-auth'
import { userHasAdminSurfaceAccess } from '@/lib/auth/admin'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

function parseAuthFromRequestCookies(request: NextRequest) {
  try {
    return parseUserFromRequestCookieHeader(request.headers.get('cookie'))
  } catch {
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

    const mobileCompatibleAuth = await authenticateRequestWithBearerFallback(request)
    if (mobileCompatibleAuth) {
      return mobileCompatibleAuth
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
 * Check if user has organizer / Admin Work Mode permissions.
 * Uses the same surface gate as middleware (`userHasAdminSurfaceAccess`) so API and
 * page access cannot drift. When tourId is supplied, also checks tour ownership or
 * confirmed team membership.
 */
export async function checkAdminPermissions(user: any, opts?: { tourId?: string }): Promise<boolean> {
  if (!user?.id) return false
  try {
    const supabase = createServiceClient()
    const hasAdminAccess = await userHasAdminSurfaceAccess(supabase, user.id)
    if (!hasAdminAccess) return false

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
