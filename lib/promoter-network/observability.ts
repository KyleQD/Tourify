import 'server-only'

import * as Sentry from '@sentry/nextjs'

import { executeServiceRoleJob } from '@/lib/supabase/service-role-job'

const RESTRICTED_METADATA_KEYS = new Set([
  'buyer_id',
  'payment_reference',
  'tracking_token',
  'ip_address',
  'user_agent',
])

export type PromoterOperationalEventType =
  | 'tracking_redirect'
  | 'attribution_resolved'
  | 'attribution_unmatched'
  | 'commission_finalized'
  | 'commission_reversed'
  | 'commission_finalization_failed'
  | 'payout_allocated'
  | 'payout_submitted'
  | 'payout_paid'
  | 'payout_failed'
  | 'payout_retried'
  | 'payout_cancelled'
  | 'commission_hold_updated'
  | 'authorization_denied'
  | 'reconciliation_mismatch'
  | 'investigation_read'
  | 'risk_flag_updated'

export type PromoterOperationalOutcome = 'success' | 'skipped' | 'failed' | 'denied'

function safeMetadata(metadata: Record<string, unknown> | undefined) {
  return Object.fromEntries(Object.entries(metadata || {}).filter(([key]) => !RESTRICTED_METADATA_KEYS.has(key)))
}

/** Non-blocking privacy-minimized telemetry for server-authoritative operations. */
export async function recordPromoterOperationalEvent(input: {
  orgId: string
  eventId: string
  eventType: PromoterOperationalEventType
  outcome: PromoterOperationalOutcome
  durationMs?: number
  correlationId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await executeServiceRoleJob({
      orgId: input.orgId,
      reason: `record promoter operational event ${input.eventType}`,
      moduleId: 'promoter.observability',
      target: { eventId: input.eventId },
    }, async (service) => {
      const { error } = await service.from('promoter_network_operational_events').insert({
        org_id: input.orgId,
        event_id: input.eventId,
        event_type: input.eventType,
        outcome: input.outcome,
        duration_ms: input.durationMs ?? null,
        correlation_id: input.correlationId || null,
        metadata: safeMetadata(input.metadata),
      })
      if (error) throw error
    })
  } catch (error) {
    Sentry.captureException(error, { tags: { domain: 'event-promoter', operation: 'operational-telemetry' } })
    console.warn('[event-promoter] operational telemetry skipped', input.eventType, error)
  }
}
