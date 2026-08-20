import 'server-only'

import { executeServiceRoleJob } from '@/lib/supabase/service-role-job'

export class PromoterInvestigationError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message)
    this.name = 'PromoterInvestigationError'
  }
}

function throwQueryError(error: { message?: string; code?: string } | null, fallback: string): never {
  throw new PromoterInvestigationError(error?.message || fallback, error?.code || 'investigation_query_failed', 503)
}

export async function getEventPromoterInvestigation(input: {
  orgId: string
  eventId: string
  membershipId?: string | null
  limit: number
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: 'view event promoter investigation',
    moduleId: 'admin.event-promoter.investigation',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data: programs, error: programError } = await service
      .from('event_promotion_programs')
      .select('id, event_id, status, commission_type, commission_rate_bps, commission_fixed_amount_minor, currency')
      .eq('event_id', input.eventId)
    if (programError) throwQueryError(programError, 'Unable to load promoter programs.')
    const programIds = (programs || []).map((program: any) => program.id)
    if (!programIds.length) {
      return { programs: [], riskFlags: [], ledgerEntries: [], readiness: null }
    }

    let risks = service
      .from('promoter_risk_flags')
      .select('id, program_id, membership_id, attribution_id, user_id, risk_type, severity, status, details, reviewed_by, reviewed_at, created_at, updated_at, promoter_risk_flag_events(id, action, actor_id, reason, metadata, created_at)')
      .in('program_id', programIds)
      .order('created_at', { ascending: false })
      .limit(input.limit)
    let ledger = service
      .from('promoter_commission_ledger')
      .select('id, membership_id, program_id, attribution_id, entry_type, amount_minor, currency, eligible_revenue_minor, originating_entry_id, reason, occurred_at, promoter_payout_allocations(id, payout_batch_id, amount_minor, currency, status, created_at, paid_at), ticket_sale_attributions(id, event_id, source_type, source_id, attribution_rule, attributed_at)')
      .in('program_id', programIds)
      .order('occurred_at', { ascending: false })
      .limit(input.limit)
    if (input.membershipId) {
      risks = risks.eq('membership_id', input.membershipId)
      ledger = ledger.eq('membership_id', input.membershipId)
    }

    const [riskResult, ledgerResult, readinessResult] = await Promise.all([
      risks,
      ledger,
      service.rpc('get_event_promoter_rollout_readiness', { p_event_id: input.eventId }),
    ])
    if (riskResult.error) throwQueryError(riskResult.error, 'Unable to load promoter risk flags.')
    if (ledgerResult.error) throwQueryError(ledgerResult.error, 'Unable to load promoter commission lineage.')
    if (readinessResult.error) throwQueryError(readinessResult.error, 'Unable to load promoter rollout readiness.')

    return {
      programs: programs || [],
      riskFlags: riskResult.data || [],
      ledgerEntries: ledgerResult.data || [],
      readiness: readinessResult.data || null,
    }
  })
}

export async function createEventPromoterRiskFlag(input: {
  orgId: string
  eventId: string
  programId: string
  actorId: string
  membershipId?: string | null
  attributionId?: string | null
  userId?: string | null
  riskType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reason: string
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: 'create event promoter risk flag',
    moduleId: 'admin.event-promoter.investigation',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data, error } = await service.rpc('create_event_promoter_risk_flag', {
      p_event_id: input.eventId,
      p_program_id: input.programId,
      p_membership_id: input.membershipId || null,
      p_attribution_id: input.attributionId || null,
      p_user_id: input.userId || null,
      p_risk_type: input.riskType,
      p_severity: input.severity,
      p_actor_id: input.actorId,
      p_reason: input.reason,
      p_details: {},
    })
    if (error) throwQueryError(error, 'Unable to create promoter risk flag.')
    return { riskFlagId: data as string }
  })
}

export async function transitionEventPromoterRiskFlag(input: {
  orgId: string
  eventId: string
  riskFlagId: string
  actorId: string
  action: 'reviewing' | 'resolved' | 'dismissed' | 'severity_changed'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  reason: string
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: `transition event promoter risk flag ${input.action}`,
    moduleId: 'admin.event-promoter.investigation',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data: flag, error: flagError } = await service
      .from('promoter_risk_flags')
      .select('id, event_promotion_programs!inner(event_id)')
      .eq('id', input.riskFlagId)
      .maybeSingle()
    const program = Array.isArray((flag as any)?.event_promotion_programs)
      ? (flag as any).event_promotion_programs[0]
      : (flag as any)?.event_promotion_programs
    if (flagError || !flag || program?.event_id !== input.eventId)
      throw new PromoterInvestigationError('Risk flag was not found for this event.', 'risk_flag_not_found', 404)

    const { data, error } = await service.rpc('transition_event_promoter_risk_flag', {
      p_risk_flag_id: input.riskFlagId,
      p_actor_id: input.actorId,
      p_action: input.action,
      p_reason: input.reason,
      p_severity: input.severity || null,
    })
    if (error) throwQueryError(error, 'Unable to update promoter risk flag.')
    return data as Record<string, unknown>
  })
}
