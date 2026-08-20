import "server-only"

import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
  ServiceRoleJobError,
} from '@/lib/supabase/service-role-job'

export type PromoterCheckoutShadowAttribution = {
  id: string
  order_id: string
  decision: 'attributed' | 'none'
  decision_reason: string
  program_id: string | null
  membership_id: string | null
  source_type: 'promo_code' | 'tracking_link' | 'tourify_post' | 'tourify_share' | null
  source_id: string | null
  touchpoint_id: string | null
  resolved_at: string
}

export class PromoterCheckoutAttributionError extends Error {
  constructor(readonly code: string, message: string, readonly status = 422) {
    super(message)
    this.name = 'PromoterCheckoutAttributionError'
  }
}

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] || null : data
}

export async function resolvePromoterCheckoutShadowAttribution(input: {
  orderId: string
  anonymousSessionId?: string | null
}): Promise<PromoterCheckoutShadowAttribution | null> {
  try {
    const orgId = await resolveServiceRoleJobOrgId({
      moduleId: 'promoter.assets',
      reason: 'Resolve ticket order scope for promoter attribution',
      lookup: async (service) => {
        const { data: sale } = await service
          .from('ticket_sales')
          .select('event_id, events_v2:event_id(org_id)')
          .eq('id', input.orderId)
          .maybeSingle()
        return (sale as any)?.events_v2?.org_id || null
      },
    })
    if (!orgId) return null

    return await executeServiceRoleJob({
      orgId,
      reason: 'Resolve promoter checkout attribution in shadow mode',
      moduleId: 'promoter.assets',
      target: { saleId: input.orderId },
    }, async (service) => {
      const flags = await resolveEventPromoterFlags(service)
      if (!flags.event_promoter_attribution_capture_enabled || !flags.event_promoter_shadow_commissions_enabled)
        return null

      const { data, error } = await service.rpc('resolve_event_promoter_checkout_shadow_attribution', {
        p_order_id: input.orderId,
        p_anonymous_session_id: input.anonymousSessionId || null,
      })
      if (error) throw error
      return firstRow(data as PromoterCheckoutShadowAttribution | PromoterCheckoutShadowAttribution[] | null)
    })
  } catch (error) {
    if (error instanceof PromoterCheckoutAttributionError) throw error
    if (error instanceof ServiceRoleJobError)
      throw new PromoterCheckoutAttributionError(error.code, error.message, 403)
    const databaseError = error as { code?: string; message?: string }
    const status = databaseError.code === 'P0002' ? 404 : databaseError.code === '42501' ? 403 : 503
    throw new PromoterCheckoutAttributionError(
      databaseError.code || 'shadow_attribution_unavailable',
      databaseError.message || 'Checkout attribution is temporarily unavailable.',
      status,
    )
  }
}

export function readPromoterAttributionSession(cookieValue: string | undefined) {
  return cookieValue && /^[A-Za-z0-9_-]{16,128}$/.test(cookieValue) ? cookieValue : null
}
