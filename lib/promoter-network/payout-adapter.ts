import 'server-only'

import { executeServiceRoleJob } from '@/lib/supabase/service-role-job'

export type PromoterPayoutAction = 'submit' | 'confirm' | 'fail' | 'retry' | 'cancel'

export class PromoterPayoutAdapterError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message)
    this.name = 'PromoterPayoutAdapterError'
  }
}

/**
 * The live Connect representation is a generic profile account id, with no
 * promoter KYC/readiness contract. Keep this explicit so no caller can mistake
 * a stored identifier for authorization to move money.
 */
export function getPromoterPayoutExecutionPolicy() {
  return {
    provider: 'manual_review' as const,
    automaticTransfersEnabled: false,
    blockers: ['promoter_kyc_and_connect_readiness_not_proven'],
  }
}

function rpcError(error: { message?: string; code?: string } | null, fallback: string): never {
  throw new PromoterPayoutAdapterError(error?.message || fallback, error?.code || 'payout_command_failed', 400)
}

export async function createEventPromoterPayoutBatch(input: {
  orgId: string
  eventId: string
  actorId: string
  currency: string
  idempotencyKey: string
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: 'allocate event promoter payout batch',
    moduleId: 'admin.event-promoter.payout',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data, error } = await service.rpc('create_event_promoter_payout_batch', {
      p_event_id: input.eventId,
      p_actor_id: input.actorId,
      p_currency: input.currency,
      p_hold_days: 7,
      p_idempotency_key: input.idempotencyKey,
    })
    if (error) rpcError(error, 'Unable to allocate promoter payout entries.')
    return data as Record<string, unknown>
  })
}

export async function transitionEventPromoterPayoutBatch(input: {
  orgId: string
  eventId: string
  payoutBatchId: string
  actorId: string
  action: PromoterPayoutAction
  settlementReference?: string | null
  reason?: string | null
  providerReference?: string | null
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: `event promoter payout ${input.action}`,
    moduleId: 'admin.event-promoter.payout',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data: batch, error: batchError } = await service
      .from('promoter_payout_batches')
      .select('id, event_id')
      .eq('id', input.payoutBatchId)
      .maybeSingle()
    if (batchError || !batch || batch.event_id !== input.eventId)
      throw new PromoterPayoutAdapterError('Payout batch was not found for this event.', 'payout_batch_not_found', 404)

    const { data, error } = await service.rpc('transition_event_promoter_payout_batch', {
      p_payout_batch_id: input.payoutBatchId,
      p_actor_id: input.actorId,
      p_action: input.action,
      p_settlement_reference: input.settlementReference || null,
      p_reason: input.reason || null,
      p_provider_reference: input.providerReference || null,
    })
    if (error) rpcError(error, 'Unable to update promoter payout batch.')
    return data as Record<string, unknown>
  })
}

export async function setEventPromoterCommissionHold(input: {
  orgId: string
  eventId: string
  commissionLedgerId: string
  actorId: string
  action: 'hold' | 'release'
  reason: string
}) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: `event promoter commission ${input.action}`,
    moduleId: 'admin.event-promoter.payout',
    target: { eventId: input.eventId },
  }, async (service) => {
    const { data: ledger, error: ledgerError } = await service
      .from('promoter_commission_ledger')
      .select('id, event_promotion_programs!inner(event_id)')
      .eq('id', input.commissionLedgerId)
      .maybeSingle()
    const program = Array.isArray((ledger as any)?.event_promotion_programs)
      ? (ledger as any).event_promotion_programs[0]
      : (ledger as any)?.event_promotion_programs
    if (ledgerError || !ledger || program?.event_id !== input.eventId)
      throw new PromoterPayoutAdapterError('Commission entry was not found for this event.', 'commission_not_found', 404)

    const { data, error } = await service.rpc('set_event_promoter_commission_hold', {
      p_commission_ledger_id: input.commissionLedgerId,
      p_actor_id: input.actorId,
      p_action: input.action,
      p_reason: input.reason,
    })
    if (error) rpcError(error, 'Unable to update promoter commission hold.')
    return data as Record<string, unknown>
  })
}

export async function getEventPromoterPayoutAudit(input: { orgId: string; eventId: string }) {
  return executeServiceRoleJob({
    orgId: input.orgId,
    reason: 'view event promoter payout audit',
    moduleId: 'admin.event-promoter.payout',
    target: { eventId: input.eventId },
  }, async (service) => {
    const [batches, reconciliation] = await Promise.all([
      service
        .from('promoter_payout_batches')
        .select('id, event_id, provider, currency, status, total_minor, allocation_count, settlement_reference, provider_reference, failure_reason, created_by, submitted_by, paid_by, created_at, submitted_at, paid_at, updated_at, promoter_payout_batch_events(id, event_type, actor_id, reason, metadata, created_at), promoter_payout_allocations(id, membership_id, commission_ledger_id, amount_minor, currency, status, settlement_reference, provider_reference, failure_reason, created_at, paid_at)')
        .eq('event_id', input.eventId)
        .order('created_at', { ascending: false }),
      service.rpc('get_event_promoter_payout_reconciliation', { p_event_id: input.eventId }),
    ])
    if (batches.error) rpcError(batches.error, 'Unable to load promoter payout batches.')
    if (reconciliation.error) rpcError(reconciliation.error, 'Unable to load promoter payout reconciliation.')
    return {
      executionPolicy: getPromoterPayoutExecutionPolicy(),
      batches: batches.data || [],
      reconciliation: reconciliation.data || [],
    }
  })
}
