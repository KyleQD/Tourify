import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertMembershipTransition,
  assertProgramTransition,
  assertApplicationTransition,
  canTransitionApplication,
  canTransitionMembership,
  canTransitionProgram,
  createCommissionIdempotencyKey,
} from '@/lib/promoter-network/domain'
import {
  hasPromoterFinancialTermsChanged,
  promoterProgramSettingsSchema,
} from '@/lib/promoter-network/program-settings'
import {
  createOpaqueTrackingToken,
  hashTrackingToken,
  isSafePromoterDestinationPath,
} from '@/lib/promoter-network/tracking'
import { getAdminFeatureFlagDefinition, validateAdminFeatureFlagRegistry } from '@/lib/admin/feature-flags/registry'

describe('Promoter Network domain foundation', () => {
  it('enforces the campaign lifecycle', () => {
    expect(canTransitionProgram('draft', 'open')).toBe(true)
    expect(canTransitionProgram('open', 'paused')).toBe(true)
    expect(canTransitionProgram('closed', 'open')).toBe(false)
    expect(() => assertProgramTransition('cancelled', 'open')).toThrow('Invalid promoter program transition')
  })

  it('enforces the membership lifecycle', () => {
    expect(canTransitionMembership('approved', 'suspended')).toBe(true)
    expect(canTransitionMembership('suspended', 'approved')).toBe(true)
    expect(canTransitionMembership('revoked', 'approved')).toBe(false)
    expect(() => assertMembershipTransition('completed', 'approved')).toThrow('Invalid promoter membership transition')
  })

  it('enforces the application and invitation lifecycle', () => {
    expect(canTransitionApplication('applied', 'approved')).toBe(true)
    expect(canTransitionApplication('invited', 'approved')).toBe(true)
    expect(canTransitionApplication('rejected', 'applied')).toBe(false)
    expect(() => assertApplicationTransition('approved', 'rejected')).toThrow('Invalid promoter application transition')
  })

  it('uses a deterministic financial idempotency key', () => {
    const input = {
      paymentOrSaleId: 'sale-1',
      ticketOrLineItemId: 'line-1',
      membershipId: 'member-1',
      entryType: 'earned' as const,
    }
    expect(createCommissionIdempotencyKey(input)).toBe(createCommissionIdempotencyKey(input))
    expect(createCommissionIdempotencyKey(input)).not.toBe(createCommissionIdempotencyKey({ ...input, entryType: 'refund_reversal' }))
  })

  it('creates high-entropy opaque tracking tokens and stores only their hash', () => {
    const first = createOpaqueTrackingToken()
    const second = createOpaqueTrackingToken()
    expect(first).not.toBe(second)
    expect(first).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i)
    expect(hashTrackingToken(first)).toHaveLength(64)
    expect(hashTrackingToken(first)).not.toBe(first)
  })

  it('rejects external or protocol-relative link destinations', () => {
    expect(isSafePromoterDestinationPath('/tickets/purchase?event_id=event-1')).toBe(true)
    expect(isSafePromoterDestinationPath('https://attacker.example')).toBe(false)
    expect(isSafePromoterDestinationPath('//attacker.example')).toBe(false)
  })

  it('defines staged promoter rollout flags as disabled by default where admin governance is available', () => {
    for (const key of ['admin_event_promoter_program_v1', 'admin_event_promoter_payouts_v1']) {
      expect(getAdminFeatureFlagDefinition(key)?.safeDefault).toBe(false)
    }
    expect(validateAdminFeatureFlagRegistry(new Date('2026-08-17T00:00:00.000Z'))).toEqual([])
  })

  it('seeds compatible platform rollout flags without assuming admin governance tables', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818010233_event_promoter_network_foundation.sql'),
      'utf8',
    )
    expect(migration).toContain("to_regclass('public.feature_flags')")
    expect(migration).toContain("'event_promoter_payable_commissions_enabled'")
    expect(migration).not.toContain('insert into public.admin_feature_flag_definitions')
  })

  it('keeps promoter RLS independent of the optional ticketing capability helper', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818010233_event_promoter_network_foundation.sql'),
      'utf8',
    )
    expect(migration).not.toMatch(/(?:public\.)?can_ticketing_on_event\s*\(/)
    expect(migration).toContain('private.can_manage_event_promoter_program')
    expect(migration).not.toContain('function public.can_manage_event_promoter_program')
  })

  it('identifies financial changes that require a future-facing version', () => {
    const current = promoterProgramSettingsSchema.parse({
      commission_type: 'percentage',
      commission_rate_bps: 1000,
      commission_fixed_amount_minor: null,
      attribution_window_days: 30,
      eligible_ticket_types: [{ ticket_type_id: '11111111-1111-4111-8111-111111111111' }],
    })
    expect(hasPromoterFinancialTermsChanged(current, { ...current, commission_rate_bps: 1500 })).toBe(true)
    expect(hasPromoterFinancialTermsChanged(current, {
      ...current,
      eligible_ticket_types: [{ ticket_type_id: '22222222-2222-4222-8222-222222222222' }],
    })).toBe(true)
    expect(hasPromoterFinancialTermsChanged(current, { ...current, application_mode: 'open' })).toBe(false)
  })

  it('keeps Phase 2 program writes server-only and audited', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818011952_event_promoter_program_audit_events.sql'),
      'utf8',
    )
    expect(migration).toContain('event_promotion_program_audit_events')
    expect(migration).toContain('security invoker')
    expect(migration).toContain('grant execute on function public.upsert_event_promoter_program')
    expect(migration).toContain('to service_role')
    expect(migration).toContain('financial_terms_versioned')
    expect(migration).not.toMatch(/\bdelete\s+from\b/i)
  })

  it('keeps membership lifecycle writes server-only and append-only audited', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818013424_event_promoter_membership_lifecycle.sql'),
      'utf8',
    )
    expect(migration).toContain('event_promoter_membership_audit_events')
    expect(migration).toContain('transition_event_promoter_membership')
    expect(migration).toContain('security invoker')
    expect(migration).toContain('grant execute on function public.transition_event_promoter_membership')
    expect(migration).toContain('to service_role')
    expect(migration).not.toMatch(/\bdelete\s+from\b/i)
  })

  it('keeps Phase 4 assets opaque, server-resolved, and bound to native Tourify sources', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818015002_event_promoter_tracking_assets.sql'),
      'utf8',
    )
    expect(migration).toContain('promoter_promo_code_bindings')
    expect(migration).toContain('promoter_social_sources')
    expect(migration).toContain('resolve_event_promoter_tracking_link')
    expect(migration).toContain("p_channel not in ('external', 'native_post')")
    expect(migration).toContain("interval '30 seconds'")
    expect(migration).toContain('grant execute on function public.resolve_event_promoter_tracking_link')
    expect(migration).toContain('to service_role')
    expect(migration).not.toMatch(/grant execute[\s\S]*resolve_event_promoter_tracking_link[\s\S]*to authenticated/i)
  })

  it('keeps Phase 5 checkout attribution in explicit non-payable shadow mode', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818020124_event_promoter_checkout_shadow_attribution.sql'),
      'utf8',
    )
    expect(migration).toContain('promoter_checkout_shadow_attributions')
    expect(migration).toContain('resolve_event_promoter_checkout_shadow_attribution')
    expect(migration).toContain("'promo_code'::text as source_type")
    expect(migration).toContain('order by touchpoint.occurred_at desc')
    expect(migration).toContain("v_decision_reason := 'self_referral_blocked'")
    expect(migration).toContain("'payable_commission_created', false")
    expect(migration).not.toContain('insert into public.ticket_sale_attributions')
    expect(migration).not.toContain('insert into public.promoter_commission_ledger')
  })

  it('keeps Phase 6 promoter money immutable, integer-based, and service-only', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818021315_event_promoter_commission_finalization.sql'),
      'utf8',
    )
    expect(migration).toContain('finalize_event_promoter_commission')
    expect(migration).toContain('reverse_event_promoter_commission')
    expect(migration).toContain('reinstate_event_promoter_commission')
    expect(migration).toContain('ticket_sale_attributions_one_per_order_idx')
    expect(migration).toContain("'promoter:earned:' || v_order.id::text")
    expect(migration).toContain("'rounding', 'floor'")
    expect(migration).toContain('p_cumulative_refund_minor')
    expect(migration).toContain("entry_type in ('refund_reversal', 'chargeback_reversal')")
    expect(migration).toContain('grant execute on function public.finalize_event_promoter_commission(uuid, text) to service_role')
    expect(migration).not.toMatch(/grant execute[\s\S]*finalize_event_promoter_commission[\s\S]*to authenticated/i)
  })

  it('keeps Phase 7 earnings server-derived and scoped to the authenticated promoter', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818031616_event_promoter_earnings_dashboard.sql'),
      'utf8',
    )
    expect(migration).toContain('private.get_my_event_promoter_earnings_dashboard')
    expect(migration).toContain('where membership.user_id = auth.uid()')
    expect(migration).toContain('public.get_my_event_promoter_earnings_dashboard()')
    expect(migration).toContain("'payment_reference_present', ledger.payment_reference is not null")
    expect(migration).toContain("'earnings_by_currency'")
    expect(migration).toContain('grant execute on function public.get_my_event_promoter_earnings_dashboard() to authenticated')
    expect(migration).not.toMatch(/get_my_event_promoter_earnings_dashboard\([^)]*[a-z_]+/i)
  })

  it('keeps Phase 8 organizer analytics event-scoped, ledger-derived, and export-safe', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818032821_event_promoter_organizer_analytics.sql'),
      'utf8',
    )
    expect(migration).toContain('private.get_event_promoter_organizer_analytics(p_event_id uuid)')
    expect(migration).toContain('private.can_manage_event_promoter_program(p_event_id)')
    expect(migration).toContain('managed_tour_events')
    expect(migration).toContain('attribution_financial_totals')
    expect(migration).toContain('public.get_event_promoter_organizer_analytics(p_event_id uuid)')
    expect(migration).toContain('grant execute on function public.get_event_promoter_organizer_analytics(uuid) to authenticated')
    expect(migration).not.toContain("'payment_reference'")
  })

  it('keeps Phase 9 payout allocation append-only, held until available, and finance-controlled', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818040930_event_promoter_payout_adapter.sql'),
      'utf8',
    )
    expect(migration).toContain('promoter_payout_batches')
    expect(migration).toContain('promoter_payout_batch_events')
    expect(migration).toContain('promoter_commission_hold_events')
    expect(migration).toContain('create_event_promoter_payout_batch')
    expect(migration).toContain('for update of earned skip locked')
    expect(migration).toContain('on conflict (commission_ledger_id) do nothing')
    expect(migration).toContain("'manual_review'")
    expect(migration).toContain('grant execute on function public.create_event_promoter_payout_batch')
    expect(migration).toContain('to service_role')
    expect(migration).not.toMatch(/update\s+public\.promoter_commission_ledger/i)
  })

  it('keeps Phase 10 risk, telemetry, and rollout controls additive and privacy-minimized', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818042043_event_promoter_hardening_rollout.sql'),
      'utf8',
    )
    expect(migration).toContain('promoter_risk_flag_events')
    expect(migration).toContain('promoter_network_operational_events')
    expect(migration).toContain('promoter_risk_flags_direct_deny')
    expect(migration).toContain('create_event_promoter_risk_flag')
    expect(migration).toContain('transition_event_promoter_risk_flag')
    expect(migration).toContain('get_event_promoter_rollout_readiness')
    expect(migration).toContain("'promoter_kyc_and_connect_readiness_not_proven'")
    expect(migration).not.toMatch(/delete\s+from\s+public\.promoter_/i)
  })

  it('covers Phase 10 promoter foreign keys without deleting pilot indexes or data', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260818043734_event_promoter_fk_performance_indexes.sql'),
      'utf8',
    )
    expect(migration).toContain('ticket_sale_attributions_program_idx')
    expect(migration).toContain('promoter_risk_flags_membership_idx')
    expect(migration).toContain('promoter_payout_batches_created_by_idx')
    expect(migration).toMatch(/create index if not exists/g)
    expect(migration).not.toMatch(/drop\s+index|delete\s+from/i)
  })
})
