import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isOrganizationType, normalizeAccountType } from '@/lib/accounts/account-types'
import {
  hasAdminCapability,
  resolveEffectiveAdminCapabilities,
  type AdminCapability,
} from '@/lib/auth/admin-capabilities'

export interface AuthenticatedAdminRequest {
  user: { id: string; email?: string | null; phone?: string | null }
  // Supabase client authenticated as the requesting user. Authorization lookups
  // intentionally do not use service_role so RLS remains part of the boundary.
  supabase: any
}

export interface ActingAdminContext {
  userId: string
  profileId: string
  accountType: 'organization'
  orgId: string
  membershipRole: string
  capabilities: AdminCapability[]
  source: 'header' | 'session'
  /** Organization-wide authority or a project-only tour collaboration. */
  scope?: 'organization' | 'tour_collaborator'
  /** Populated for tour collaborators; empty for organization-wide admins. */
  allowedTourIds?: string[]
  /** Stable per-request id for logs, audit, and client correlation (SEC-101). */
  correlationId: string
}

function resolveCorrelationId(headers: Pick<Headers, 'get'>): string {
  const incoming = headers.get('x-correlation-id') || headers.get('x-request-id')
  if (incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming.trim())) return incoming.trim()
  return crypto.randomUUID()
}

/** Org-scoped client cache key segment — include when invalidating after account switch. */
export function actingAdminCacheKey(context: Pick<ActingAdminContext, 'orgId' | 'profileId'>): string {
  return `admin-org:${context.orgId}:profile:${context.profileId}`
}

interface OrganizationProfileRow {
  id: string
  user_id?: string | null
  ops_org_id?: string | null
  is_active?: boolean | null
}

interface MembershipRow {
  org_id: string
  role: string
}

const TOUR_COLLABORATOR_CAPABILITIES: AdminCapability[] = [
  'tour.view',
  'tour.manage',
  'tour.publish',
  'event.view',
  'event.manage',
  'event.publish',
  'event.live_ops',
  'routing.manage',
  'advance.manage',
  'logistics.view',
  'logistics.manage',
  'workforce.view',
  'workforce.manage',
  'vendor.view',
  'vendor.manage',
  'ticketing.view',
  'ticketing.manage',
  'site_map.view',
  'site_map.edit',
  'site_map.share',
  'communications.send',
  'communications.broadcast',
]

interface ActingProfileCandidate {
  profileId: string
  requestedOrgId: string | null
  source: 'header' | 'session'
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status })
}

export function parseExplicitAdminActingHeaders(
  headers: Pick<Headers, 'get'>,
): ActingProfileCandidate | NextResponse | null {
  const profileId = headers.get('x-acting-profile-id')
  const accountType = headers.get('x-acting-account-type')
  const requestedOrgId = headers.get('x-acting-org-id')

  if (!profileId && !accountType && !requestedOrgId) return null

  if (!profileId || !accountType) {
    return errorResponse(
      400,
      'invalid_acting_context',
      'Acting profile and account type headers must be supplied together.',
    )
  }

  if (!isOrganizationType(accountType)) {
    return errorResponse(
      409,
      'acting_context_required',
      `Admin operations require an organization account; received ${normalizeAccountType(accountType)}.`,
    )
  }

  return { profileId, requestedOrgId, source: 'header' }
}

async function loadOrganizationProfile(
  supabase: AuthenticatedAdminRequest['supabase'],
  profileId: string,
): Promise<OrganizationProfileRow | NextResponse> {
  const { data, error } = await supabase
    .from('organizer_accounts')
    .select('id, user_id, ops_org_id, is_active')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    return errorResponse(503, 'acting_context_unavailable', 'Unable to verify the acting organization.')
  }
  if (!data?.id || data.is_active === false) {
    return errorResponse(403, 'organization_access_denied', 'The acting organization is not available.')
  }
  if (!data.ops_org_id) {
    return errorResponse(
      409,
      'organization_scope_required',
      'The selected organization has not been connected to an operations organization.',
    )
  }

  return data as OrganizationProfileRow
}

async function loadMembership(
  supabase: AuthenticatedAdminRequest['supabase'],
  userId: string,
  orgId: string,
): Promise<MembershipRow | NextResponse | null> {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return errorResponse(503, 'membership_unavailable', 'Unable to verify organization membership.')
  }
  if (!data?.org_id || !data.role) return null

  return data as MembershipRow
}

async function loadTourCollaboratorScope(
  supabase: AuthenticatedAdminRequest['supabase'],
  userId: string,
  orgId: string,
): Promise<{ role: string; tourIds: string[] } | NextResponse | null> {
  const { data: memberships, error: membershipError } = await supabase
    .from('tour_team_members')
    .select('tour_id, role, status, is_active')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .eq('is_active', true)

  if (membershipError) {
    return errorResponse(503, 'collaboration_scope_unavailable', 'Unable to verify tour collaboration access.')
  }

  const candidateIds = Array.from(new Set(
    (memberships || [])
      .map((row: { tour_id?: string | null }) => row.tour_id)
      .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id)),
  ))
  if (candidateIds.length === 0) return null

  const { data: tours, error: toursError } = await supabase
    .from('tours')
    .select('id, org_id')
    .in('id', candidateIds)
    .eq('org_id', orgId)
  if (toursError) {
    return errorResponse(503, 'collaboration_scope_unavailable', 'Unable to verify tour collaboration access.')
  }

  const tourIds = (tours || []).map((tour: { id: string }) => tour.id)
  if (tourIds.length === 0) return null
  const member = (memberships || []).find((row: { tour_id?: string }) => tourIds.includes(String(row.tour_id || '')))
  return { role: String(member?.role || 'admin'), tourIds }
}

async function loadCapabilities(
  supabase: AuthenticatedAdminRequest['supabase'],
  membershipRole: string,
): Promise<AdminCapability[] | NextResponse> {
  const { data, error } = await supabase
    .from('org_role_permissions')
    .select('perms')
    .eq('role', membershipRole)
    .maybeSingle()

  if (error) {
    return errorResponse(503, 'capabilities_unavailable', 'Unable to resolve organization capabilities.')
  }

  return resolveEffectiveAdminCapabilities({
    role: membershipRole,
    configuredPermissions: data?.perms,
    membershipStatus: 'active',
  })
}

async function buildContextForProfile(
  auth: AuthenticatedAdminRequest,
  candidate: ActingProfileCandidate,
  correlationId: string,
): Promise<ActingAdminContext | NextResponse> {
  const organization = await loadOrganizationProfile(auth.supabase, candidate.profileId)
  if (organization instanceof NextResponse) return organization

  const orgId = organization.ops_org_id as string
  if (candidate.requestedOrgId && candidate.requestedOrgId !== orgId) {
    return errorResponse(
      403,
      'acting_context_mismatch',
      'The requested organization does not match the selected account.',
    )
  }

  const membership = await loadMembership(auth.supabase, auth.user.id, orgId)
  if (membership instanceof NextResponse) return membership

  if (!membership) {
    if (organization.user_id === auth.user.id) {
      return {
        userId: auth.user.id,
        profileId: organization.id,
        accountType: 'organization',
        orgId,
        membershipRole: 'owner',
        capabilities: resolveEffectiveAdminCapabilities({
          role: 'owner',
          membershipStatus: 'active',
        }),
        source: candidate.source,
        scope: 'organization',
        allowedTourIds: [],
        correlationId,
      }
    }

    const collaborator = await loadTourCollaboratorScope(auth.supabase, auth.user.id, orgId)
    if (collaborator instanceof NextResponse) return collaborator
    if (!collaborator) {
      return errorResponse(403, 'organization_access_denied', 'The acting organization is not available.')
    }
    return {
      userId: auth.user.id,
      profileId: organization.id,
      accountType: 'organization',
      orgId,
      membershipRole: collaborator.role,
      capabilities: [...TOUR_COLLABORATOR_CAPABILITIES],
      source: candidate.source,
      scope: 'tour_collaborator',
      allowedTourIds: collaborator.tourIds,
      correlationId,
    }
  }

  const capabilities = await loadCapabilities(auth.supabase, membership.role)
  if (capabilities instanceof NextResponse) return capabilities

  return {
    userId: auth.user.id,
    profileId: organization.id,
    accountType: 'organization',
    orgId,
    membershipRole: membership.role,
    capabilities,
    source: candidate.source,
    scope: 'organization',
    allowedTourIds: [],
    correlationId,
  }
}

/**
 * Resolve a single, verified organization for an Admin request.
 *
 * Explicit acting headers win, followed by the persisted organization session.
 * Membership rows authorize a selected organization but never select one.
 */
export async function resolveActingAdminContext(
  request: NextRequest,
  auth: AuthenticatedAdminRequest,
): Promise<ActingAdminContext | NextResponse> {
  const correlationId = resolveCorrelationId(request.headers)
  const explicit = parseExplicitAdminActingHeaders(request.headers)
  if (explicit instanceof NextResponse) return explicit
  if (explicit) return buildContextForProfile(auth, explicit, correlationId)

  const { data: session, error: sessionError } = await auth.supabase
    .from('user_sessions')
    .select('active_profile_id, active_account_type')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (sessionError && sessionError.code !== '42P01') {
    return errorResponse(503, 'acting_context_unavailable', 'Unable to load the acting account session.')
  }

  if (
    session?.active_profile_id &&
    isOrganizationType(session.active_account_type)
  ) {
    return buildContextForProfile(auth, {
      profileId: session.active_profile_id,
      requestedOrgId: null,
      source: 'session',
    }, correlationId)
  }

  return errorResponse(
    409,
    'acting_context_required',
    'Select an organization account before continuing.',
  )
}

export function requireAdminCapability(
  context: ActingAdminContext,
  capability: AdminCapability,
): NextResponse | null {
  if (hasAdminCapability(context.capabilities, capability)) return null
  return errorResponse(
    403,
    'capability_denied',
    `This action requires the ${capability} capability.`,
  )
}
