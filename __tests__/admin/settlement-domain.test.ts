import { describe, it, expect } from 'vitest';
import {
  createDealTemplateVersion,
  approveDealTemplateVersion,
  validateDealTemplate,
  computeDealFormula,
  createSettlementStatement,
  addSettlementLine,
  addSettlementAdjustment,
  transitionSettlementStatus,
  computeSettlementNetPayable,
  markTicketSourceStale,
  recordSettlementApproval,
  recordCounterpartySignoff,
  postSettlementActuals,
  buildTourProfitabilityRollup,
  summarizeSettlementReadiness,
  type DealTemplateVersion,
  type SettlementStatement,
} from '../../lib/admin/settlement-domain';

// ── SETTLE-501 ──────────────────────────────────────────────────────────────

describe('SETTLE-501 — Deal template versions', () => {
  const base: Omit<DealTemplateVersion, 'version_id' | 'version_number' | 'is_draft' | 'is_approved' | 'created_at'> = {
    deal_type: 'guarantee',
    clauses: [],
    guarantee_amount_minor: 50000_00,
    guarantee_currency: 'USD',
    created_by: 'user_1',
  };

  it('creates first version with number=1, is_draft=true', () => {
    const v = createDealTemplateVersion({ ...base, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    expect(v.version_number).toBe(1);
    expect(v.is_draft).toBe(true);
    expect(v.is_approved).toBe(false);
  });

  it('increments version number', () => {
    const v1 = createDealTemplateVersion({ ...base, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    const v2 = createDealTemplateVersion({ ...base, previous_versions: [v1], created_at: '2026-07-23T01:00:00Z' });
    expect(v2.version_number).toBe(2);
  });

  it('approves a draft version', () => {
    const v = createDealTemplateVersion({ ...base, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    const approved = approveDealTemplateVersion(v, 'approver_1', '2026-07-24T00:00:00Z');
    expect(approved.is_approved).toBe(true);
    expect(approved.is_draft).toBe(false);
    expect(approved.approved_by).toBe('approver_1');
  });

  it('approveDealTemplateVersion is idempotent', () => {
    const v = createDealTemplateVersion({ ...base, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    const a = approveDealTemplateVersion(v, 'approver_1', '2026-07-24T00:00:00Z');
    const a2 = approveDealTemplateVersion(a, 'approver_2', '2026-07-25T00:00:00Z');
    // idempotent — does not change once approved
    expect(a2.approved_by).toBe('approver_1');
  });
});

describe('SETTLE-501 — validateDealTemplate', () => {
  it('requires created_by', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'flat_fee',
      clauses: [], is_draft: true, is_approved: false, created_by: '', created_at: '2026-07-23T00:00:00Z',
    };
    expect(validateDealTemplate(v)).toContain('created_by is required');
  });

  it('requires percentage_of_gross for percentage deal', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'percentage',
      clauses: [], is_draft: true, is_approved: false, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
    };
    expect(validateDealTemplate(v)).toContain('percentage_of_gross required for percentage deal');
  });

  it('validates split percentages sum to 100', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'split',
      clauses: [], is_draft: true, is_approved: false, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
      split_percentages: [{ party: 'artist', percentage: 60 }, { party: 'promoter', percentage: 30 }],
    };
    expect(validateDealTemplate(v)).toContain('split_percentages must sum to 100');
  });

  it('passes valid versus deal', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'versus',
      clauses: [], is_draft: true, is_approved: false, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
      guarantee_amount_minor: 50000_00, percentage_of_gross: 85,
    };
    expect(validateDealTemplate(v)).toHaveLength(0);
  });
});

describe('SETTLE-501 — computeDealFormula', () => {
  it('returns guarantee amount for guarantee deal', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'guarantee', guarantee_amount_minor: 75000_00,
      clauses: [], is_draft: false, is_approved: true, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
    };
    const result = computeDealFormula(v, 200000_00, 30000_00);
    expect(result.artist_payment_minor).toBe(75000_00);
  });

  it('computes versus: max(guarantee, pct of net)', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'versus',
      guarantee_amount_minor: 50000_00, percentage_of_gross: 90,
      clauses: [], is_draft: false, is_approved: true, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
    };
    // net = 200000_00 - 20000_00 = 180000_00; 90% of net = 162000_00 > 50000_00
    const result = computeDealFormula(v, 200000_00, 20000_00);
    expect(result.artist_payment_minor).toBe(162000_00);
  });

  it('applies bonus threshold', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'guarantee', guarantee_amount_minor: 50000_00,
      bonus_thresholds: [{ gross_above_minor: 100000_00, bonus_minor: 10000_00, currency: 'USD' }],
      clauses: [], is_draft: false, is_approved: true, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
    };
    const result = computeDealFormula(v, 150000_00, 0);
    expect(result.artist_payment_minor).toBe(60000_00);
  });

  it('caps promoter expenses', () => {
    const v: DealTemplateVersion = {
      version_id: 'v1', version_number: 1, deal_type: 'versus',
      guarantee_amount_minor: 10000_00, percentage_of_gross: 85,
      promoter_expense_cap_minor: 5000_00,
      clauses: [], is_draft: false, is_approved: true, created_by: 'u', created_at: '2026-07-23T00:00:00Z',
    };
    const result = computeDealFormula(v, 100000_00, 20000_00); // expenses capped at 5000_00
    expect(result.deductions).toBe(5000_00);
  });
});

// ── SETTLE-502 ──────────────────────────────────────────────────────────────

function makeStatement(): SettlementStatement {
  return createSettlementStatement({
    org_id: 'org_1', tour_id: 'tour_1', event_id: 'ev_1',
    deal_template_version_id: 'dtv_1',
    lines: [], adjustments: [],
    gross_ticket_revenue_minor: 100000_00, currency: 'USD',
    artist_payment_minor: 85000_00, formula_summary: 'Versus',
    is_ticket_source_stale: false, created_by: 'u',
    created_at: '2026-07-23T00:00:00Z',
  });
}

describe('SETTLE-502 — Settlement statement workspace', () => {
  it('creates statement in draft', () => {
    const s = makeStatement();
    expect(s.status).toBe('draft');
    expect(s.version_number).toBe(1);
  });

  it('adds a line in draft status', () => {
    const s = addSettlementLine(makeStatement(), {
      category: 'deduction', label: 'Venue rental', amount_minor: 10000_00, currency: 'USD',
      source_type: 'deduction', is_contested: false,
    });
    expect(s.lines).toHaveLength(1);
  });

  it('throws on adding line when approved', () => {
    let s = makeStatement();
    s = transitionSettlementStatus(s, 'in_review', 'u');
    s = transitionSettlementStatus(s, 'pending_approval', 'u');
    s = transitionSettlementStatus(s, 'approved', 'u');
    expect(() => addSettlementLine(s, {
      category: 'deduction', label: 'X', amount_minor: 1, currency: 'USD',
      source_type: 'deduction', is_contested: false,
    })).toThrow();
  });

  it('blocks adjustment in posted status', () => {
    let s = makeStatement();
    s = { ...s, status: 'posted' };
    expect(() => addSettlementAdjustment(s, {
      label: 'Adj', amount_minor: 100, currency: 'USD', reason: 'reason',
      added_by: 'u', added_at: '2026-07-23T00:00:00Z',
    })).toThrow();
  });

  it('blocks invalid status transitions', () => {
    const s = makeStatement();
    expect(() => transitionSettlementStatus(s, 'posted', 'u')).toThrow();
  });

  it('marks ticket source as stale', () => {
    const s = markTicketSourceStale(makeStatement());
    expect(s.is_ticket_source_stale).toBe(true);
  });

  it('computeSettlementNetPayable sums approved adjustments', () => {
    let s = makeStatement();
    s = addSettlementAdjustment(s, {
      label: 'Bonus', amount_minor: 5000_00, currency: 'USD', reason: 'r', added_by: 'u', added_at: '2026-07-23T00:00:00Z',
    });
    s = { ...s, adjustments: s.adjustments.map(a => ({ ...a, is_approved: true })) };
    const result = computeSettlementNetPayable(s);
    expect(result.net_payable).toBe(90000_00); // 85000 + 5000
    expect(result.approved_adjustments).toBe(5000_00);
  });
});

// ── SETTLE-503 ──────────────────────────────────────────────────────────────

describe('SETTLE-503 — Settlement approval and signoff', () => {
  it('recordSettlementApproval requires pending_approval status', () => {
    const s = makeStatement();
    expect(() => recordSettlementApproval(s, {
      statement_id: s.statement_id, approved_by: 'fin', approved_at: '2026-07-23T00:00:00Z', role: 'finance',
    })).toThrow(/pending_approval/);
  });

  it('records approval when status is pending_approval', () => {
    let s = makeStatement();
    s = transitionSettlementStatus(s, 'in_review', 'u');
    s = transitionSettlementStatus(s, 'pending_approval', 'u');
    const appr = recordSettlementApproval(s, {
      statement_id: s.statement_id, approved_by: 'fin', approved_at: '2026-07-23T00:00:00Z', role: 'finance',
    });
    expect(appr.approval_id).toMatch(/^appr_/);
  });

  it('recordCounterpartySignoff requires counterparty_review status', () => {
    const s = makeStatement();
    expect(() => recordCounterpartySignoff(s, {
      statement_id: s.statement_id, signatory: 'promoter', signed_at: '2026-07-23T00:00:00Z',
      method: 'manual_upload',
    })).toThrow(/counterparty_review/);
  });

  it('postSettlementActuals requires signed status', () => {
    const s = makeStatement();
    expect(() => postSettlementActuals(s, {
      statement_id: s.statement_id, posted_by: 'u', posted_at: '2026-07-23T00:00:00Z',
      finance_record_ids: [], variance_minor: 0, variance_currency: 'USD',
    })).toThrow(/signed/);
  });

  it('posts settlement actuals and transitions to posted', () => {
    let s = makeStatement();
    s = { ...s, status: 'signed' };
    const { updated_statement, post_record } = postSettlementActuals(s, {
      statement_id: s.statement_id, posted_by: 'u', posted_at: '2026-07-23T00:00:00Z',
      finance_record_ids: ['fin_1'], variance_minor: 100, variance_currency: 'USD',
    });
    expect(updated_statement.status).toBe('posted');
    expect(post_record.post_id).toMatch(/^post_/);
  });
});

// ── SETTLE-504 ──────────────────────────────────────────────────────────────

describe('SETTLE-504 — Tour profitability rollup', () => {
  const stops = [
    { event_id: 'ev_1', stop_label: 'LA', settlement_status: 'posted' as const, gross_ticket_revenue_minor: 100000_00, artist_payment_minor: 80000_00, outstanding_items: [], currency: 'USD', has_stale_source: false },
    { event_id: 'ev_2', stop_label: 'NYC', settlement_status: 'draft' as const, gross_ticket_revenue_minor: 120000_00, artist_payment_minor: 100000_00, outstanding_items: ['contract_missing'], currency: 'USD', has_stale_source: false },
  ];

  it('computes basic rollup', () => {
    const rollup = buildTourProfitabilityRollup({
      tour_id: 'tour_1', currency: 'USD', stop_summaries: stops,
      total_committed_costs_minor: 30000_00, total_actual_costs_minor: 25000_00,
      computed_at: '2026-07-23T00:00:00Z',
    });
    expect(rollup.stops_total).toBe(2);
    expect(rollup.stops_settled).toBe(1);
    expect(rollup.stops_pending).toBe(1);
    expect(rollup.gross_ticket_revenue_minor).toBe(220000_00);
    expect(rollup.total_artist_payments_minor).toBe(180000_00);
    expect(rollup.outstanding_item_count).toBe(1);
  });

  it('computes net margin pct', () => {
    const rollup = buildTourProfitabilityRollup({
      tour_id: 'tour_1', currency: 'USD', stop_summaries: stops,
      total_committed_costs_minor: 30000_00, total_actual_costs_minor: 25000_00,
    });
    // net = 220000 - 180000 - 25000 = 15000; pct = 15000/220000 ≈ 6.82
    expect(rollup.net_margin_pct).not.toBeNull();
  });

  it('returns null net_margin_pct when gross is 0', () => {
    const zeroStops = [
      { event_id: 'ev_1', stop_label: 'X', settlement_status: 'no_settlement' as const, gross_ticket_revenue_minor: 0, artist_payment_minor: 0, outstanding_items: [], currency: 'USD', has_stale_source: false },
    ];
    const rollup = buildTourProfitabilityRollup({
      tour_id: 'tour_1', currency: 'USD', stop_summaries: zeroStops,
      total_committed_costs_minor: 0, total_actual_costs_minor: 0,
    });
    expect(rollup.net_margin_pct).toBeNull();
  });

  it('forecast_margin_minor is null when any stop has no_settlement', () => {
    const stops2 = [
      ...stops,
      { event_id: 'ev_3', stop_label: 'CHI', settlement_status: 'no_settlement' as const, gross_ticket_revenue_minor: 0, artist_payment_minor: 0, outstanding_items: [], currency: 'USD', has_stale_source: false },
    ];
    const rollup = buildTourProfitabilityRollup({
      tour_id: 'tour_1', currency: 'USD', stop_summaries: stops2,
      total_committed_costs_minor: 0, total_actual_costs_minor: 0,
    });
    expect(rollup.forecast_margin_minor).toBeNull();
  });

  it('summarizeSettlementReadiness reports blocking and warning counts', () => {
    const result = summarizeSettlementReadiness(stops);
    expect(result.blocking_count).toBe(1); // draft not settled
    expect(result.all_settled).toBe(false);
    expect(result.can_mark_tour_settled).toBe(false);
  });

  it('can_mark_tour_settled is true when all settled and no stale', () => {
    const allDone = stops.map(s => ({ ...s, settlement_status: 'posted' as const }));
    const result = summarizeSettlementReadiness(allDone);
    expect(result.can_mark_tour_settled).toBe(true);
  });
});
