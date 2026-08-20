import "server-only"

import {
  createOpaqueTrackingToken,
  hashTrackingToken,
  isSafePromoterDestinationPath,
} from '@/lib/promoter-network/tracking'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
  ServiceRoleJobError,
} from '@/lib/supabase/service-role-job'

export class PromoterAssetCommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422,
  ) {
    super(message)
    this.name = 'PromoterAssetCommandError'
  }
}

type MembershipScope = { orgId: string; eventId: string; membershipId: string }

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] || null : data
}

async function resolveMembershipScope(membershipId: string): Promise<MembershipScope> {
  const orgId = await resolveServiceRoleJobOrgId({
    moduleId: 'promoter.assets',
    reason: 'Resolve promoter asset membership scope',
    lookup: async (service) => {
      const { data } = await service
        .from('event_promoter_memberships')
        .select('id, event_promotion_programs:program_id(event_id, events_v2:event_id(org_id))')
        .eq('id', membershipId)
        .maybeSingle()
      return (data as any)?.event_promotion_programs?.events_v2?.org_id || null
    },
  })
  if (!orgId) throw new PromoterAssetCommandError('membership_not_found', 'Promoter membership not found.', 404)

  const eventId = await executeServiceRoleJob({
    orgId,
    reason: 'Verify promoter asset membership event',
    moduleId: 'promoter.assets',
  }, async (service) => {
    const { data } = await service
      .from('event_promoter_memberships')
      .select('event_promotion_programs:program_id(event_id)')
      .eq('id', membershipId)
      .maybeSingle()
    return (data as any)?.event_promotion_programs?.event_id || null
  })
  if (!eventId) throw new PromoterAssetCommandError('membership_not_found', 'Promoter membership not found.', 404)
  return { orgId, eventId, membershipId }
}

async function assertAttributionEnabled(service: any) {
  const flags = await resolveEventPromoterFlags(service)
  if (!flags.event_promoter_attribution_capture_enabled) {
    throw new PromoterAssetCommandError('feature_disabled', 'Promoter attribution is not enabled.', 404)
  }
}

async function createTrackingLinkInScope(input: {
  actorUserId: string
  scope: MembershipScope
  label?: string | null
  destinationPath: string
  expiresAt?: string | null
  channel?: 'external' | 'native_post'
}) {
  if (!isSafePromoterDestinationPath(input.destinationPath)) {
    throw new PromoterAssetCommandError('invalid_destination', 'Tracking links must use a safe Tourify path.', 400)
  }
  const token = createOpaqueTrackingToken()
  const result = await executeServiceRoleJob({
    orgId: input.scope.orgId,
    reason: 'Create approved promoter tracking link',
    moduleId: 'promoter.assets',
    target: { eventId: input.scope.eventId },
  }, async (service) => {
    await assertAttributionEnabled(service)
    const { data, error } = await service.rpc('create_event_promoter_tracking_link', {
      p_actor_id: input.actorUserId,
      p_membership_id: input.scope.membershipId,
      p_token_hash: hashTrackingToken(token),
      p_label: input.label || null,
      p_destination_path: input.destinationPath,
      p_expires_at: input.expiresAt || null,
      p_channel: input.channel || 'external',
    })
    if (error) throw error
    const link = firstRow(data as any)
    if (!link) throw new PromoterAssetCommandError('link_create_failed', 'Unable to create promoter tracking link.', 503)
    return link
  })
  return { ...result, token }
}

export async function createPromoterTrackingLink(input: {
  actorUserId: string
  membershipId: string
  label?: string | null
  destinationPath?: string | null
  expiresAt?: string | null
}) {
  try {
    const scope = await resolveMembershipScope(input.membershipId)
    return await createTrackingLinkInScope({
      ...input,
      scope,
      destinationPath: input.destinationPath || defaultPromoterDestinationPath(scope.eventId),
    })
  } catch (error) {
    if (error instanceof PromoterAssetCommandError) throw error
    if (error instanceof ServiceRoleJobError)
      throw new PromoterAssetCommandError(error.code, error.message, 403)
    const databaseError = error as { code?: string; message?: string }
    const status = databaseError.code === 'P0002' ? 404 : databaseError.code === '42501' ? 403 : 422
    throw new PromoterAssetCommandError(databaseError.code || 'asset_unavailable', databaseError.message || 'Promoter asset is unavailable.', status)
  }
}

export async function bindPromoterPromoCode(input: {
  actorUserId: string
  membershipId: string
  promoCodeId: string
}) {
  try {
    const scope = await resolveMembershipScope(input.membershipId)
    return await executeServiceRoleJob({
      orgId: scope.orgId,
      reason: 'Bind existing ticketing promo code to promoter',
      moduleId: 'promoter.assets',
      target: { eventId: scope.eventId },
    }, async (service) => {
      await assertAttributionEnabled(service)
      const { data, error } = await service.rpc('bind_event_promoter_promo_code', {
        p_actor_id: input.actorUserId,
        p_membership_id: input.membershipId,
        p_promo_code_id: input.promoCodeId,
      })
      if (error) throw error
      const binding = firstRow(data as any)
      if (!binding) throw new PromoterAssetCommandError('promo_code_binding_failed', 'Unable to associate the promo code.', 503)
      return binding
    })
  } catch (error) {
    if (error instanceof PromoterAssetCommandError) throw error
    if (error instanceof ServiceRoleJobError)
      throw new PromoterAssetCommandError(error.code, error.message, 403)
    const databaseError = error as { code?: string; message?: string }
    const status = databaseError.code === 'P0002' ? 404 : databaseError.code === '42501' ? 403 : 422
    throw new PromoterAssetCommandError(databaseError.code || 'promo_code_binding_failed', databaseError.message || 'Unable to associate the promo code.', status)
  }
}

async function findActiveMembershipForEvent(input: { actorUserId: string; eventId: string }) {
  const orgId = await resolveServiceRoleJobOrgId({
    moduleId: 'promoter.assets',
    reason: 'Resolve promoter social event scope',
    lookup: async (service) => {
      const { data } = await service.from('events_v2').select('org_id').eq('id', input.eventId).maybeSingle()
      return data?.org_id || null
    },
  })
  if (!orgId) return null

  return executeServiceRoleJob({
    orgId,
    reason: 'Find approved promoter membership for native post',
    moduleId: 'promoter.assets',
    target: { eventId: input.eventId },
  }, async (service) => {
    await assertAttributionEnabled(service)
    const { data } = await service
      .from('event_promoter_memberships')
      .select('id, event_promotion_programs!inner(event_id, status, allow_native_post_attribution)')
      .eq('user_id', input.actorUserId)
      .eq('status', 'approved')
      .eq('event_promotion_programs.event_id', input.eventId)
      .eq('event_promotion_programs.status', 'open')
      .eq('event_promotion_programs.allow_native_post_attribution', true)
      .maybeSingle()
    return data?.id ? { orgId, membershipId: data.id } : null
  })
}

export async function createPromoterNativePostContext(input: {
  actorUserId: string
  eventId: string
  sourceId: string
  destinationPath: string
}) {
  try {
    const membership = await findActiveMembershipForEvent(input)
    if (!membership) return null
    const scope: MembershipScope = { orgId: membership.orgId, eventId: input.eventId, membershipId: membership.membershipId }
    const link = await createTrackingLinkInScope({
      actorUserId: input.actorUserId,
      scope,
      label: 'Tourify promoter post',
      destinationPath: input.destinationPath,
      channel: 'native_post',
    })
    const source = await executeServiceRoleJob({
      orgId: scope.orgId,
      reason: 'Bind approved promoter native post source',
      moduleId: 'promoter.assets',
      target: { eventId: input.eventId },
    }, async (service) => {
      const { data, error } = await service.rpc('bind_event_promoter_social_source', {
        p_actor_id: input.actorUserId,
        p_membership_id: scope.membershipId,
        p_source_type: 'tourify_post',
        p_source_id: input.sourceId,
        p_originating_source_id: null,
        p_tracking_link_id: link.id,
      })
      if (error) throw error
      return firstRow(data as any)
    })
    return { membershipId: scope.membershipId, link, source }
  } catch (error) {
    // Native posts remain publishable if attribution is unavailable; this avoids
    // making the established post composer a new dependency on the rollout.
    console.warn('[promoter assets] native post attribution unavailable', error)
    return null
  }
}

export async function recordPromoterNativeShare(input: {
  actorUserId: string
  postId: string
  shareId: string
}) {
  try {
    const orgId = await resolveServiceRoleJobOrgId({
      moduleId: 'promoter.assets',
      reason: 'Resolve originating promoter post scope',
      lookup: async (service) => {
        const { data } = await service
          .from('promoter_social_sources')
          .select('event_id, events_v2:event_id(org_id)')
          .eq('source_type', 'tourify_post')
          .eq('source_id', input.postId)
          .eq('created_by', input.actorUserId)
          .maybeSingle()
        return (data as any)?.events_v2?.org_id || null
      },
    })
    if (!orgId) return null
    return await executeServiceRoleJob({
      orgId,
      reason: 'Preserve promoter attribution for native share',
      moduleId: 'promoter.assets',
    }, async (service) => {
      const { data: origin } = await service
        .from('promoter_social_sources')
        .select('membership_id, event_id, source_id')
        .eq('source_type', 'tourify_post')
        .eq('source_id', input.postId)
        .eq('created_by', input.actorUserId)
        .maybeSingle()
      if (!origin) return null
      const { data, error } = await service.rpc('bind_event_promoter_social_source', {
        p_actor_id: input.actorUserId,
        p_membership_id: origin.membership_id,
        p_source_type: 'tourify_share',
        p_source_id: input.shareId,
        p_originating_source_id: origin.source_id,
        p_tracking_link_id: null,
      })
      if (error) throw error
      return firstRow(data as any)
    })
  } catch (error) {
    console.warn('[promoter assets] native share attribution unavailable', error)
    return null
  }
}

export async function resolvePromoterTrackingLink(input: {
  tokenHash: string
  anonymousSessionId?: string | null
  buyerUserId?: string | null
  ipHash?: string | null
}) {
  const orgId = await resolveServiceRoleJobOrgId({
    moduleId: 'promoter.assets',
    reason: 'Resolve public promoter tracking link scope',
    lookup: async (service) => {
      const { data: link } = await service
        .from('promoter_tracking_links')
        .select('event_id')
        .eq('token_hash', input.tokenHash)
        .maybeSingle()
      if (!link?.event_id) return null
      const { data: event } = await service.from('events_v2').select('org_id').eq('id', link.event_id).maybeSingle()
      return event?.org_id || null
    },
  })
  if (!orgId) return null
  return executeServiceRoleJob({
    orgId,
    reason: 'Resolve public promoter tracking link',
    moduleId: 'promoter.assets',
  }, async (service) => {
    const flags = await resolveEventPromoterFlags(service)
    if (!flags.event_promoter_attribution_capture_enabled) return null
    const { data, error } = await service.rpc('resolve_event_promoter_tracking_link', {
      p_token_hash: input.tokenHash,
      p_anonymous_session_id: input.anonymousSessionId || null,
      p_buyer_user_id: input.buyerUserId || null,
      p_ip_hash: input.ipHash || null,
    })
    if (error) throw error
    return firstRow(data as any)
  })
}

export function defaultPromoterDestinationPath(eventId: string) {
  return `/tickets/purchase?event_id=${encodeURIComponent(eventId)}`
}
