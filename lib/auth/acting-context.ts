/**
 * Server-side Acting Context resolution.
 *
 * Every API route that needs to know *which* account is performing an action
 * should call `resolveActingContext`. It returns the verified entity information
 * (type + profile UUID) and a `supabase` client scoped to the authenticated user.
 *
 * Resolution order:
 *   1. x-acting-profile-id / x-acting-account-type request headers
 *      (sent by the client after a local `switchAccount` call)
 *   2. user_sessions table (server-side persisted context)
 *   3. General account fallback (always safe)
 *
 * Security: ownership is verified against the appropriate entity table before
 * returning. An attacker cannot claim to act as an entity they don't own.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import type { ProfileType } from '@/lib/accounts/account-types'
import { normalizeAccountType, isOrganizationType } from '@/lib/accounts/account-types'

export interface ActingContext {
  /** Authenticated user id */
  userId: string
  /** The entity account type the user is currently operating as */
  accountType: ProfileType
  /** UUID of the entity (artist_profiles.id, venue_profiles.id, etc.) or userId for general */
  profileId: string
  /** Supabase client authenticated as the user */
  supabase: any
}

type OwnershipResult = { owned: boolean; reason?: string }

async function verifyOwnership(
  supabase: any,
  userId: string,
  profileId: string,
  accountType: ProfileType
): Promise<OwnershipResult> {
  if (accountType === 'general') {
    return { owned: profileId === userId }
  }

  if (accountType === 'artist' || accountType === 'service') {
    const { data } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return { owned: Boolean(data) }
  }

  if (accountType === 'venue') {
    const { data } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return { owned: Boolean(data) }
  }

  if (isOrganizationType(accountType)) {
    const { data } = await supabase
      .from('organizer_accounts')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return { owned: Boolean(data) }
  }

  return { owned: false, reason: `Unknown account type: ${accountType}` }
}

async function resolveFromSession(
  supabase: any,
  userId: string
): Promise<{ accountType: ProfileType; profileId: string } | null> {
  const { data: session } = await supabase
    .from('user_sessions')
    .select('active_profile_id, active_account_type')
    .eq('user_id', userId)
    .maybeSingle()

  if (!session) return null

  const accountType = normalizeAccountType(session.active_account_type)
  const profileId: string = session.active_profile_id ?? userId

  return { accountType, profileId }
}

/**
 * Resolve and verify the acting context for an API request.
 * Returns null with an appropriate NextResponse error if authentication fails.
 * Returns the context or a NextResponse error tuple.
 */
export async function resolveActingContext(
  request: NextRequest
): Promise<ActingContext | NextResponse> {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, supabase } = auth
  const userId: string = user.id

  // 1. Client-sent headers (most recent context, set on every switch)
  const headerProfileId = request.headers.get('x-acting-profile-id')
  const headerAccountType = request.headers.get('x-acting-account-type')

  if (headerProfileId && headerAccountType) {
    const accountType = normalizeAccountType(headerAccountType)
    const { owned } = await verifyOwnership(supabase, userId, headerProfileId, accountType)
    if (owned) {
      return { userId, accountType, profileId: headerProfileId, supabase }
    }
    // Header present but ownership check failed → fall through to session
  }

  // 2. Server-side session
  const fromSession = await resolveFromSession(supabase, userId)
  if (fromSession) {
    const { accountType, profileId } = fromSession
    const { owned } = await verifyOwnership(supabase, userId, profileId, accountType)
    if (owned) {
      return { userId, accountType, profileId, supabase }
    }
  }

  // 3. Safe fallback: general account (user's own profile row)
  return {
    userId,
    accountType: 'general',
    profileId: userId,
    supabase,
  }
}

/**
 * Like `resolveActingContext` but also enforces that the resolved context matches
 * one of the `requiredTypes`. Returns 403 if the acting entity doesn't match.
 *
 * Usage example in an API route:
 *   const ctx = await requireActingContext(request, ['artist', 'service'])
 *   if (ctx instanceof NextResponse) return ctx
 */
export async function requireActingContext(
  request: NextRequest,
  requiredTypes: ProfileType[]
): Promise<ActingContext | NextResponse> {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const normalizedRequired = requiredTypes.map(normalizeAccountType)
  if (!normalizedRequired.includes(ctx.accountType)) {
    return NextResponse.json(
      {
        error: `Action requires one of [${requiredTypes.join(', ')}] account. Currently acting as: ${ctx.accountType}`,
      },
      { status: 403 }
    )
  }

  return ctx
}

/**
 * Append an audit row to `acting_context_snapshots`. Best-effort and non-blocking:
 * failures are swallowed so the underlying mutation is never affected.
 *
 * Call AFTER a successful mutation, e.g.:
 *   await recordActingSnapshot(ctx, { action: 'post.create', resourceType: 'post', resourceId: post.id })
 */
export async function recordActingSnapshot(
  ctx: ActingContext,
  input: {
    action: string
    resourceType?: string
    resourceId?: string | null
    workAssignmentId?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await ctx.supabase.from('acting_context_snapshots').insert({
      user_id: ctx.userId,
      acting_profile_id: ctx.profileId,
      acting_account_type: ctx.accountType,
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      work_assignment_id: input.workAssignmentId ?? null,
      metadata: input.metadata ?? {},
    })
  } catch {
    // Audit is best-effort; never block the mutation.
  }
}
