/**
 * phase5-remaining.ts — TRAVEL-501..502, TOUR-501..502, REP-501..503, REL-501
 *
 * Pure domain logic for:
 *  TRAVEL-501: Provider adapter boundary (idempotent import, canonical mapping)
 *  TRAVEL-502: Document storage (travel documents — audience-aware, malware-scanned)
 *  TOUR-501: Commercial closeout (ticketing/budget/contract/settlement readiness)
 *  TOUR-502: Cancellation impact workflow
 *  REP-501: Ticketing dashboard metrics
 *  REP-502: Finance/profitability dashboard metrics
 *  REP-503: Vendor/contract dashboard metrics
 *  REL-501: Provider contract sandboxes
 *
 * No Supabase imports. No mocks. Pure domain logic only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TRAVEL-501 — Provider adapter boundary
// ─────────────────────────────────────────────────────────────────────────────

export type TravelProviderEventType =
  | 'booking_confirmed' | 'booking_cancelled' | 'booking_changed'
  | 'checkin_completed' | 'ticket_issued' | 'segment_updated' | 'unknown';

export interface TravelProviderEvent {
  provider_event_id: string; // dedup key
  provider_name: string;
  event_type: TravelProviderEventType;
  provider_reference: string;
  segment_id?: string; // canonical match attempt
  payload_hash: string;
  received_at: string;
  is_replayed: boolean;
}

export type ProviderImportResult =
  | { outcome: 'created'; canonical_id: string }
  | { outcome: 'updated'; canonical_id: string; changes: string[] }
  | { outcome: 'duplicate'; canonical_id: string }
  | { outcome: 'unmatched'; reason: string }
  | { outcome: 'error'; reason: string };

export interface ProviderImportRecord {
  import_id: string;
  provider_event_id: string;
  result: ProviderImportResult;
  imported_at: string;
}

export function processProviderEvent(
  event: TravelProviderEvent,
  processed_event_ids: Set<string>,
  match_segment_id: string | null,
): ProviderImportRecord {
  const import_id = `import_${event.provider_event_id}`;
  const imported_at = new Date().toISOString();

  // Dedup: idempotent — same event_id returns duplicate
  if (processed_event_ids.has(event.provider_event_id)) {
    return {
      import_id,
      provider_event_id: event.provider_event_id,
      result: { outcome: 'duplicate', canonical_id: match_segment_id ?? '' },
      imported_at,
    };
  }

  if (event.event_type === 'unknown') {
    return {
      import_id,
      provider_event_id: event.provider_event_id,
      result: { outcome: 'unmatched', reason: 'Unknown event type — routed for manual review' },
      imported_at,
    };
  }

  if (!match_segment_id) {
    return {
      import_id,
      provider_event_id: event.provider_event_id,
      result: { outcome: 'unmatched', reason: 'No canonical segment matched provider reference' },
      imported_at,
    };
  }

  const outcome: ProviderImportResult = event.event_type === 'booking_confirmed'
    ? { outcome: 'updated', canonical_id: match_segment_id, changes: ['status: confirmed'] }
    : { outcome: 'updated', canonical_id: match_segment_id, changes: [`event: ${event.event_type}`] };

  return { import_id, provider_event_id: event.provider_event_id, result: outcome, imported_at };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAVEL-502 — Document storage
// ─────────────────────────────────────────────────────────────────────────────

export type TravelDocType = 'ticket' | 'voucher' | 'confirmation' | 'manifest' | 'hotel_list' | 'boarding_pass' | 'visa' | 'other';
export type DocAccessAudience = 'org_admin' | 'tour_manager' | 'traveler' | 'driver' | 'vendor';
export type DocScanStatus = 'pending' | 'clean' | 'flagged' | 'error';

export interface TravelDocument {
  doc_id: string;
  org_id: string;
  tour_id: string;
  person_id?: string;
  segment_id?: string;
  doc_type: TravelDocType;
  file_ref: string; // immutable token — never raw URL
  mime_type: string;
  scan_status: DocScanStatus;
  uploaded_by: string;
  uploaded_at: string;
  expires_at?: string;
  audience: DocAccessAudience[];
  is_revoked: boolean;
  retention_policy: 'standard' | 'legal_hold' | 'extended';
}

export function checkDocumentAccess(doc: TravelDocument, requester_audience: DocAccessAudience): boolean {
  if (doc.is_revoked) return false;
  if (doc.scan_status === 'flagged') return false;
  return doc.audience.includes(requester_audience);
}

export function revokeDocument(doc: TravelDocument): TravelDocument {
  return { ...doc, is_revoked: true };
}

export function markDocumentScanned(doc: TravelDocument, status: DocScanStatus): TravelDocument {
  return { ...doc, scan_status: status };
}

export function isDocumentExpired(doc: TravelDocument, today: string): boolean {
  if (!doc.expires_at) return false;
  return doc.expires_at < today;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-501 — Commercial closeout readiness
// ─────────────────────────────────────────────────────────────────────────────

export interface CommercialCloseoutReadiness {
  tour_id: string;
  ticketing_ready: boolean;
  ticketing_blockers: string[];
  budget_approved: boolean;
  budget_blockers: string[];
  contracts_executed: boolean;
  contracts_blockers: string[];
  settlements_complete: boolean;
  settlements_blockers: string[];
  can_transition_to_settled: boolean;
  blocking_count: number;
}

export function computeCommercialCloseoutReadiness(params: {
  tour_id: string;
  all_events_reconciled: boolean;
  has_open_invoices: boolean;
  budget_version_approved: boolean;
  has_unsigned_contracts: boolean;
  has_unsigned_contract_ids: string[];
  settlements_all_posted: boolean;
  unsettled_event_ids: string[];
}): CommercialCloseoutReadiness {
  const ticketing_blockers: string[] = [];
  if (!params.all_events_reconciled) ticketing_blockers.push('Not all events reconciled with provider');
  if (params.has_open_invoices) ticketing_blockers.push('Open invoices remain');

  const budget_blockers: string[] = [];
  if (!params.budget_version_approved) budget_blockers.push('Budget version not yet approved');

  const contracts_blockers: string[] = [];
  if (params.has_unsigned_contracts) {
    contracts_blockers.push(`Unsigned contracts: ${params.has_unsigned_contract_ids.join(', ')}`);
  }

  const settlements_blockers: string[] = [];
  if (!params.settlements_all_posted) {
    settlements_blockers.push(`Unsettled events: ${params.unsettled_event_ids.join(', ')}`);
  }

  const all_blockers = [...ticketing_blockers, ...budget_blockers, ...contracts_blockers, ...settlements_blockers];

  return {
    tour_id: params.tour_id,
    ticketing_ready: ticketing_blockers.length === 0,
    ticketing_blockers,
    budget_approved: budget_blockers.length === 0,
    budget_blockers,
    contracts_executed: contracts_blockers.length === 0,
    contracts_blockers,
    settlements_complete: settlements_blockers.length === 0,
    settlements_blockers,
    can_transition_to_settled: all_blockers.length === 0,
    blocking_count: all_blockers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-502 — Cancellation impact workflow
// ─────────────────────────────────────────────────────────────────────────────

export interface CancellationImpact {
  tour_id: string;
  notification_recipients: number;
  reservation_count: number;
  vendor_obligations_count: number;
  contract_termination_count: number;
  ticket_refund_eligible_count: number;
  staff_work_items_count: number;
  publication_revocation_count: number;
  estimated_budget_impact_minor: number;
  follow_ups: CancellationFollowUp[];
  requires_legal_review: boolean;
}

export interface CancellationFollowUp {
  follow_up_id: string;
  domain: string;
  action: string;
  assigned_to?: string;
  due_date?: string;
  is_resolved: boolean;
}

export function previewCancellationImpact(params: {
  tour_id: string;
  active_recipient_count: number;
  active_reservation_count: number;
  vendor_obligation_count: number;
  executed_contract_count: number;
  refundable_ticket_count: number;
  staff_shift_count: number;
  active_publication_count: number;
  committed_budget_minor: number;
}): CancellationImpact {
  const follow_ups: CancellationFollowUp[] = [];

  if (params.vendor_obligation_count > 0) {
    follow_ups.push({
      follow_up_id: 'fu_vendors', domain: 'vendors',
      action: `Review ${params.vendor_obligation_count} vendor obligation(s) for termination terms`,
      is_resolved: false,
    });
  }

  if (params.refundable_ticket_count > 0) {
    follow_ups.push({
      follow_up_id: 'fu_tickets', domain: 'ticketing',
      action: `Process refunds for ${params.refundable_ticket_count} ticket(s)`,
      is_resolved: false,
    });
  }

  if (params.staff_shift_count > 0) {
    follow_ups.push({
      follow_up_id: 'fu_staff', domain: 'workforce',
      action: `Notify ${params.staff_shift_count} scheduled staff`,
      is_resolved: false,
    });
  }

  return {
    tour_id: params.tour_id,
    notification_recipients: params.active_recipient_count,
    reservation_count: params.active_reservation_count,
    vendor_obligations_count: params.vendor_obligation_count,
    contract_termination_count: params.executed_contract_count,
    ticket_refund_eligible_count: params.refundable_ticket_count,
    staff_work_items_count: params.staff_shift_count,
    publication_revocation_count: params.active_publication_count,
    estimated_budget_impact_minor: params.committed_budget_minor,
    follow_ups,
    requires_legal_review: params.executed_contract_count > 0,
  };
}

export function resolveCancellationFollowUp(impact: CancellationImpact, follow_up_id: string): CancellationImpact {
  return {
    ...impact,
    follow_ups: impact.follow_ups.map(f => f.follow_up_id === follow_up_id ? { ...f, is_resolved: true } : f),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REP-501 — Ticketing dashboard metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketingDashboardMetric {
  metric_id: string;
  label: string;
  value: number | null;
  unit: 'tickets' | 'pct' | 'minor_currency' | 'count';
  severity: 'ok' | 'warning' | 'error' | 'unknown';
  freshness_at: string;
  is_stale: boolean;
  drilldown_url?: string;
}

export function buildTicketingDashboard(params: {
  event_id: string;
  total_capacity: number | null;
  tickets_sold: number | null;
  refunds: number | null;
  comps: number | null;
  check_in_count: number | null;
  provider_reconciled: boolean;
  reconciliation_variance: number | null;
  freshness_at: string;
  is_stale: boolean;
}): TicketingDashboardMetric[] {
  const utilization = params.total_capacity && params.tickets_sold != null
    ? Math.round(params.tickets_sold / params.total_capacity * 100)
    : null;

  return [
    {
      metric_id: 'tix_sold', label: 'Tickets Sold', value: params.tickets_sold,
      unit: 'tickets', severity: params.tickets_sold != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'tix_utilization', label: 'Capacity Utilization',
      value: utilization, unit: 'pct',
      severity: utilization != null ? (utilization >= 90 ? 'ok' : utilization >= 50 ? 'warning' : 'error') : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'tix_refunds', label: 'Refunds', value: params.refunds,
      unit: 'tickets', severity: params.refunds != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'tix_check_in', label: 'Check-ins', value: params.check_in_count,
      unit: 'tickets', severity: params.check_in_count != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'tix_reconciliation_variance',
      label: 'Provider Reconciliation Variance',
      value: params.reconciliation_variance,
      unit: 'minor_currency',
      severity: !params.provider_reconciled ? 'warning'
        : params.reconciliation_variance == null ? 'unknown'
        : Math.abs(params.reconciliation_variance) > 0 ? 'error' : 'ok',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// REP-502 — Finance/profitability dashboard metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface FinanceDashboardMetric {
  metric_id: string;
  label: string;
  value: number | null;
  original_currency: string;
  reporting_currency: string;
  fx_freshness_at?: string;
  fx_is_stale?: boolean;
  severity: 'ok' | 'warning' | 'error' | 'unknown';
  freshness_at: string;
  is_stale: boolean;
}

export function buildFinanceDashboard(params: {
  tour_id: string;
  budget_approved: number | null;
  budget_forecast: number | null;
  committed: number | null;
  actuals: number | null;
  settlement_total: number | null;
  outstanding_items: number;
  currency: string;
  fx_freshness_at?: string;
  fx_is_stale?: boolean;
  freshness_at: string;
  is_stale: boolean;
}): FinanceDashboardMetric[] {
  const variance = params.budget_approved != null && params.actuals != null
    ? params.actuals - params.budget_approved : null;

  return [
    {
      metric_id: 'fin_budget_approved', label: 'Approved Budget', value: params.budget_approved,
      original_currency: params.currency, reporting_currency: params.currency,
      severity: params.budget_approved != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'fin_committed', label: 'Total Committed', value: params.committed,
      original_currency: params.currency, reporting_currency: params.currency,
      severity: params.committed != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'fin_actuals', label: 'Actuals', value: params.actuals,
      original_currency: params.currency, reporting_currency: params.currency,
      severity: params.actuals != null ? 'ok' : 'unknown',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'fin_variance', label: 'Budget Variance', value: variance,
      original_currency: params.currency, reporting_currency: params.currency,
      fx_freshness_at: params.fx_freshness_at,
      fx_is_stale: params.fx_is_stale,
      severity: variance == null ? 'unknown' : variance > 0 ? 'error' : variance > -(params.budget_approved ?? 0) * 0.1 ? 'warning' : 'ok',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
    {
      metric_id: 'fin_outstanding_items', label: 'Outstanding Items', value: params.outstanding_items,
      original_currency: params.currency, reporting_currency: params.currency,
      severity: params.outstanding_items === 0 ? 'ok' : params.outstanding_items <= 3 ? 'warning' : 'error',
      freshness_at: params.freshness_at, is_stale: params.is_stale,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// REP-503 — Vendor/contract dashboard metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorContractMetric {
  metric_id: string;
  label: string;
  value: number | null;
  severity: 'ok' | 'warning' | 'error' | 'unknown';
  freshness_at: string;
}

export function buildVendorContractDashboard(params: {
  tour_id: string;
  active_engagements: number;
  open_rfps: number;
  unsigned_contracts: number;
  overdue_obligations: number;
  expiring_compliance_docs: number; // within 30 days
  unmatched_invoices: number;
  freshness_at: string;
}): VendorContractMetric[] {
  return [
    {
      metric_id: 'vend_active_engagements', label: 'Active Engagements', value: params.active_engagements,
      severity: 'ok', freshness_at: params.freshness_at,
    },
    {
      metric_id: 'vend_open_rfps', label: 'Open RFPs', value: params.open_rfps,
      severity: params.open_rfps > 0 ? 'warning' : 'ok', freshness_at: params.freshness_at,
    },
    {
      metric_id: 'cont_unsigned', label: 'Unsigned Contracts', value: params.unsigned_contracts,
      severity: params.unsigned_contracts === 0 ? 'ok' : params.unsigned_contracts <= 2 ? 'warning' : 'error',
      freshness_at: params.freshness_at,
    },
    {
      metric_id: 'cont_overdue_obligations', label: 'Overdue Obligations', value: params.overdue_obligations,
      severity: params.overdue_obligations === 0 ? 'ok' : 'error', freshness_at: params.freshness_at,
    },
    {
      metric_id: 'vend_expiring_compliance', label: 'Expiring Compliance Docs (30d)',
      value: params.expiring_compliance_docs,
      severity: params.expiring_compliance_docs === 0 ? 'ok' : 'warning', freshness_at: params.freshness_at,
    },
    {
      metric_id: 'vend_unmatched_invoices', label: 'Unmatched Invoices', value: params.unmatched_invoices,
      severity: params.unmatched_invoices === 0 ? 'ok' : 'error', freshness_at: params.freshness_at,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// REL-501 — Provider contract sandboxes
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderAdapterType = 'ticketing' | 'e_signature' | 'email' | 'sms' | 'map' | 'accounting';

export interface ProviderWebhookEvent {
  event_id: string;
  provider: string;
  event_type: string;
  payload_hash: string;
  signature: string;
  received_at: string;
}

export interface ProviderAdapterCheck {
  adapter_type: ProviderAdapterType;
  check_name: string;
  passed: boolean;
  notes?: string;
}

export function validateProviderWebhookSignature(
  event: ProviderWebhookEvent,
  expected_signature: string,
): { valid: boolean; reason?: string } {
  if (!event.signature) return { valid: false, reason: 'Missing signature' };
  if (event.signature !== expected_signature) return { valid: false, reason: 'Signature mismatch' };
  return { valid: true };
}

export function detectWebhookReplay(
  event: ProviderWebhookEvent,
  processed_ids: Set<string>,
): { is_replay: boolean } {
  return { is_replay: processed_ids.has(event.event_id) };
}

export function checkProviderAdapterRateLimitExceeded(
  request_count: number,
  limit: number,
): { exceeded: boolean; remaining: number } {
  return { exceeded: request_count >= limit, remaining: Math.max(0, limit - request_count) };
}

export interface ProviderAdapterSandboxResult {
  adapter_type: ProviderAdapterType;
  provider_name: string;
  checks: ProviderAdapterCheck[];
  all_passed: boolean;
  can_enable: boolean;
}

export function runProviderAdapterSandbox(
  adapter_type: ProviderAdapterType,
  provider_name: string,
  check_results: Omit<ProviderAdapterCheck, 'adapter_type'>[],
): ProviderAdapterSandboxResult {
  const checks = check_results.map(c => ({ ...c, adapter_type }));
  const all_passed = checks.every(c => c.passed);
  return {
    adapter_type,
    provider_name,
    checks,
    all_passed,
    can_enable: all_passed,
  };
}

export function buildRequiredAdapterChecks(adapter_type: ProviderAdapterType): string[] {
  const base = ['signature_validation', 'replay_protection', 'rate_limit_behavior', 'timeout_handling', 'retry_semantics'];
  switch (adapter_type) {
    case 'ticketing':
      return [...base, 'inventory_reconciliation', 'refund_idempotency'];
    case 'e_signature':
      return [...base, 'webhook_order', 'executed_document_checksum'];
    case 'accounting':
      return [...base, 'duplicate_posting_prevention', 'fx_rate_precision'];
    default:
      return base;
  }
}
