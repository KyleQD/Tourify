import { describe, it, expect } from 'vitest';
import {
  processProviderEvent,
  checkDocumentAccess,
  revokeDocument,
  markDocumentScanned,
  isDocumentExpired,
  computeCommercialCloseoutReadiness,
  previewCancellationImpact,
  resolveCancellationFollowUp,
  buildTicketingDashboard,
  buildFinanceDashboard,
  buildVendorContractDashboard,
  validateProviderWebhookSignature,
  detectWebhookReplay,
  checkProviderAdapterRateLimitExceeded,
  runProviderAdapterSandbox,
  buildRequiredAdapterChecks,
  type TravelProviderEvent,
  type TravelDocument,
} from '../../lib/admin/phase5-remaining';

// ── TRAVEL-501 ──────────────────────────────────────────────────────────────

function makeProviderEvent(id = 'evt_1', type: TravelProviderEvent['event_type'] = 'booking_confirmed'): TravelProviderEvent {
  return {
    provider_event_id: id, provider_name: 'SkyTickets', event_type: type,
    provider_reference: 'BK-123', payload_hash: 'hash1',
    received_at: '2026-07-23T10:00:00Z', is_replayed: false,
  };
}

describe('TRAVEL-501 — Provider adapter boundary', () => {
  it('deduplicates already-processed events', () => {
    const processed = new Set(['evt_1']);
    const result = processProviderEvent(makeProviderEvent('evt_1'), processed, 'seg_1');
    expect(result.result.outcome).toBe('duplicate');
  });

  it('routes unknown event type to unmatched', () => {
    const result = processProviderEvent(makeProviderEvent('evt_2', 'unknown'), new Set(), 'seg_1');
    expect(result.result.outcome).toBe('unmatched');
  });

  it('routes event with no segment match to unmatched', () => {
    const result = processProviderEvent(makeProviderEvent('evt_3'), new Set(), null);
    expect(result.result.outcome).toBe('unmatched');
  });

  it('processes booking_confirmed event with segment match as updated', () => {
    const result = processProviderEvent(makeProviderEvent('evt_4'), new Set(), 'seg_42');
    expect(result.result.outcome).toBe('updated');
    if (result.result.outcome === 'updated') {
      expect(result.result.canonical_id).toBe('seg_42');
    }
  });
});

// ── TRAVEL-502 ──────────────────────────────────────────────────────────────

function makeDoc(overrides: Partial<TravelDocument> = {}): TravelDocument {
  return {
    doc_id: 'd1', org_id: 'org_1', tour_id: 'tour_1', doc_type: 'ticket',
    file_ref: 'token_abc', mime_type: 'application/pdf', scan_status: 'clean',
    uploaded_by: 'u', uploaded_at: '2026-07-23T00:00:00Z',
    audience: ['traveler', 'org_admin'], is_revoked: false,
    retention_policy: 'standard',
    ...overrides,
  };
}

describe('TRAVEL-502 — Document storage', () => {
  it('checkDocumentAccess allows audience member with clean scan', () => {
    expect(checkDocumentAccess(makeDoc(), 'traveler')).toBe(true);
  });

  it('checkDocumentAccess denies revoked document', () => {
    expect(checkDocumentAccess(makeDoc({ is_revoked: true }), 'traveler')).toBe(false);
  });

  it('checkDocumentAccess denies flagged scan', () => {
    expect(checkDocumentAccess(makeDoc({ scan_status: 'flagged' }), 'traveler')).toBe(false);
  });

  it('checkDocumentAccess denies non-audience member', () => {
    expect(checkDocumentAccess(makeDoc({ audience: ['org_admin'] }), 'traveler')).toBe(false);
  });

  it('revokeDocument sets is_revoked to true', () => {
    expect(revokeDocument(makeDoc()).is_revoked).toBe(true);
  });

  it('markDocumentScanned updates scan_status', () => {
    const doc = markDocumentScanned(makeDoc({ scan_status: 'pending' }), 'clean');
    expect(doc.scan_status).toBe('clean');
  });

  it('isDocumentExpired returns true for past expiry', () => {
    const doc = makeDoc({ expires_at: '2025-01-01' });
    expect(isDocumentExpired(doc, '2026-07-23')).toBe(true);
  });

  it('isDocumentExpired returns false for no expiry', () => {
    expect(isDocumentExpired(makeDoc(), '2026-07-23')).toBe(false);
  });
});

// ── TOUR-501 ──────────────────────────────────────────────────────────────

describe('TOUR-501 — Commercial closeout readiness', () => {
  it('can_transition_to_settled when all requirements met', () => {
    const result = computeCommercialCloseoutReadiness({
      tour_id: 'tour_1',
      all_events_reconciled: true, has_open_invoices: false,
      budget_version_approved: true,
      has_unsigned_contracts: false, has_unsigned_contract_ids: [],
      settlements_all_posted: true, unsettled_event_ids: [],
    });
    expect(result.can_transition_to_settled).toBe(true);
    expect(result.blocking_count).toBe(0);
  });

  it('blocks when settlements not complete', () => {
    const result = computeCommercialCloseoutReadiness({
      tour_id: 'tour_1',
      all_events_reconciled: true, has_open_invoices: false,
      budget_version_approved: true,
      has_unsigned_contracts: false, has_unsigned_contract_ids: [],
      settlements_all_posted: false, unsettled_event_ids: ['ev_1'],
    });
    expect(result.can_transition_to_settled).toBe(false);
    expect(result.settlements_complete).toBe(false);
    expect(result.settlements_blockers).toHaveLength(1);
  });

  it('reports multiple blocking domains', () => {
    const result = computeCommercialCloseoutReadiness({
      tour_id: 'tour_1',
      all_events_reconciled: false, has_open_invoices: true,
      budget_version_approved: false,
      has_unsigned_contracts: true, has_unsigned_contract_ids: ['c1'],
      settlements_all_posted: false, unsettled_event_ids: ['ev_1'],
    });
    expect(result.blocking_count).toBeGreaterThan(3);
  });
});

// ── TOUR-502 ──────────────────────────────────────────────────────────────

describe('TOUR-502 — Cancellation impact workflow', () => {
  it('creates impact preview with follow_ups for affected domains', () => {
    const impact = previewCancellationImpact({
      tour_id: 'tour_1',
      active_recipient_count: 150, active_reservation_count: 40,
      vendor_obligation_count: 3, executed_contract_count: 2,
      refundable_ticket_count: 500, staff_shift_count: 20,
      active_publication_count: 2, committed_budget_minor: 50000_00,
    });
    expect(impact.follow_ups.length).toBeGreaterThan(0);
    expect(impact.requires_legal_review).toBe(true); // has executed contracts
  });

  it('no legal review when no executed contracts', () => {
    const impact = previewCancellationImpact({
      tour_id: 'tour_1',
      active_recipient_count: 10, active_reservation_count: 0,
      vendor_obligation_count: 0, executed_contract_count: 0,
      refundable_ticket_count: 0, staff_shift_count: 0,
      active_publication_count: 0, committed_budget_minor: 0,
    });
    expect(impact.requires_legal_review).toBe(false);
  });

  it('resolveCancellationFollowUp marks follow-up as resolved', () => {
    const impact = previewCancellationImpact({
      tour_id: 'tour_1',
      active_recipient_count: 10, active_reservation_count: 0,
      vendor_obligation_count: 2, executed_contract_count: 0,
      refundable_ticket_count: 0, staff_shift_count: 0,
      active_publication_count: 0, committed_budget_minor: 0,
    });
    const resolved = resolveCancellationFollowUp(impact, 'fu_vendors');
    const fu = resolved.follow_ups.find(f => f.follow_up_id === 'fu_vendors');
    expect(fu?.is_resolved).toBe(true);
  });
});

// ── REP-501 ──────────────────────────────────────────────────────────────

describe('REP-501 — Ticketing dashboard', () => {
  it('builds metrics array with correct ids', () => {
    const metrics = buildTicketingDashboard({
      event_id: 'ev_1', total_capacity: 1000, tickets_sold: 800, refunds: 20, comps: 10,
      check_in_count: 750, provider_reconciled: true, reconciliation_variance: 0,
      freshness_at: '2026-07-23T00:00:00Z', is_stale: false,
    });
    const ids = metrics.map(m => m.metric_id);
    expect(ids).toContain('tix_sold');
    expect(ids).toContain('tix_utilization');
    expect(ids).toContain('tix_reconciliation_variance');
  });

  it('utilization severity=ok at 90%+ capacity', () => {
    const metrics = buildTicketingDashboard({
      event_id: 'ev_1', total_capacity: 1000, tickets_sold: 950, refunds: 0, comps: 0,
      check_in_count: 900, provider_reconciled: true, reconciliation_variance: 0,
      freshness_at: '2026-07-23T00:00:00Z', is_stale: false,
    });
    const util = metrics.find(m => m.metric_id === 'tix_utilization')!;
    expect(util.severity).toBe('ok');
  });

  it('reconciliation error when variance > 0', () => {
    const metrics = buildTicketingDashboard({
      event_id: 'ev_1', total_capacity: 1000, tickets_sold: 900, refunds: 0, comps: 0,
      check_in_count: 850, provider_reconciled: true, reconciliation_variance: 500,
      freshness_at: '2026-07-23T00:00:00Z', is_stale: false,
    });
    const rec = metrics.find(m => m.metric_id === 'tix_reconciliation_variance')!;
    expect(rec.severity).toBe('error');
  });
});

// ── REP-502 ──────────────────────────────────────────────────────────────

describe('REP-502 — Finance dashboard', () => {
  it('builds finance metrics with variance', () => {
    const metrics = buildFinanceDashboard({
      tour_id: 'tour_1', budget_approved: 100000_00, budget_forecast: 105000_00,
      committed: 90000_00, actuals: 95000_00, settlement_total: null,
      outstanding_items: 2, currency: 'USD',
      freshness_at: '2026-07-23T00:00:00Z', is_stale: false,
    });
    expect(metrics.map(m => m.metric_id)).toContain('fin_variance');
    const variance = metrics.find(m => m.metric_id === 'fin_variance')!;
    expect(variance.value).toBe(-5000_00); // actuals - budget = 95000-100000 = -5000
  });

  it('variance severity=error when actuals exceed budget', () => {
    const metrics = buildFinanceDashboard({
      tour_id: 'tour_1', budget_approved: 100000_00, budget_forecast: null,
      committed: 110000_00, actuals: 115000_00, settlement_total: null,
      outstanding_items: 0, currency: 'USD',
      freshness_at: '2026-07-23T00:00:00Z', is_stale: false,
    });
    const variance = metrics.find(m => m.metric_id === 'fin_variance')!;
    expect(variance.severity).toBe('error');
  });
});

// ── REP-503 ──────────────────────────────────────────────────────────────

describe('REP-503 — Vendor/contract dashboard', () => {
  it('builds vendor/contract metrics', () => {
    const metrics = buildVendorContractDashboard({
      tour_id: 'tour_1', active_engagements: 5, open_rfps: 2,
      unsigned_contracts: 0, overdue_obligations: 0, expiring_compliance_docs: 1,
      unmatched_invoices: 0, freshness_at: '2026-07-23T00:00:00Z',
    });
    expect(metrics).toHaveLength(6);
    expect(metrics.find(m => m.metric_id === 'vend_open_rfps')?.severity).toBe('warning');
    expect(metrics.find(m => m.metric_id === 'cont_unsigned')?.severity).toBe('ok');
  });

  it('overdue_obligations severity=error when >0', () => {
    const metrics = buildVendorContractDashboard({
      tour_id: 'tour_1', active_engagements: 3, open_rfps: 0,
      unsigned_contracts: 0, overdue_obligations: 2, expiring_compliance_docs: 0,
      unmatched_invoices: 1, freshness_at: '2026-07-23T00:00:00Z',
    });
    expect(metrics.find(m => m.metric_id === 'cont_overdue_obligations')?.severity).toBe('error');
  });
});

// ── REL-501 ──────────────────────────────────────────────────────────────

describe('REL-501 — Provider contract sandboxes', () => {
  it('validateProviderWebhookSignature validates matching signature', () => {
    const event = { event_id: 'e1', provider: 'acme', event_type: 'booking', payload_hash: 'h1', signature: 'sig_abc', received_at: '2026-07-23T00:00:00Z' };
    expect(validateProviderWebhookSignature(event, 'sig_abc').valid).toBe(true);
  });

  it('validateProviderWebhookSignature rejects wrong signature', () => {
    const event = { event_id: 'e1', provider: 'acme', event_type: 'booking', payload_hash: 'h1', signature: 'wrong', received_at: '2026-07-23T00:00:00Z' };
    const result = validateProviderWebhookSignature(event, 'sig_abc');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it('detectWebhookReplay detects replayed event', () => {
    const event = { event_id: 'e1', provider: 'acme', event_type: 'booking', payload_hash: 'h1', signature: 's', received_at: '2026-07-23T00:00:00Z' };
    const result = detectWebhookReplay(event, new Set(['e1']));
    expect(result.is_replay).toBe(true);
  });

  it('checkProviderAdapterRateLimitExceeded detects exceeded limit', () => {
    expect(checkProviderAdapterRateLimitExceeded(100, 100).exceeded).toBe(true);
    expect(checkProviderAdapterRateLimitExceeded(99, 100).exceeded).toBe(false);
  });

  it('runProviderAdapterSandbox all_passed when all checks pass', () => {
    const result = runProviderAdapterSandbox('ticketing', 'AcmeTix', [
      { check_name: 'signature_validation', passed: true },
      { check_name: 'replay_protection', passed: true },
    ]);
    expect(result.all_passed).toBe(true);
    expect(result.can_enable).toBe(true);
  });

  it('runProviderAdapterSandbox can_enable=false when any check fails', () => {
    const result = runProviderAdapterSandbox('e_signature', 'DocuSign', [
      { check_name: 'signature_validation', passed: true },
      { check_name: 'webhook_order', passed: false },
    ]);
    expect(result.all_passed).toBe(false);
    expect(result.can_enable).toBe(false);
  });

  it('buildRequiredAdapterChecks includes domain-specific checks for ticketing', () => {
    const checks = buildRequiredAdapterChecks('ticketing');
    expect(checks).toContain('inventory_reconciliation');
    expect(checks).toContain('refund_idempotency');
    expect(checks).toContain('signature_validation');
  });

  it('buildRequiredAdapterChecks includes base checks for all adapters', () => {
    const checks = buildRequiredAdapterChecks('email');
    expect(checks).toContain('signature_validation');
    expect(checks).toContain('replay_protection');
  });
});
