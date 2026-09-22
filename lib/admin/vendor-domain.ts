/**
 * vendor-domain.ts — VEND-501..507
 *
 * Pure domain logic for vendor master, compliance, engagements, RFP/quotes,
 * comparison, and performance closeout.
 *  VEND-501: Vendor master (search/create/edit/merge)
 *  VEND-502: Compliance document workflow
 *  VEND-503: Requirement/engagement workflow
 *  VEND-504: RFP/invitation flow
 *  VEND-505: Quote submission/versioning
 *  VEND-506: Quote comparison/decision
 *  VEND-507: Vendor performance closeout
 *
 * No Supabase imports. No mocks. Pure domain logic only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// VEND-501 — Vendor master
// ─────────────────────────────────────────────────────────────────────────────

export type VendorStatus = 'prospective' | 'invited' | 'evaluating' | 'approved' | 'preferred' | 'restricted' | 'inactive';

export type VendorCategory =
  | 'production' | 'audio' | 'lighting' | 'video' | 'staging' | 'ground_transport'
  | 'air_travel' | 'lodging' | 'catering' | 'security' | 'marketing' | 'legal'
  | 'accounting' | 'staffing' | 'equipment_rental' | 'merchandise' | 'other';

export interface VendorContact {
  contact_id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

export interface VendorSensitiveData {
  tax_id?: string; // protected field
  payment_reference?: string; // protected field
  bank_account_hint?: string; // protected — display hint only, no full acct
}

export interface VendorRecord {
  vendor_id: string;
  org_id: string;
  legal_name: string;
  display_name: string;
  categories: VendorCategory[];
  status: VendorStatus;
  contacts: VendorContact[];
  locations: { city: string; country_code: string }[];
  risk_score?: 'low' | 'medium' | 'high';
  compliance_summary: { has_open_issues: boolean; next_expiry?: string };
  sensitive?: VendorSensitiveData; // only present when caller has can_vendor.sensitive
  external_accounting_id?: string;
  alias_ids: string[]; // merged-from vendor IDs
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VendorMergePreview {
  source_id: string;
  target_id: string;
  engagements_to_reparent: number;
  contracts_to_reparent: number;
  alias_will_be_created: boolean;
}

export function previewVendorMerge(source: VendorRecord, target: VendorRecord): VendorMergePreview {
  if (source.org_id !== target.org_id) {
    throw new Error('Cannot merge vendors across organizations');
  }
  return {
    source_id: source.vendor_id,
    target_id: target.vendor_id,
    engagements_to_reparent: 0, // caller provides actual count from DB
    contracts_to_reparent: 0,
    alias_will_be_created: true,
  };
}

export function executeVendorMerge(source: VendorRecord, target: VendorRecord): VendorRecord {
  if (source.org_id !== target.org_id) throw new Error('Cannot merge vendors across organizations');
  return {
    ...target,
    alias_ids: [...new Set([...target.alias_ids, source.vendor_id, ...source.alias_ids])],
    categories: [...new Set([...target.categories, ...source.categories])],
    updated_at: new Date().toISOString(),
  };
}

export function searchVendors(
  vendors: VendorRecord[],
  query: string,
  filters: { categories?: VendorCategory[]; statuses?: VendorStatus[] },
): VendorRecord[] {
  const q = query.toLowerCase().trim();
  return vendors.filter(v => {
    const nameMatch = !q || v.legal_name.toLowerCase().includes(q) || v.display_name.toLowerCase().includes(q);
    const catMatch = !filters.categories?.length || filters.categories.some(c => v.categories.includes(c));
    const statusMatch = !filters.statuses?.length || filters.statuses.includes(v.status);
    return nameMatch && catMatch && statusMatch;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-502 — Compliance document workflow
// ─────────────────────────────────────────────────────────────────────────────

export type ComplianceDocStatus = 'required' | 'pending_upload' | 'under_review' | 'verified' | 'expired' | 'waived' | 'rejected';

export interface ComplianceRequirement {
  requirement_id: string;
  vendor_category: VendorCategory;
  doc_type: string;
  jurisdiction?: string;
  is_mandatory: boolean;
  expiry_warning_days: number;
}

export interface ComplianceDocument {
  doc_id: string;
  vendor_id: string;
  requirement_id: string;
  status: ComplianceDocStatus;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
  issue_date?: string;
  expiry_date?: string;
  waiver_reason?: string;
  waiver_approver?: string;
  rejection_reason?: string;
  scan_result?: 'clean' | 'flagged' | 'pending';
  file_ref?: string; // token — never raw URL
}

export function verifyComplianceDocument(doc: ComplianceDocument, verifier: string, verified_at: string): ComplianceDocument {
  if (doc.status !== 'under_review') throw new Error(`Can only verify documents under_review; currently ${doc.status}`);
  return { ...doc, status: 'verified', verified_by: verifier, verified_at };
}

export function waiverComplianceDocument(doc: ComplianceDocument, reason: string, approver: string): ComplianceDocument {
  if (!reason.trim()) throw new Error('Waiver reason is required');
  return { ...doc, status: 'waived', waiver_reason: reason, waiver_approver: approver };
}

export function isComplianceDocExpiringSoon(doc: ComplianceDocument, req: ComplianceRequirement, today: string): boolean {
  if (!doc.expiry_date || doc.status !== 'verified') return false;
  const expiryMs = new Date(doc.expiry_date).getTime();
  const todayMs = new Date(today).getTime();
  const warnMs = req.expiry_warning_days * 24 * 60 * 60 * 1000;
  return expiryMs - todayMs <= warnMs;
}

export function summarizeVendorCompliance(docs: ComplianceDocument[], reqs: ComplianceRequirement[]): {
  total: number;
  verified: number;
  expiring_soon: number;
  open_issues: boolean;
  missing: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const mandatory = reqs.filter(r => r.is_mandatory);
  const verified = docs.filter(d => d.status === 'verified').length;
  const expiring_soon = docs.filter(d => {
    const req = reqs.find(r => r.requirement_id === d.requirement_id);
    return req ? isComplianceDocExpiringSoon(d, req, today) : false;
  }).length;
  const covered_req_ids = new Set(docs.filter(d => ['verified', 'waived'].includes(d.status)).map(d => d.requirement_id));
  const missing = mandatory.filter(r => !covered_req_ids.has(r.requirement_id)).length;
  return {
    total: reqs.length,
    verified,
    expiring_soon,
    open_issues: missing > 0 || docs.some(d => d.status === 'rejected') || expiring_soon > 0,
    missing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-503 — Requirement/engagement workflow
// ─────────────────────────────────────────────────────────────────────────────

export type EngagementStatus =
  | 'requested' | 'sourcing' | 'selected' | 'contracting'
  | 'ordered' | 'active' | 'delivered' | 'invoiced' | 'closed' | 'cancelled';

export const ENGAGEMENT_STATUS_TRANSITIONS: Record<EngagementStatus, EngagementStatus[]> = {
  requested: ['sourcing', 'cancelled'],
  sourcing: ['selected', 'cancelled'],
  selected: ['contracting', 'cancelled'],
  contracting: ['ordered', 'cancelled'],
  ordered: ['active', 'cancelled'],
  active: ['delivered', 'cancelled'],
  delivered: ['invoiced'],
  invoiced: ['closed'],
  closed: [],
  cancelled: [],
};

export interface VendorEngagement {
  engagement_id: string;
  org_id: string;
  tour_id: string;
  event_id?: string;
  stop_id?: string;
  vendor_id?: string; // null until selected
  domain: string;
  scope_description: string;
  deliverables: string[];
  required_by_date: string;
  owner_user_id: string;
  status: EngagementStatus;
  sourcing_method: 'direct' | 'rfp' | 'existing_contract';
  budget_minor?: number;
  budget_currency?: string;
  contract_id?: string;
  po_id?: string;
  invoice_ids: string[];
  created_at: string;
  updated_at: string;
}

export function transitionEngagement(
  eng: VendorEngagement,
  to: EngagementStatus,
): VendorEngagement {
  const allowed = ENGAGEMENT_STATUS_TRANSITIONS[eng.status];
  if (!allowed.includes(to)) throw new Error(`Invalid engagement transition: ${eng.status} → ${to}`);
  return { ...eng, status: to, updated_at: new Date().toISOString() };
}

export function selectVendorForEngagement(eng: VendorEngagement, vendor_id: string): VendorEngagement {
  if (eng.status !== 'sourcing') throw new Error('Vendor can only be selected during sourcing');
  return transitionEngagement({ ...eng, vendor_id }, 'selected');
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-504 — RFP/invitation flow
// ─────────────────────────────────────────────────────────────────────────────

export type RfpStatus = 'draft' | 'published' | 'question_period' | 'closed' | 'awarded' | 'cancelled';

export interface RfpInvite {
  vendor_id: string;
  invited_at: string;
  accepted?: boolean;
  declined_reason?: string;
}

export interface RfpRecord {
  rfp_id: string;
  engagement_id: string;
  org_id: string;
  status: RfpStatus;
  requirement_package_version: number;
  invited_vendors: RfpInvite[];
  question_deadline: string;
  submission_deadline: string;
  timezone: string;
  anonymous_bids: boolean;
  awarded_vendor_id?: string;
  cancelled_reason?: string;
  created_by: string;
  created_at: string;
}

export function publishRfp(rfp: RfpRecord): RfpRecord {
  if (rfp.status !== 'draft') throw new Error(`RFP must be draft to publish; currently ${rfp.status}`);
  if (!rfp.invited_vendors.length) throw new Error('RFP must have at least one invited vendor');
  return { ...rfp, status: 'published' };
}

export function awardRfp(rfp: RfpRecord, vendor_id: string): RfpRecord {
  if (rfp.status !== 'closed') throw new Error(`RFP must be closed to award; currently ${rfp.status}`);
  const invited = rfp.invited_vendors.some(v => v.vendor_id === vendor_id);
  if (!invited) throw new Error('Awarded vendor must be an invited vendor');
  return { ...rfp, status: 'awarded', awarded_vendor_id: vendor_id };
}

export function getVisibleVendorIds(rfp: RfpRecord, requesting_vendor_id: string): string[] {
  // Vendors cannot see other invited vendors (enumeration ban)
  if (rfp.anonymous_bids) return [requesting_vendor_id];
  // Only org admins see full list — in pure domain model we return requesting vendor only
  return [requesting_vendor_id];
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-505 — Quote submission/versioning
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteLine {
  line_id: string;
  description: string;
  quantity: number;
  unit_cost_minor: number;
  currency: string;
  tax_rate_pct: number;
  notes?: string;
}

export interface VendorQuote {
  quote_id: string;
  rfp_id: string;
  vendor_id: string;
  version_number: number;
  lines: QuoteLine[];
  assumptions: string[];
  exclusions: string[];
  validity_days: number;
  submitted_at?: string;
  superseded_by_quote_id?: string;
  is_submitted: boolean;
}

export function computeQuoteTotal(quote: VendorQuote): {
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  currency: string;
} {
  if (!quote.lines.length) return { subtotal_minor: 0, tax_minor: 0, total_minor: 0, currency: 'USD' };
  const currency = quote.lines[0].currency;
  let subtotal = 0, tax = 0;
  for (const line of quote.lines) {
    const lineTotal = line.quantity * line.unit_cost_minor;
    subtotal += lineTotal;
    tax += Math.round(lineTotal * line.tax_rate_pct / 100);
  }
  return { subtotal_minor: subtotal, tax_minor: tax, total_minor: subtotal + tax, currency };
}

export function submitQuote(quote: VendorQuote, submitted_at: string): VendorQuote {
  if (quote.is_submitted) throw new Error('Quote already submitted');
  if (!quote.lines.length) throw new Error('Quote must have at least one line item');
  return { ...quote, is_submitted: true, submitted_at };
}

export function reviseQuote(quote: VendorQuote, new_lines: QuoteLine[]): { old_quote: VendorQuote; new_quote: VendorQuote } {
  if (!quote.is_submitted) throw new Error('Can only revise a submitted quote');
  const new_quote: VendorQuote = {
    ...quote,
    quote_id: `q_${Date.now()}`,
    version_number: quote.version_number + 1,
    lines: new_lines,
    is_submitted: false,
    submitted_at: undefined,
    superseded_by_quote_id: undefined,
  };
  const old_quote = { ...quote, superseded_by_quote_id: new_quote.quote_id };
  return { old_quote, new_quote };
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-506 — Quote comparison/decision
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteScore {
  quote_id: string;
  vendor_id: string;
  price_score: number; // 0–100, higher = better value
  non_price_score?: number;
  reviewer_notes?: string;
  conflict_of_interest_declared: boolean;
  decision_reason?: string;
}

export interface QuoteDecision {
  decision_id: string;
  rfp_id: string;
  selected_quote_id: string;
  decided_by: string;
  decided_at: string;
  decision_reason: string;
  scores: QuoteScore[];
}

export function normalizeQuoteTotals(quotes: VendorQuote[]): { quote_id: string; total_minor: number; currency: string }[] {
  return quotes.map(q => ({ quote_id: q.quote_id, ...computeQuoteTotal(q) }));
}

export function scoreQuotesByPrice(quotes: VendorQuote[]): QuoteScore[] {
  const totals = normalizeQuoteTotals(quotes);
  const minTotal = Math.min(...totals.map(t => t.total_minor));
  return totals.map(t => ({
    quote_id: t.quote_id,
    vendor_id: quotes.find(q => q.quote_id === t.quote_id)!.vendor_id,
    price_score: minTotal === 0 ? 0 : Math.round((minTotal / t.total_minor) * 100),
    conflict_of_interest_declared: false,
  }));
}

export function recordQuoteDecision(
  rfp_id: string,
  selected_quote_id: string,
  decided_by: string,
  decided_at: string,
  decision_reason: string,
  scores: QuoteScore[],
): QuoteDecision {
  if (!decision_reason.trim()) throw new Error('Decision reason is required');
  const conflicted = scores.filter(s => s.conflict_of_interest_declared && s.quote_id === selected_quote_id);
  if (conflicted.length > 0) throw new Error('Selected quote reviewer declared conflict of interest');
  return {
    decision_id: `dec_${Date.now()}`,
    rfp_id,
    selected_quote_id,
    decided_by,
    decided_at,
    decision_reason,
    scores,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VEND-507 — Vendor performance closeout
// ─────────────────────────────────────────────────────────────────────────────

export type PerformanceRating = 1 | 2 | 3 | 4 | 5;

export interface PerformanceReview {
  review_id: string;
  vendor_id: string;
  engagement_id: string;
  reviewer_user_id: string;
  reviewed_at: string;
  timeliness_rating: PerformanceRating;
  quality_rating: PerformanceRating;
  communication_rating: PerformanceRating;
  compliance_issues: number;
  incident_count: number;
  cost_variance_pct: number; // actual vs contracted cost
  reviewer_notes?: string; // internal — not exposed in aggregates
  vendor_response?: string;
  is_approved: boolean;
}

export interface VendorPerformanceAggregate {
  vendor_id: string;
  review_count: number;
  avg_timeliness: number;
  avg_quality: number;
  avg_communication: number;
  avg_overall: number;
  total_compliance_issues: number;
  total_incidents: number;
  avg_cost_variance_pct: number;
}

export function buildVendorPerformanceAggregate(reviews: PerformanceReview[]): VendorPerformanceAggregate | null {
  const approved = reviews.filter(r => r.is_approved);
  if (!approved.length) return null;
  const n = approved.length;
  const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / n) * 100) / 100;
  return {
    vendor_id: approved[0].vendor_id,
    review_count: n,
    avg_timeliness: avg(approved.map(r => r.timeliness_rating)),
    avg_quality: avg(approved.map(r => r.quality_rating)),
    avg_communication: avg(approved.map(r => r.communication_rating)),
    avg_overall: avg(approved.map(r => (r.timeliness_rating + r.quality_rating + r.communication_rating) / 3)),
    total_compliance_issues: approved.reduce((s, r) => s + r.compliance_issues, 0),
    total_incidents: approved.reduce((s, r) => s + r.incident_count, 0),
    avg_cost_variance_pct: avg(approved.map(r => r.cost_variance_pct)),
  };
}

export function projectPerformanceReviewForSourcing(review: PerformanceReview): Omit<PerformanceReview, 'reviewer_notes'> {
  // Reviewer notes are internal and not exposed in aggregate/sourcing context
  const { reviewer_notes: _omit, ...safe } = review;
  return safe;
}
