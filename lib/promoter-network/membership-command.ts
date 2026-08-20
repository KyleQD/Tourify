import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
  ServiceRoleJobError,
} from '@/lib/supabase/service-role-job'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import type { PromoterMembershipAction } from '@/lib/promoter-network/membership-schemas'
import { sendPromoterLifecycleNotification } from '@/lib/promoter-network/notifications'

export class PromoterMembershipCommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422,
  ) {
    super(message)
    this.name = 'PromoterMembershipCommandError'
  }
}

async function resolveProgramOrgId(programId: string) {
  const orgId = await resolveServiceRoleJobOrgId({
    moduleId: 'promoter.membership',
    reason: 'Resolve promoter membership program scope',
    lookup: async (service) => {
      const { data } = await service
        .from('event_promotion_programs')
        .select('event_id, events_v2:event_id(org_id)')
        .eq('id', programId)
        .maybeSingle()
      return (data as any)?.events_v2?.org_id || null
    },
  })
  if (!orgId) throw new PromoterMembershipCommandError('program_not_found', 'Promoter program not found.', 404)
  return orgId
}

export async function runPromoterMembershipCommand(input: {
  actorUserId: string
  action: PromoterMembershipAction
  programId: string
  targetUserId?: string | null
  applicationId?: string | null
  membershipId?: string | null
  note?: string | null
  expectedEventId?: string | null
}) {
  const orgId = await resolveProgramOrgId(input.programId)
  try {
    return await executeServiceRoleJob({
      orgId,
      reason: `Promoter membership action: ${input.action}`,
      moduleId: 'promoter.membership',
      target: input.expectedEventId ? { eventId: input.expectedEventId } : undefined,
    }, async (service) => {
      const flags = await resolveEventPromoterFlags(service)
      if (!flags.event_promoter_applications_enabled) {
        throw new PromoterMembershipCommandError('feature_disabled', 'Promoter applications are not enabled.', 404)
      }

      const { data: program, error: programError } = await service
        .from('event_promotion_programs')
        .select('id, event_id, events_v2:event_id(title, created_by)')
        .eq('id', input.programId)
        .maybeSingle()
      if (programError || !program) throw new PromoterMembershipCommandError('program_not_found', 'Promoter program not found.', 404)
      if (input.expectedEventId && program.event_id !== input.expectedEventId) {
        throw new PromoterMembershipCommandError('program_event_mismatch', 'Promoter program does not belong to this event.', 404)
      }

      const { data, error } = await service.rpc('transition_event_promoter_membership', {
        p_actor_id: input.actorUserId,
        p_action: input.action,
        p_program_id: input.programId,
        p_target_user_id: input.targetUserId || null,
        p_application_id: input.applicationId || input.membershipId || null,
        p_note: input.note || null,
      })
      if (error) {
        const status = error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : 422
        throw new PromoterMembershipCommandError(error.code || 'membership_rejected', error.message, status)
      }

      const result = data as {
        application_id?: string | null
        membership_id?: string | null
        target_user_id?: string | null
        organizer_user_id?: string | null
      }
      const notifyUserId = ['apply', 'accept_invitation'].includes(input.action)
        ? (program as any).events_v2?.created_by || result.organizer_user_id
        : result.target_user_id
      void sendPromoterLifecycleNotification({
        userId: notifyUserId,
        eventId: program.event_id,
        programId: input.programId,
        applicationId: result.application_id,
        membershipId: result.membership_id,
        action: input.action,
        eventTitle: (program as any).events_v2?.title,
      })
      return { ...result, eventId: program.event_id }
    })
  } catch (error) {
    if (error instanceof PromoterMembershipCommandError) throw error
    if (error instanceof ServiceRoleJobError) {
      throw new PromoterMembershipCommandError(error.code, error.message, 403)
    }
    throw error
  }
}
