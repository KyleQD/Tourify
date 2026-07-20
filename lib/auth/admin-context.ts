import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isOrganizationType, normalizeAccountType } from '@/lib/accounts/account-types'
import {
  hasAdminCapability,
  resolveAdminCapabilities,
  type AdminCapability,
} from '@/lib/auth/admin-capabilities'

export interface AuthenticatedAdminRequest {
  user: { id: string; email?: string | null }
  // Supabase client authenticated as the requesting user. Authorization lookups
  // intentionally do not use service_role so RLS remains part of the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}

export interface ActingAdminContext {
  userId: string
  profileId: string
  accountType: 'organization'
  orgId: string
  membershipRole: string
  capabilities: AdminCapability[]
  source: 'header' | 'session' | 'single_membership'
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

export function selectSingleMembershipFallback(
  memberships: MembershipRow[],
): MembershipRow | NextResponse {
  if (memberships.length === 0) {
    return errorResponse(
      403,
      'organization_access_required',
      'No organization membership is available for this account.',
    )
  }

  if (memberships.length > 1) {
    return errorResponse(
      409,
      'acting_context_required',
      'Select an organization account before continuing.',
    )
  }

  return memberships[0]
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
): Promise<MembershipRow | NextResponse> {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return errorResponse(503, 'membership_unavailable', 'Unable to verify organization membership.')
  }
  if (!data?.org_id || !data.role) {
    return errorResponse(403, 'organization_access_denied', 'The acting organization is not available.')
  }

  return data as MembershipRow
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

  return resolveAdminCapabilities(membershipRole, data?.perms)
}

async function buildContextForProfile(
  auth: AuthenticatedAdminRequest,
  candidate: ActingProfileCandidate,
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
  }
}

/**
 * Resolve a single, verified organization for an Admin request.
 *
 * Explicit acting headers win, followed by the persisted organization session.
 * A single membership may be used as a compatibility fallback. Multiple
 * memberships are never resolved by array order; the caller must select one.
 */
export async function resolveActingAdminContext(
  request: NextRequest,
  auth: AuthenticatedAdminRequest,
): Promise<ActingAdminContext | NextResponse> {
  const explicit = parseExplicitAdminActingHeaders(request.headers)
  if (explicit instanceof NextResponse) return explicit
  if (explicit) return buildContextForProfile(auth, explicit)

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
    })
  }

  const { data: membershipRows, error: membershipError } = await auth.supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', auth.user.id)

  if (membershipError) {
    return errorResponse(503, 'membership_unavailable', 'Unable to load organization memberships.')
  }

  const uniqueMemberships = Array.from(
    new Map(
      ((membershipRows || []) as MembershipRow[]).map(row => [row.org_id, row]),
    ).values(),
  )
  const membership = selectSingleMembershipFallback(uniqueMemberships)
  if (membership instanceof NextResponse) return membership

  const { data: organizations, error: organizationError } = await auth.supabase
    .from('organizer_accounts')
    .select('id, ops_org_id')
    .eq('ops_org_id', membership.org_id)
    .eq('is_active', true)
    .limit(2)

  if (organizationError) {
    return errorResponse(503, 'acting_context_unavailable', 'Unable to load the organization account.')
  }

  const profileId = organizations?.length === 1
    ? String(organizations[0].id)
    : membership.org_id
  const capabilities = await loadCapabilities(auth.supabase, membership.role)
  if (capabilities instanceof NextResponse) return capabilities

  return {
    userId: auth.user.id,
    profileId,
    accountType: 'organization',
    orgId: membership.org_id,
    membershipRole: membership.role,
    capabilities,
    source: 'single_membership',
  }
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
