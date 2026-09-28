import { describe, it, expect } from 'vitest';
import {
  previewVendorMerge,
  executeVendorMerge,
  searchVendors,
  verifyComplianceDocument,
  waiverComplianceDocument,
  isComplianceDocExpiringSoon,
  summarizeVendorCompliance,
  transitionEngagement,
  selectVendorForEngagement,
  publishRfp,
  awardRfp,
  getVisibleVendorIds,
  computeQuoteTotal,
  submitQuote,
  reviseQuote,
  scoreQuotesByPrice,
  recordQuoteDecision,
  buildVendorPerformanceAggregate,
  projectPerformanceReviewForSourcing,
  type VendorRecord,
  type ComplianceDocument,
  type ComplianceRequirement,
  type VendorEngagement,
  type RfpRecord,
  type VendorQuote,
  type PerformanceReview,
} from '../../lib/admin/vendor-domain';

function makeVendor(id: string, org = 'org_1'): VendorRecord {
  return {
    vendor_id: id, org_id: org, legal_name: `Vendor ${id}`, display_name: `V${id}`,
    categories: ['production'], status: 'approved', contacts: [], locations: [],
    compliance_summary: { has_open_issues: false }, alias_ids: [],
    created_by: 'u', created_at: '2026-07-23T00:00:00Z', updated_at: '2026-07-23T00:00:00Z',
  };
}

// ── VEND-501 ──────────────────────────────────────────────────────────────

describe('VEND-501 — Vendor master', () => {
  it('previewVendorMerge returns merge preview for same org', () => {
    const preview = previewVendorMerge(makeVendor('v1'), makeVendor('v2'));
    expect(preview.source_id).toBe('v1');
    expect(preview.alias_will_be_created).toBe(true);
  });

  it('previewVendorMerge throws for cross-org', () => {
    expect(() => previewVendorMerge(makeVendor('v1', 'org_1'), makeVendor('v2', 'org_2'))).toThrow(/cross/i);
  });

  it('executeVendorMerge merges categories and alias_ids', () => {
    const src = { ...makeVendor('v1'), categories: ['production', 'catering'] as any };
    const tgt = { ...makeVendor('v2'), categories: ['audio'] as any };
    const merged = executeVendorMerge(src, tgt);
    expect(merged.alias_ids).toContain('v1');
    expect(merged.categories).toContain('catering');
    expect(merged.categories).toContain('audio');
  });

  it('searchVendors filters by name', () => {
    const vendors = [makeVendor('v1'), { ...makeVendor('v2'), legal_name: 'Sound Co' }];
    const results = searchVendors(vendors, 'sound', {});
    expect(results).toHaveLength(1);
    expect(results[0].legal_name).toBe('Sound Co');
  });

  it('searchVendors filters by category', () => {
    const vendors = [makeVendor('v1'), { ...makeVendor('v2'), categories: ['catering'] as any }];
    const results = searchVendors(vendors, '', { categories: ['catering'] });
    expect(results).toHaveLength(1);
  });
});

// ── VEND-502 ──────────────────────────────────────────────────────────────

function makeDoc(status: ComplianceDocument['status'] = 'under_review'): ComplianceDocument {
  return {
    doc_id: 'd1', vendor_id: 'v1', requirement_id: 'req_1', status,
    expiry_date: '2027-01-01', scan_result: 'clean',
  };
}

const req: ComplianceRequirement = {
  requirement_id: 'req_1', vendor_category: 'production', doc_type: 'insurance',
  is_mandatory: true, expiry_warning_days: 30,
};

describe('VEND-502 — Compliance document workflow', () => {
  it('verifyComplianceDocument marks verified', () => {
    const doc = verifyComplianceDocument(makeDoc(), 'admin', '2026-07-24T00:00:00Z');
    expect(doc.status).toBe('verified');
    expect(doc.verified_by).toBe('admin');
  });

  it('verifyComplianceDocument throws if not under_review', () => {
    expect(() => verifyComplianceDocument(makeDoc('verified'), 'admin', '2026-07-24T00:00:00Z')).toThrow();
  });

  it('waiverComplianceDocument requires reason', () => {
    expect(() => waiverComplianceDocument(makeDoc('required'), '', 'approver')).toThrow(/reason/i);
  });

  it('waiverComplianceDocument sets status to waived', () => {
    const doc = waiverComplianceDocument(makeDoc('required'), 'jurisdiction exemption', 'approver');
    expect(doc.status).toBe('waived');
    expect(doc.waiver_approver).toBe('approver');
  });

  it('isComplianceDocExpiringSoon detects imminent expiry', () => {
    const doc = { ...makeDoc('verified' as const), expiry_date: '2026-08-15' };
    const reqShort = { ...req, expiry_warning_days: 60 };
    // Today is 2026-07-23, expiry is 2026-08-15 (23 days) < 60 days warning
    expect(isComplianceDocExpiringSoon(doc, reqShort, '2026-07-23')).toBe(true);
  });

  it('summarizeVendorCompliance detects missing mandatory', () => {
    const result = summarizeVendorCompliance([], [req]);
    expect(result.missing).toBe(1);
    expect(result.open_issues).toBe(true);
  });

  it('summarizeVendorCompliance counts verified and waived as covered', () => {
    const doc = { ...makeDoc('verified' as const) };
    const result = summarizeVendorCompliance([doc], [req]);
    expect(result.missing).toBe(0);
    expect(result.verified).toBe(1);
  });
});

// ── VEND-503 ──────────────────────────────────────────────────────────────

function makeEngagement(status: VendorEngagement['status'] = 'requested'): VendorEngagement {
  return {
    engagement_id: 'eng_1', org_id: 'org_1', tour_id: 'tour_1',
    domain: 'audio', scope_description: 'PA system', deliverables: ['pa_system'],
    required_by_date: '2026-09-01', owner_user_id: 'u', status,
    sourcing_method: 'rfp', invoice_ids: [],
    created_at: '2026-07-23T00:00:00Z', updated_at: '2026-07-23T00:00:00Z',
  };
}

describe('VEND-503 — Engagement workflow', () => {
  it('transitions engagement to sourcing', () => {
    const eng = transitionEngagement(makeEngagement('requested'), 'sourcing');
    expect(eng.status).toBe('sourcing');
  });

  it('blocks invalid transition', () => {
    expect(() => transitionEngagement(makeEngagement('requested'), 'delivered')).toThrow();
  });

  it('selectVendorForEngagement sets vendor_id and transitions to selected', () => {
    const eng = selectVendorForEngagement(makeEngagement('sourcing'), 'v1');
    expect(eng.vendor_id).toBe('v1');
    expect(eng.status).toBe('selected');
  });

  it('selectVendorForEngagement requires sourcing status', () => {
    expect(() => selectVendorForEngagement(makeEngagement('requested'), 'v1')).toThrow();
  });
});

// ── VEND-504 ──────────────────────────────────────────────────────────────

function makeRfp(status: RfpRecord['status'] = 'draft'): RfpRecord {
  return {
    rfp_id: 'rfp_1', engagement_id: 'eng_1', org_id: 'org_1', status,
    requirement_package_version: 1,
    invited_vendors: [{ vendor_id: 'v1', invited_at: '2026-07-23T00:00:00Z' }],
    question_deadline: '2026-08-01T00:00:00Z', submission_deadline: '2026-08-15T00:00:00Z',
    timezone: 'America/New_York', anonymous_bids: true,
    created_by: 'u', created_at: '2026-07-23T00:00:00Z',
  };
}

describe('VEND-504 — RFP/invitation', () => {
  it('publishRfp transitions draft to published', () => {
    const rfp = publishRfp(makeRfp());
    expect(rfp.status).toBe('published');
  });

  it('publishRfp requires at least one invited vendor', () => {
    const rfp = { ...makeRfp(), invited_vendors: [] };
    expect(() => publishRfp(rfp)).toThrow();
  });

  it('awardRfp awards to an invited vendor', () => {
    const rfp = awardRfp({ ...makeRfp('closed' as const) }, 'v1');
    expect(rfp.awarded_vendor_id).toBe('v1');
    expect(rfp.status).toBe('awarded');
  });

  it('awardRfp blocks non-invited vendor', () => {
    expect(() => awardRfp({ ...makeRfp('closed' as const) }, 'unknown_vendor')).toThrow();
  });

  it('getVisibleVendorIds hides other vendors (enumeration ban)', () => {
    const rfp = { ...makeRfp(), invited_vendors: [{ vendor_id: 'v1', invited_at: '2026-07-23T00:00:00Z' }, { vendor_id: 'v2', invited_at: '2026-07-23T00:00:00Z' }] };
    const visible = getVisibleVendorIds(rfp, 'v1');
    expect(visible).not.toContain('v2');
  });
});

// ── VEND-505 ──────────────────────────────────────────────────────────────

function makeQuote(): VendorQuote {
  return {
    quote_id: 'q1', rfp_id: 'rfp_1', vendor_id: 'v1', version_number: 1,
    lines: [{ line_id: 'l1', description: 'PA', quantity: 2, unit_cost_minor: 500_00, currency: 'USD', tax_rate_pct: 10 }],
    assumptions: [], exclusions: [], validity_days: 30, is_submitted: false,
  };
}

describe('VEND-505 — Quote submission/versioning', () => {
  it('computeQuoteTotal sums lines with tax', () => {
    const total = computeQuoteTotal(makeQuote());
    expect(total.subtotal_minor).toBe(100000); // 2 * 50000
    expect(total.tax_minor).toBe(10000); // 10%
    expect(total.total_minor).toBe(110000);
  });

  it('submitQuote marks quote as submitted', () => {
    const q = submitQuote(makeQuote(), '2026-07-23T12:00:00Z');
    expect(q.is_submitted).toBe(true);
  });

  it('submitQuote throws on empty lines', () => {
    expect(() => submitQuote({ ...makeQuote(), lines: [] }, '2026-07-23T00:00:00Z')).toThrow();
  });

  it('reviseQuote creates new version and marks old as superseded', () => {
    const submitted = submitQuote(makeQuote(), '2026-07-23T00:00:00Z');
    const { old_quote, new_quote } = reviseQuote(submitted, [
      { line_id: 'l2', description: 'PA v2', quantity: 1, unit_cost_minor: 600_00, currency: 'USD', tax_rate_pct: 10 },
    ]);
    expect(old_quote.superseded_by_quote_id).toBe(new_quote.quote_id);
    expect(new_quote.version_number).toBe(2);
    expect(new_quote.is_submitted).toBe(false);
  });
});

// ── VEND-506 ──────────────────────────────────────────────────────────────

describe('VEND-506 — Quote comparison/decision', () => {
  const q1: VendorQuote = { ...makeQuote(), vendor_id: 'v1' };
  const q2: VendorQuote = {
    ...makeQuote(), quote_id: 'q2', vendor_id: 'v2',
    lines: [{ line_id: 'l2', description: 'PA', quantity: 2, unit_cost_minor: 600_00, currency: 'USD', tax_rate_pct: 10 }],
    is_submitted: false,
  };

  it('scoreQuotesByPrice gives 100 to cheapest', () => {
    const scores = scoreQuotesByPrice([q1, q2]);
    const s1 = scores.find(s => s.quote_id === 'q1')!;
    expect(s1.price_score).toBe(100);
  });

  it('recordQuoteDecision requires reason', () => {
    const scores = scoreQuotesByPrice([q1, q2]);
    expect(() => recordQuoteDecision('rfp_1', 'q1', 'u', '2026-07-23T00:00:00Z', '', scores)).toThrow(/reason/i);
  });

  it('recordQuoteDecision blocks conflicted reviewer for selected quote', () => {
    const scores = scoreQuotesByPrice([q1, q2]).map(s => s.quote_id === 'q1' ? { ...s, conflict_of_interest_declared: true } : s);
    expect(() => recordQuoteDecision('rfp_1', 'q1', 'u', '2026-07-23T00:00:00Z', 'Best value', scores)).toThrow(/conflict/i);
  });

  it('recordQuoteDecision succeeds without conflict', () => {
    const scores = scoreQuotesByPrice([q1, q2]);
    const decision = recordQuoteDecision('rfp_1', 'q1', 'u', '2026-07-23T00:00:00Z', 'Best value', scores);
    expect(decision.selected_quote_id).toBe('q1');
  });
});

// ── VEND-507 ──────────────────────────────────────────────────────────────

function makeReview(is_approved = true): PerformanceReview {
  return {
    review_id: 'r1', vendor_id: 'v1', engagement_id: 'eng_1',
    reviewer_user_id: 'u', reviewed_at: '2026-07-23T00:00:00Z',
    timeliness_rating: 4, quality_rating: 5, communication_rating: 3,
    compliance_issues: 0, incident_count: 0, cost_variance_pct: 2.5,
    reviewer_notes: 'Excellent work — internal only',
    is_approved,
  };
}

describe('VEND-507 — Vendor performance closeout', () => {
  it('buildVendorPerformanceAggregate returns null for no approved reviews', () => {
    expect(buildVendorPerformanceAggregate([makeReview(false)])).toBeNull();
  });

  it('buildVendorPerformanceAggregate computes averages', () => {
    const agg = buildVendorPerformanceAggregate([makeReview(), makeReview()])!;
    expect(agg.review_count).toBe(2);
    expect(agg.avg_timeliness).toBe(4);
    expect(agg.avg_quality).toBe(5);
  });

  it('projectPerformanceReviewForSourcing strips reviewer_notes', () => {
    const projected = projectPerformanceReviewForSourcing(makeReview());
    expect('reviewer_notes' in projected).toBe(false);
  });
});
