/**
 * settlement-domain.ts — SETTLE-501..504
 *
 * Pure domain logic for show/tour settlements:
 *  SETTLE-501: Deal templates and formula definitions
 *  SETTLE-502: Settlement statement workspace
 *  SETTLE-503: Settlement approval and signoff
 *  SETTLE-504: Tour closeout / profitability rollup
 *
 * No Supabase imports. No mocks. Pure domain logic only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SETTLE-501 — Deal templates and formula definitions
// ─────────────────────────────────────────────────────────────────────────────

export type DealType =
  | 'guarantee'
  | 'percentage'
  | 'versus'
  | 'flat_fee'
  | 'split'
  | 'custom';

export type DeductionCategory =
  | 'venue_rental'
  | 'promoter_expenses'
  | 'taxes'
  | 'fees'
  | 'co_promotion'
  | 'support_act'
  | 'marketing'
  | 'production'
  | 'other';

export interface DealTemplateClause {
  clause_id: string;
  label: string;
  formula_expression: string; // human-readable formula description
  inputs: string[]; // variable names required
  is_required: boolean;
  notes?: string;
}

export interface DealTemplateVersion {
  version_id: string;
  version_number: number;
  deal_type: DealType;
  clauses: DealTemplateClause[];
  guarantee_amount_minor?: number;
  guarantee_currency?: string;
  percentage_of_gross?: number; // 0–100
  versus_floor_minor?: number;
  versus_floor_currency?: string;
  split_percentages?: { party: string; percentage: number }[];
  bonus_thresholds?: { gross_above_minor: number; bonus_minor: number; currency: string }[];
  tax_rate_basis_points?: number; // e.g. 800 = 8%
  fee_schedule?: { label: string; amount_minor: number; currency: string }[];
  promoter_expense_cap_minor?: number;
  promoter_expense_cap_currency?: string;
  is_draft: boolean;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  superseded_by_version_id?: string;
}

export function createDealTemplateVersion(
  params: Omit<DealTemplateVersion, 'version_id' | 'version_number' | 'is_draft' | 'is_approved' | 'created_at'> & {
    previous_versions: DealTemplateVersion[];
    created_at?: string;
  },
): DealTemplateVersion {
  const { previous_versions, created_at, ...rest } = params;
  const nextVersionNumber = previous_versions.length + 1;
  return {
    ...rest,
    version_id: `dtv_${Date.now()}_${nextVersionNumber}`,
    version_number: nextVersionNumber,
    is_draft: true,
    is_approved: false,
    created_at: created_at ?? new Date().toISOString(),
  };
}

export function approveDealTemplateVersion(
  version: DealTemplateVersion,
  approved_by: string,
  approved_at: string,
): DealTemplateVersion {
  if (version.is_approved) return version;
  return { ...version, is_draft: false, is_approved: true, approved_by, approved_at };
}

export function validateDealTemplate(version: DealTemplateVersion): string[] {
  const errors: string[] = [];
  if (!version.created_by) errors.push('created_by is required');
  if (version.deal_type === 'percentage' && version.percentage_of_gross == null) {
    errors.push('percentage_of_gross required for percentage deal');
  }
  if (version.deal_type === 'guarantee' && version.guarantee_amount_minor == null) {
    errors.push('guarantee_amount_minor required for guarantee deal');
  }
  if (version.deal_type === 'versus') {
    if (version.guarantee_amount_minor == null) errors.push('guarantee_amount_minor required for versus deal');
    if (version.percentage_of_gross == null) errors.push('percentage_of_gross required for versus deal');
  }
  if (version.deal_type === 'split' && !version.split_percentages?.length) {
    errors.push('split_percentages required for split deal');
  }
  if (version.split_percentages) {
    const total = version.split_percentages.reduce((s, sp) => s + sp.percentage, 0);
    if (Math.abs(total - 100) > 0.01) errors.push('split_percentages must sum to 100');
  }
  return errors;
}

export function computeDealFormula(
  version: DealTemplateVersion,
  gross_ticket_revenue_minor: number,
  approved_promoter_expenses_minor: number,
): {
  gross: number;
  deductions: number;
  net_before_deal: number;
  artist_payment_minor: number;
  formula_summary: string;
} {
  const promoter_cap = version.promoter_expense_cap_minor ?? Infinity;
  const capped_expenses = Math.min(approved_promoter_expenses_minor, promoter_cap);
  const net_before_deal = gross_ticket_revenue_minor - capped_expenses;

  let artist_payment_minor = 0;
  let formula_summary = '';

  switch (version.deal_type) {
    case 'guarantee':
      artist_payment_minor = version.guarantee_amount_minor ?? 0;
      formula_summary = `Guarantee: ${artist_payment_minor}`;
      break;
    case 'percentage':
      artist_payment_minor = Math.floor(gross_ticket_revenue_minor * (version.percentage_of_gross ?? 0) / 100);
      formula_summary = `${version.percentage_of_gross}% of gross: ${artist_payment_minor}`;
      break;
    case 'versus': {
      const guarantee = version.guarantee_amount_minor ?? 0;
      const pct_amount = Math.floor(net_before_deal * (version.percentage_of_gross ?? 0) / 100);
      artist_payment_minor = Math.max(guarantee, pct_amount);
      formula_summary = `Versus: max(guarantee ${guarantee}, ${version.percentage_of_gross}% of net ${pct_amount}) = ${artist_payment_minor}`;
      break;
    }
    case 'flat_fee':
      artist_payment_minor = version.guarantee_amount_minor ?? 0;
      formula_summary = `Flat fee: ${artist_payment_minor}`;
      break;
    default:
      artist_payment_minor = 0;
      formula_summary = 'Custom/split — manual calculation required';
  }

  // Apply bonus thresholds
  if (version.bonus_thresholds) {
    for (const bt of version.bonus_thresholds) {
      if (gross_ticket_revenue_minor > bt.gross_above_minor) {
        artist_payment_minor += bt.bonus_minor;
        formula_summary += ` + bonus ${bt.bonus_minor}`;
      }
    }
  }

  return {
    gross: gross_ticket_revenue_minor,
    deductions: capped_expenses,
    net_before_deal,
    artist_payment_minor,
    formula_summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLE-502 — Settlement statement workspace
// ─────────────────────────────────────────────────────────────────────────────

export type SettlementStatus =
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'counterparty_review'
  | 'signed'
  | 'posted'
  | 'disputed'
  | 'closed';

export const SETTLEMENT_STATUS_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'pending_approval'],
  pending_approval: ['in_review', 'approved'],
  approved: ['counterparty_review', 'disputed'],
  counterparty_review: ['approved', 'signed', 'disputed'],
  signed: ['posted'],
  posted: ['disputed', 'closed'],
  disputed: ['draft', 'in_review'],
  closed: [],
};

export interface SettlementLineItem {
  line_id: string;
  category: string;
  label: string;
  amount_minor: number;
  currency: string;
  source_type: 'ticket_statement' | 'expense' | 'contract' | 'manual' | 'deduction';
  source_id?: string;
  source_version?: string;
  is_contested: boolean;
  contest_reason?: string;
  notes?: string;
}

export interface SettlementAdjustment {
  adjustment_id: string;
  label: string;
  amount_minor: number; // can be negative
  currency: string;
  reason: string;
  added_by: string;
  added_at: string;
  is_approved: boolean;
}

export interface SettlementStatement {
  statement_id: string;
  org_id: string;
  tour_id: string;
  event_id: string;
  deal_template_version_id: string;
  status: SettlementStatus;
  version_number: number;
  lines: SettlementLineItem[];
  adjustments: SettlementAdjustment[];
  ticket_source_version?: string;
  ticket_source_snapshot_at?: string;
  gross_ticket_revenue_minor: number;
  currency: string;
  artist_payment_minor: number;
  formula_summary: string;
  is_ticket_source_stale: boolean;
  created_by: string;
  created_at: string;
  last_modified_at: string;
}

export function createSettlementStatement(
  params: Omit<SettlementStatement, 'statement_id' | 'status' | 'version_number' | 'created_at' | 'last_modified_at'> & {
    created_at?: string;
  },
): SettlementStatement {
  const { created_at, ...rest } = params;
  const now = created_at ?? new Date().toISOString();
  return {
    ...rest,
    statement_id: `stmt_${Date.now()}`,
    status: 'draft',
    version_number: 1,
    created_at: now,
    last_modified_at: now,
  };
}

export function addSettlementLine(
  statement: SettlementStatement,
  line: Omit<SettlementLineItem, 'line_id'>,
): SettlementStatement {
  if (statement.status !== 'draft' && statement.status !== 'in_review') {
    throw new Error(`Cannot add lines in status: ${statement.status}`);
  }
  const newLine: SettlementLineItem = { ...line, line_id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  return { ...statement, lines: [...statement.lines, newLine], last_modified_at: new Date().toISOString() };
}

export function addSettlementAdjustment(
  statement: SettlementStatement,
  adjustment: Omit<SettlementAdjustment, 'adjustment_id' | 'is_approved'>,
): SettlementStatement {
  if (['posted', 'closed'].includes(statement.status)) {
    throw new Error(`Cannot add adjustments in status: ${statement.status}`);
  }
  const newAdj: SettlementAdjustment = {
    ...adjustment,
    adjustment_id: `adj_${Date.now()}`,
    is_approved: false,
  };
  return { ...statement, adjustments: [...statement.adjustments, newAdj], last_modified_at: new Date().toISOString() };
}

export function transitionSettlementStatus(
  statement: SettlementStatement,
  to: SettlementStatus,
  actor: string,
): SettlementStatement {
  const allowed = SETTLEMENT_STATUS_TRANSITIONS[statement.status];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${statement.status} → ${to}`);
  }
  return { ...statement, status: to, last_modified_at: new Date().toISOString() };
}

export function computeSettlementNetPayable(statement: SettlementStatement): {
  gross: number;
  total_deductions: number;
  approved_adjustments: number;
  net_payable: number;
  unapproved_adjustments: number;
} {
  const total_deductions = statement.lines
    .filter(l => l.source_type === 'deduction' && !l.is_contested)
    .reduce((s, l) => s + l.amount_minor, 0);
  const approved_adjustments = statement.adjustments
    .filter(a => a.is_approved)
    .reduce((s, a) => s + a.amount_minor, 0);
  const unapproved_adjustments = statement.adjustments
    .filter(a => !a.is_approved)
    .reduce((s, a) => s + a.amount_minor, 0);
  return {
    gross: statement.gross_ticket_revenue_minor,
    total_deductions,
    approved_adjustments,
    net_payable: statement.artist_payment_minor + approved_adjustments,
    unapproved_adjustments,
  };
}

export function markTicketSourceStale(statement: SettlementStatement): SettlementStatement {
  return { ...statement, is_ticket_source_stale: true, last_modified_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLE-503 — Settlement approval and signoff
// ─────────────────────────────────────────────────────────────────────────────

export interface SettlementApprovalRecord {
  approval_id: string;
  statement_id: string;
  approved_by: string;
  approved_at: string;
  role: 'finance' | 'tour_manager' | 'org_admin';
  notes?: string;
}

export interface SettlementSignoff {
  signoff_id: string;
  statement_id: string;
  signatory: string; // counterparty identifier
  signed_at: string;
  document_ref?: string; // immutable document reference
  method: 'manual_upload' | 'e_signature' | 'email_confirmation';
  signature_envelope_id?: string;
}

export interface SettlementPostRecord {
  post_id: string;
  statement_id: string;
  posted_by: string;
  posted_at: string;
  finance_record_ids: string[];
  variance_minor: number;
  variance_currency: string;
  variance_notes?: string;
}

export function recordSettlementApproval(
  statement: SettlementStatement,
  approval: Omit<SettlementApprovalRecord, 'approval_id'>,
): SettlementApprovalRecord {
  if (statement.status !== 'pending_approval') {
    throw new Error(`Statement must be in pending_approval to record internal approval; currently ${statement.status}`);
  }
  return { ...approval, approval_id: `appr_${Date.now()}` };
}

export function recordCounterpartySignoff(
  statement: SettlementStatement,
  signoff: Omit<SettlementSignoff, 'signoff_id'>,
): SettlementSignoff {
  if (statement.status !== 'counterparty_review') {
    throw new Error(`Statement must be in counterparty_review to record signoff; currently ${statement.status}`);
  }
  return { ...signoff, signoff_id: `signoff_${Date.now()}` };
}

export function postSettlementActuals(
  statement: SettlementStatement,
  post: Omit<SettlementPostRecord, 'post_id'>,
): { updated_statement: SettlementStatement; post_record: SettlementPostRecord } {
  if (statement.status !== 'signed') {
    throw new Error(`Settlement must be signed before posting; currently ${statement.status}`);
  }
  const post_record: SettlementPostRecord = { ...post, post_id: `post_${Date.now()}` };
  const updated_statement = transitionSettlementStatus(statement, 'posted', post.posted_by);
  return { updated_statement, post_record };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLE-504 — Tour closeout / profitability rollup
// ─────────────────────────────────────────────────────────────────────────────

export interface StopSettlementSummary {
  event_id: string;
  stop_label: string;
  settlement_status: SettlementStatus | 'no_settlement';
  gross_ticket_revenue_minor: number;
  artist_payment_minor: number;
  outstanding_items: string[];
  currency: string;
  has_stale_source: boolean;
}

export interface TourProfitabilityRollup {
  tour_id: string;
  currency: string;
  stops_total: number;
  stops_settled: number;
  stops_pending: number;
  stops_no_settlement: number;
  gross_ticket_revenue_minor: number;
  total_artist_payments_minor: number;
  total_committed_costs_minor: number;
  total_actual_costs_minor: number;
  net_margin_minor: number;
  net_margin_pct: number | null; // null when gross is 0
  outstanding_item_count: number;
  has_stale_sources: boolean;
  forecast_margin_minor: number | null; // null when any stop has no_settlement and no forecast
  computed_at: string;
}

export function buildTourProfitabilityRollup(params: {
  tour_id: string;
  currency: string;
  stop_summaries: StopSettlementSummary[];
  total_committed_costs_minor: number;
  total_actual_costs_minor: number;
  computed_at?: string;
}): TourProfitabilityRollup {
  const {
    tour_id,
    currency,
    stop_summaries,
    total_committed_costs_minor,
    total_actual_costs_minor,
    computed_at,
  } = params;

  const stops_total = stop_summaries.length;
  const stops_settled = stop_summaries.filter(
    s => s.settlement_status === 'posted' || s.settlement_status === 'closed',
  ).length;
  const stops_no_settlement = stop_summaries.filter(s => s.settlement_status === 'no_settlement').length;
  const stops_pending = stops_total - stops_settled - stops_no_settlement;

  const gross_ticket_revenue_minor = stop_summaries.reduce((s, st) => s + st.gross_ticket_revenue_minor, 0);
  const total_artist_payments_minor = stop_summaries.reduce((s, st) => s + st.artist_payment_minor, 0);
  const outstanding_item_count = stop_summaries.reduce((s, st) => s + st.outstanding_items.length, 0);
  const has_stale_sources = stop_summaries.some(s => s.has_stale_source);

  const net_margin_minor =
    gross_ticket_revenue_minor - total_artist_payments_minor - total_actual_costs_minor;
  const net_margin_pct =
    gross_ticket_revenue_minor > 0
      ? Math.round((net_margin_minor / gross_ticket_revenue_minor) * 10000) / 100
      : null;

  // Forecast: only available if all stops have settlements (even pending ones contribute estimates)
  const forecast_margin_minor =
    stops_no_settlement === 0
      ? gross_ticket_revenue_minor - total_artist_payments_minor - total_committed_costs_minor
      : null;

  return {
    tour_id,
    currency,
    stops_total,
    stops_settled,
    stops_pending,
    stops_no_settlement,
    gross_ticket_revenue_minor,
    total_artist_payments_minor,
    total_committed_costs_minor,
    total_actual_costs_minor,
    net_margin_minor,
    net_margin_pct,
    outstanding_item_count,
    has_stale_sources,
    forecast_margin_minor,
    computed_at: computed_at ?? new Date().toISOString(),
  };
}

export function summarizeSettlementReadiness(stop_summaries: StopSettlementSummary[]): {
  all_settled: boolean;
  blocking_count: number;
  warning_count: number;
  can_mark_tour_settled: boolean;
} {
  const blocking_count = stop_summaries.filter(
    s => s.settlement_status !== 'posted' && s.settlement_status !== 'closed' && s.settlement_status !== 'no_settlement',
  ).length;
  const warning_count = stop_summaries.filter(s => s.has_stale_source).length;
  const all_settled = blocking_count === 0;
  return {
    all_settled,
    blocking_count,
    warning_count,
    can_mark_tour_settled: all_settled && warning_count === 0,
  };
}
