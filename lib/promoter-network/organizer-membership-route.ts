import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { assertOrgEntityReferences, OrgEntityAccessError } from '@/lib/admin/org-entity-access'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { jsonError, readJson } from '@/lib/api/route-helpers'
import { executeServiceRoleJob, ServiceRoleJobError } from '@/lib/supabase/service-role-job'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { runPromoterMembershipCommand, PromoterMembershipCommandError } from '@/lib/promoter-network/membership-command'
import { promoterInvitationSchema, promoterReviewSchema, type PromoterMembershipAction } from '@/lib/promoter-network/membership-schemas'

function segmentAfter(request: NextRequest, segment: string) {
  const pieces = new URL(request.url).pathname.split('/').filter(Boolean)
  return pieces[pieces.lastIndexOf(segment) + 1]
}

function eventId(request: NextRequest) {
  return z.string().uuid().parse(segmentAfter(request, 'events'))
}

function routeEntityId(request: NextRequest, segment: string) {
  return z.string().uuid().parse(segmentAfter(request, segment))
}

function organizerError(error: unknown) {
  if (error instanceof z.ZodError) return jsonError({ status: 400, code: 'invalid_route', message: 'A valid event and promoter record id are required.' })
  if (error instanceof OrgEntityAccessError) return jsonError({ status: error.status, code: error.code, message: error.message })
  if (error instanceof PromoterMembershipCommandError) return jsonError({ status: error.status, code: error.code, message: error.message })
  if (error instanceof ServiceRoleJobError) return jsonError({ status: 403, code: error.code, message: error.message })
  console.error('[event-promoter organizer membership] failed', error)
  return jsonError({ status: 503, code: 'membership_unavailable', message: 'Promoter membership controls are temporarily unavailable.', retryable: true })
}

async function assertOrganizerCanManage(args: { supabase: any; userId: string; orgId: string; eventId: string }) {
  await assertOrgEntityReferences(args.supabase, args.orgId, { eventId: args.eventId })
  const allowed = await hasTicketingPermission({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    permission: 'manage_ticket_types',
  })
  if (!allowed) throw new PromoterMembershipCommandError('event_permission_denied', 'You do not have permission to manage this event promoter program.', 403)
}

async function loadProgramId(service: any, eventIdValue: string) {
  const { data, error } = await service
    .from('event_promotion_programs')
    .select('id')
    .eq('event_id', eventIdValue)
    .maybeSingle()
  if (error || !data) throw new PromoterMembershipCommandError('program_not_found', 'Promoter program not found.', 404)
  return data.id as string
}

export function organizerApplicationsListRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    try {
      const eventIdValue = eventId(request)
      await assertOrganizerCanManage({ supabase, userId: user.id, orgId: admin.orgId, eventId: eventIdValue })
      return executeServiceRoleJob({
        orgId: admin.orgId,
        reason: 'List event promoter applications',
        moduleId: 'admin.event-promoter.program',
        target: { eventId: eventIdValue },
      }, async (service) => {
        const flags = await resolveEventPromoterFlags(service)
        if (!flags.event_promoter_applications_enabled) return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter applications are not enabled.' })
        const programId = await loadProgramId(service, eventIdValue)
        const { data, error } = await service
          .from('event_promoter_applications')
          .select('id, user_id, source, status, application_message, review_note, reviewed_by, reviewed_at, created_at, updated_at')
          .eq('program_id', programId)
          .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ data: data || [] })
      })
    } catch (error) {
      return organizerError(error)
    }
  })
}

export function organizerPromotersListRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    try {
      const eventIdValue = eventId(request)
      await assertOrganizerCanManage({ supabase, userId: user.id, orgId: admin.orgId, eventId: eventIdValue })
      return executeServiceRoleJob({
        orgId: admin.orgId,
        reason: 'List event promoters',
        moduleId: 'admin.event-promoter.program',
        target: { eventId: eventIdValue },
      }, async (service) => {
        const flags = await resolveEventPromoterFlags(service)
        if (!flags.event_promoter_applications_enabled) return jsonError({ status: 404, code: 'feature_disabled', message: 'Promoter applications are not enabled.' })
        const programId = await loadProgramId(service, eventIdValue)
        const { data, error } = await service
          .from('event_promoter_memberships')
          .select('id, user_id, application_id, status, approved_at, approved_by, suspended_at, revoked_at, created_at, updated_at')
          .eq('program_id', programId)
          .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ data: data || [] })
      })
    } catch (error) {
      return organizerError(error)
    }
  })
}

export function organizerInvitationRoute() {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    const body = await readJson(request, promoterInvitationSchema, 'invalid_invitation', 'Invalid promoter invitation.')
    if (!body.success) return body.response
    try {
      const eventIdValue = eventId(request)
      await assertOrganizerCanManage({ supabase, userId: user.id, orgId: admin.orgId, eventId: eventIdValue })
      const programId = await executeServiceRoleJob({
        orgId: admin.orgId,
        reason: 'Resolve event promoter program for invitation',
        moduleId: 'admin.event-promoter.program',
        target: { eventId: eventIdValue },
      }, (service) => loadProgramId(service, eventIdValue))
      const data = await runPromoterMembershipCommand({
        actorUserId: user.id,
        action: 'invite',
        programId,
        targetUserId: body.data.user_id,
        note: body.data.message || null,
        expectedEventId: eventIdValue,
      })
      return NextResponse.json({ data })
    } catch (error) {
      return organizerError(error)
    }
  })
}

export function organizerApplicationActionRoute(action: 'approve' | 'reject') {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    const body = await readJson(request, promoterReviewSchema, 'invalid_review', 'Invalid application review.')
    if (!body.success) return body.response
    try {
      const eventIdValue = eventId(request)
      const applicationId = routeEntityId(request, 'promoter-applications')
      await assertOrganizerCanManage({ supabase, userId: user.id, orgId: admin.orgId, eventId: eventIdValue })
      const programId = await executeServiceRoleJob({
        orgId: admin.orgId,
        reason: 'Resolve event promoter program for application review',
        moduleId: 'admin.event-promoter.program',
        target: { eventId: eventIdValue },
      }, (service) => loadProgramId(service, eventIdValue))
      const data = await runPromoterMembershipCommand({
        actorUserId: user.id,
        action,
        programId,
        applicationId,
        note: body.data.review_note || null,
        expectedEventId: eventIdValue,
      })
      return NextResponse.json({ data })
    } catch (error) {
      return organizerError(error)
    }
  })
}

export function organizerMembershipActionRoute(action: Extract<PromoterMembershipAction, 'suspend' | 'revoke'>) {
  return withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
    try {
      const eventIdValue = eventId(request)
      const membershipId = routeEntityId(request, 'promoters')
      await assertOrganizerCanManage({ supabase, userId: user.id, orgId: admin.orgId, eventId: eventIdValue })
      const lookup = await executeServiceRoleJob({
        orgId: admin.orgId,
        reason: 'Resolve event promoter membership action',
        moduleId: 'admin.event-promoter.program',
        target: { eventId: eventIdValue },
      }, async (service) => {
        const programId = await loadProgramId(service, eventIdValue)
        const { data } = await service
          .from('event_promoter_memberships')
          .select('id, user_id')
          .eq('id', membershipId)
          .eq('program_id', programId)
          .maybeSingle()
        if (!data) throw new PromoterMembershipCommandError('membership_not_found', 'Promoter membership not found.', 404)
        return { programId, targetUserId: data.user_id as string }
      })
      const data = await runPromoterMembershipCommand({
        actorUserId: user.id,
        action,
        programId: lookup.programId,
        membershipId,
        targetUserId: lookup.targetUserId,
        expectedEventId: eventIdValue,
      })
      return NextResponse.json({ data })
    } catch (error) {
      return organizerError(error)
    }
  })
}
