import 'server-only'

import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
  ServiceRoleJobError,
} from '@/lib/supabase/service-role-job'

export type PromoterCommissionFinalization = {
  attribution_id: string | null
  ledger_entry_id: string | null
  finalized: boolean
  reason: string
}

export type PromoterCommissionReversal = {
  ledger_entry_id: string | null
  reversed_amount_minor: number
  reason: string
}

export type PromoterCommissionReinstatement = {
  ledger_entry_id: string | null
  reinstated_amount_minor: number
  reason: string
}

export class PromoterCommissionError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] || null : data
}

async function resolveOrderOrgId(orderId: string): Promise<string | null> {
  return resolveServiceRoleJobOrgId({
    moduleId: 'ticketing.webhook',
    reason: 'Resolve paid ticket order scope for promoter commission processing',
    lookup: async (service) => {
      const { data: sale } = await service
        .from('ticket_sales')
        .select('event_id, events_v2:event_id(org_id)')
        .eq('id', orderId)
        .maybeSingle()
      return (sale as any)?.events_v2?.org_id || null
    },
  })
}

async function runPayableCommissionJob<T>(params: {
  orderId: string
  reason: string
  run: (service: any) => Promise<T>
}): Promise<T | null> {
  try {
    const orgId = await resolveOrderOrgId(params.orderId)
    if (!orgId) return null

    return await executeServiceRoleJob({
      orgId,
      reason: params.reason,
      moduleId: 'ticketing.webhook',
      target: { saleId: params.orderId },
    }, async (service) => {
      const flags = await resolveEventPromoterFlags(service)
      if (!flags.event_promoter_payable_commissions_enabled) return null
      return params.run(service)
    })
  } catch (error) {
    if (error instanceof ServiceRoleJobError)
      throw new PromoterCommissionError(error.code, error.message)
    const databaseError = error as { code?: string; message?: string }
    throw new PromoterCommissionError(
      databaseError.code || 'commission_processing_unavailable',
      databaseError.message || 'Promoter commission processing is temporarily unavailable.',
    )
  }
}

export async function finalizePromoterCommission(input: {
  orderId: string
  paymentReference?: string | null
}): Promise<PromoterCommissionFinalization | null> {
  return runPayableCommissionJob({
    orderId: input.orderId,
    reason: 'Finalize promoter commission after verified ticket payment',
    run: async (service) => {
      const { data, error } = await service.rpc('finalize_event_promoter_commission', {
        p_order_id: input.orderId,
        p_payment_reference: input.paymentReference || null,
      })
      if (error) throw error
      return firstRow(data as PromoterCommissionFinalization | PromoterCommissionFinalization[] | null)
    },
  })
}

export async function reversePromoterCommission(input: {
  orderId: string
  reversalType: 'refund_reversal' | 'chargeback_reversal'
  cumulativeRefundMinor: number
  paymentReference?: string | null
}): Promise<PromoterCommissionReversal | null> {
  if (!Number.isSafeInteger(input.cumulativeRefundMinor) || input.cumulativeRefundMinor <= 0)
    throw new PromoterCommissionError('invalid_refund_amount', 'A positive integer refund amount in minor units is required.')

  return runPayableCommissionJob({
    orderId: input.orderId,
    reason: 'Append promoter commission reversal after verified payment reversal',
    run: async (service) => {
      const { data, error } = await service.rpc('reverse_event_promoter_commission', {
        p_order_id: input.orderId,
        p_reversal_type: input.reversalType,
        p_cumulative_refund_minor: input.cumulativeRefundMinor,
        p_payment_reference: input.paymentReference || null,
      })
      if (error) throw error
      return firstRow(data as PromoterCommissionReversal | PromoterCommissionReversal[] | null)
    },
  })
}

export async function reinstatePromoterCommission(input: {
  orderId: string
  disputeReference: string
}): Promise<PromoterCommissionReinstatement | null> {
  return runPayableCommissionJob({
    orderId: input.orderId,
    reason: 'Reinstate promoter commission after verified dispute recovery',
    run: async (service) => {
      const { data, error } = await service.rpc('reinstate_event_promoter_commission', {
        p_order_id: input.orderId,
        p_dispute_reference: input.disputeReference,
      })
      if (error) throw error
      return firstRow(data as PromoterCommissionReinstatement | PromoterCommissionReinstatement[] | null)
    },
  })
}
