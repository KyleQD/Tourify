import { NextRequest, NextResponse } from 'next/server'
import type { ZodTypeAny, z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { authenticateRequestWithBearerFallback } from '@/lib/auth/mobile-request-auth'
import { userHasAdminSurfaceAccess } from '@/lib/auth/admin'
import {
  requireAdminCapability,
  resolveActingAdminContext,
  type ActingAdminContext,
  type AuthenticatedAdminRequest,
} from '@/lib/auth/admin-context'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import {
  adminErrorResponse,
  executeOrgCommand,
  withCorrelationHeaders,
  type AdminCommandTarget,
} from '@/lib/auth/org-command'
import { requireTourCapability } from '@/lib/admin/tour-access.service'
import { requireEventCapability } from '@/lib/admin/event-access.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function pathEntityId(pathname: string, segment: 'tours' | 'events'): string | null {
  const parts = pathname.split('/')
  const index = parts.indexOf(segment)
  const candidate = index >= 0 ? parts[index + 1] || '' : ''
  return UUID_PATTERN.test(candidate) ? candidate : null
}

async function requireCollaboratorRequestScope(args: {
  request: NextRequest
  auth: AuthenticatedAdminRequest
  admin: ActingAdminContext
  capability: AdminCapability
}): Promise<NextResponse | null> {
  if (args.admin.scope !== 'tour_collaborator') return null

  const url = new URL(args.request.url)
  const pathname = url.pathname
  const tourId =
    pathEntityId(pathname, 'tours')
    || url.searchParams.get('tourId')
    || url.searchParams.get('tour_id')
  const eventId =
    pathEntityId(pathname, 'events')
    || url.searchParams.get('eventId')
    || url.searchParams.get('event_id')

  try {
    if (tourId) {
      if (!(args.admin.allowedTourIds || []).includes(tourId)) {
        return adminErrorResponse(404, 'entity_not_found', 'Tour not found.', args.admin.correlationId)
      }
      await requireTourCapability({
        supabase: args.auth.supabase,
        userId: args.auth.user.id,
        tourId,
        orgId: args.admin.orgId,
        capability: args.capability,
        capabilities: args.admin.capabilities,
      })
      return null
    }

    if (eventId) {
      await requireEventCapability({
        supabase: args.auth.supabase,
        userId: args.auth.user.id,
        eventId,
        orgId: args.admin.orgId,
        capability: args.capability,
        capabilities: args.admin.capabilities,
      })
      return null
    }

    const isScopedList =
      args.request.method === 'GET'
      && (pathname === '/api/admin/tours' || pathname === '/api/admin/events')
    const isCollaboratorSearch = pathname === '/api/admin/users/search'
    if (isScopedList || isCollaboratorSearch) return null

    return adminErrorResponse(
      403,
      'tour_scope_required',
      'This administrator account is limited to an assigned tour.',
      args.admin.correlationId,
    )
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: number }).status) || 403
      : 403
    return adminErrorResponse(
      status,
      status === 404 ? 'entity_not_found' : 'capability_denied',
      error instanceof Error ? error.message : 'Tour-scoped access denied.',
      args.admin.correlationId,
    )
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
 * Only JWT-validated identities (bearer token or supabase.auth.getUser()) are accepted.
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

    return null
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
 * Canonical organization/Admin wrapper for domain commands.
 *
 * Unlike `withAdminAuth`, this resolves one explicit acting organization and
 * enforces an operation-specific capability. New Admin APIs should use this
 * wrapper; `withAdminAuth` remains only as a compatibility gate while legacy
 * routes are migrated.
 */
export function withAdminCapability(
  capability: AdminCapability,
  handler: (
    request: NextRequest,
    auth: { user: any; supabase: any; admin: ActingAdminContext },
  ) => Promise<NextResponse> | NextResponse,
) {
  return withAuth(async (request, auth) => {
    const admin = await resolveActingAdminContext(request, auth)
    if (admin instanceof NextResponse) return admin

    const denied = requireAdminCapability(admin, capability)
    if (denied) {
      denied.headers.set('x-correlation-id', admin.correlationId)
      return denied
    }

    const scopeDenied = await requireCollaboratorRequestScope({
      request,
      auth,
      admin,
      capability,
    })
    if (scopeDenied) return scopeDenied

    const response = await handler(request, { ...auth, admin })
    return withCorrelationHeaders(response, admin.correlationId)
  })
}

export {
  executeOrgCommand,
  requireEntityAccess,
  adminErrorResponse,
} from '@/lib/auth/org-command'

export interface WithOrgCommandOptions<TSchema extends ZodTypeAny> {
  capability: AdminCapability
  schema: TSchema
  readInput?: (request: NextRequest) => Promise<unknown> | unknown
  /** Every new command declares organization or concrete entity ownership. */
  target: AdminCommandTarget<z.infer<TSchema>>
  commandName?: string
  requireIdempotency?: boolean
  handler: (args: {
    request: NextRequest
    context: ActingAdminContext
    auth: AuthenticatedAdminRequest
    input: z.infer<TSchema>
    idempotencyKey?: string | null
  }) => Promise<NextResponse> | NextResponse
}

/**
 * SEC-103 HTTP wrapper: auth → acting context → capability → schema → entity → handler.
 */
export function withOrgCommand<TSchema extends ZodTypeAny>(
  options: WithOrgCommandOptions<TSchema>,
) {
  return async (request: NextRequest) => {
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return adminErrorResponse(401, 'unauthenticated', 'Authentication required.')
    }

    const admin = await resolveActingAdminContext(request, authResult)
    if (admin instanceof NextResponse) {
      const incoming = request.headers.get('x-correlation-id')
      if (incoming) admin.headers.set('x-correlation-id', incoming)
      return admin
    }

    const readInput =
      options.readInput ||
      (async (req: NextRequest) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          return Object.fromEntries(new URL(req.url).searchParams.entries())
        }
        return req.json().catch(() => ({}))
      })

    let input: unknown
    try {
      input = await readInput(request)
    } catch {
      return adminErrorResponse(422, 'validation_failed', 'Request body could not be parsed.', admin.correlationId)
    }
    const idempotencyKey =
      request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key')

    if (options.requireIdempotency && !idempotencyKey) {
      return adminErrorResponse(
        422,
        'validation_failed',
        'Idempotency-Key header is required for this command.',
        admin.correlationId,
      )
    }

    return executeOrgCommand({
      context: admin,
      auth: authResult,
      schema: options.schema,
      input,
      capability: options.capability,
      target: options.target,
      idempotencyKey,
      commandName: options.commandName,
      handler: ({ input: parsed, idempotencyKey: key }) =>
        options.handler({
          request,
          context: admin,
          auth: authResult,
          input: parsed,
          idempotencyKey: key,
        }),
    })
  }
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
