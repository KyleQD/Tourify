/**
 * contract-domain.ts — CONT-501..508
 *
 * Pure domain logic for contract lifecycle from template library through
 * signature, obligations, and finance connections.
 *  CONT-501: Versioned template library
 *  CONT-502: Contract draft workspace
 *  CONT-503: Internal review/approval
 *  CONT-504: Counterparty negotiation versions
 *  CONT-505: Signature adapter
 *  CONT-506: Amendment/termination/renewal
 *  CONT-507: Obligation tracker
 *  CONT-508: Connect contract to PO/invoice/settlement
 *
 * No Supabase imports. No mocks. Pure domain logic only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONT-501 — Versioned template library
// ─────────────────────────────────────────────────────────────────────────────

export type ContractTemplateStatus = 'draft' | 'under_review' | 'approved' | 'active' | 'archived';
export type ContractType = 'vendor' | 'artist' | 'venue' | 'sponsorship' | 'employment' | 'nda' | 'service' | 'other';

export interface ContractClause {
  clause_id: string;
  label: string;
  body_template: string; // with {{variable}} placeholders
  is_required: boolean;
  order: number;
  variable_names: string[];
}

export interface ContractTemplateVersion {
  version_id: string;
  template_id: string;
  version_number: number;
  status: ContractTemplateStatus;
  contract_type: ContractType;
  name: string;
  clauses: ContractClause[];
  variable_definitions: { name: string; label: string; type: 'text' | 'number' | 'date' | 'currency' | 'party' }[];
  org_id: string;
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  superseded_by_version_id?: string;
}

export function createTemplateVersion(
  params: Omit<ContractTemplateVersion, 'version_id' | 'version_number' | 'status' | 'created_at'> & {
    previous_versions: ContractTemplateVersion[];
    created_at?: string;
  },
): ContractTemplateVersion {
  const { previous_versions, created_at, ...rest } = params;
  const nextNumber = previous_versions.length + 1;
  if (previous_versions.some(v => v.status === 'draft')) {
    throw new Error('Cannot create new version while a draft exists');
  }
  return {
    ...rest,
    version_id: `ctv_${Date.now()}_${nextNumber}`,
    version_number: nextNumber,
    status: 'draft',
    created_at: created_at ?? new Date().toISOString(),
  };
}

export function approveTemplateVersion(
  version: ContractTemplateVersion,
  approved_by: string,
  approved_at: string,
): ContractTemplateVersion {
  if (version.status !== 'under_review') throw new Error('Can only approve templates under_review');
  return { ...version, status: 'approved', approved_by, approved_at };
}

export function activateTemplateVersion(
  version: ContractTemplateVersion,
  previous_active: ContractTemplateVersion | null,
): { activated: ContractTemplateVersion; superseded: ContractTemplateVersion | null } {
  if (version.status !== 'approved') throw new Error('Can only activate approved templates');
  const activated = { ...version, status: 'active' as ContractTemplateStatus };
  const superseded = previous_active
    ? { ...previous_active, status: 'archived' as ContractTemplateStatus, superseded_by_version_id: version.version_id }
    : null;
  return { activated, superseded };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-502 — Contract draft workspace
// ─────────────────────────────────────────────────────────────────────────────

export type ContractStatus =
  | 'draft' | 'internal_review' | 'counterparty_review' | 'approved'
  | 'signature_pending' | 'executed' | 'active' | 'amended' | 'expired'
  | 'terminated' | 'archived';

export interface ContractParty {
  party_id: string;
  party_type: 'org' | 'vendor' | 'artist' | 'venue' | 'individual';
  display_name: string;
  is_counterparty: boolean;
  signing_authority?: string;
}

export interface ContractRecord {
  contract_id: string;
  org_id: string;
  template_version_id: string;
  template_checksum: string; // immutable reference to rendered document
  contract_type: ContractType;
  engagement_id?: string;
  tour_id?: string;
  event_id?: string;
  parties: ContractParty[];
  status: ContractStatus;
  variable_values: Record<string, string | number>;
  value_minor?: number;
  value_currency?: string;
  effective_date?: string;
  expiry_date?: string;
  owner_user_id: string;
  access_class: 'restricted' | 'internal' | 'counterparty_access';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function validateContractDraft(contract: ContractRecord, template: ContractTemplateVersion): string[] {
  const errors: string[] = [];
  if (!contract.parties.length) errors.push('Contract must have at least one party');
  if (!contract.parties.some(p => p.is_counterparty)) errors.push('At least one counterparty is required');
  // Check all required variables are filled
  const missingVars = template.variable_definitions
    .filter(v => {
      const val = contract.variable_values[v.name];
      return val === undefined || val === '';
    });
  if (missingVars.length) errors.push(`Missing required variables: ${missingVars.map(v => v.name).join(', ')}`);
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-503 — Internal review/approval
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewRole = 'legal' | 'finance' | 'business' | 'delegated';

export interface ContractReviewRecord {
  review_id: string;
  contract_id: string;
  required_role: ReviewRole;
  reviewer_user_id: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'delegated';
  comments?: string;
  change_request_details?: string;
  reviewed_at?: string;
  delegated_to?: string;
}

export interface ContractReviewPolicy {
  required_roles: ReviewRole[];
  requires_separation_of_duties: boolean; // approver cannot be drafter
}

export function checkInternalReviewComplete(
  reviews: ContractReviewRecord[],
  policy: ContractReviewPolicy,
): { complete: boolean; missing_roles: ReviewRole[]; has_change_requests: boolean } {
  const approved_roles = reviews
    .filter(r => r.status === 'approved')
    .map(r => r.required_role);
  const missing_roles = policy.required_roles.filter(role => !approved_roles.includes(role));
  const has_change_requests = reviews.some(r => r.status === 'changes_requested');
  return {
    complete: missing_roles.length === 0 && !has_change_requests,
    missing_roles,
    has_change_requests,
  };
}

export function approveContractReview(
  review: ContractReviewRecord,
  comments?: string,
): ContractReviewRecord {
  if (review.status !== 'pending') throw new Error(`Review must be pending to approve; currently ${review.status}`);
  return { ...review, status: 'approved', comments, reviewed_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-504 — Counterparty negotiation versions
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractNegotiationVersion {
  negotiation_version_id: string;
  contract_id: string;
  version_number: number;
  sent_by: 'org' | 'counterparty';
  sent_at: string;
  document_ref?: string; // immutable token
  structured_changes: { field: string; previous: string; proposed: string }[];
  comments?: string;
  is_final: boolean;
  selected_at?: string;
  selected_by?: string;
}

export function addNegotiationVersion(
  existing: ContractNegotiationVersion[],
  params: Omit<ContractNegotiationVersion, 'negotiation_version_id' | 'version_number' | 'is_final'>,
): ContractNegotiationVersion {
  const nextNumber = existing.length + 1;
  return {
    ...params,
    negotiation_version_id: `nv_${Date.now()}_${nextNumber}`,
    version_number: nextNumber,
    is_final: false,
  };
}

export function selectFinalNegotiationVersion(
  version: ContractNegotiationVersion,
  selected_by: string,
): ContractNegotiationVersion {
  return { ...version, is_final: true, selected_by, selected_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-505 — Signature adapter
// ─────────────────────────────────────────────────────────────────────────────

export type SignatureMode = 'manual_upload' | 'e_signature' | 'wet_ink';
export type SignatoryStatus = 'pending' | 'signed' | 'declined' | 'expired';

export interface ContractSignatory {
  signatory_id: string;
  contract_id: string;
  party_id: string;
  display_name: string;
  email?: string;
  order: number;
  status: SignatoryStatus;
  signed_at?: string;
  signature_provider_id?: string; // external e-sign ID
  signature_envelope_id?: string;
  declined_reason?: string;
}

export interface SignatureEnvelopeEvent {
  event_id: string;
  envelope_id: string;
  event_type: 'sent' | 'viewed' | 'signed' | 'declined' | 'voided' | 'completed' | 'provider_error';
  occurred_at: string;
  signatory_id?: string;
  provider_event_id?: string; // dedup key
  raw_payload_hash?: string;
}

export function applySignatureWebhookEvent(
  signatories: ContractSignatory[],
  event: SignatureEnvelopeEvent,
): ContractSignatory[] {
  return signatories.map(s => {
    if (s.signatory_id !== event.signatory_id) return s;
    switch (event.event_type) {
      case 'signed':
        return { ...s, status: 'signed' as SignatoryStatus, signed_at: event.occurred_at };
      case 'declined':
        return { ...s, status: 'declined' as SignatoryStatus };
      default:
        return s;
    }
  });
}

export function isContractFullySigned(signatories: ContractSignatory[]): boolean {
  return signatories.every(s => s.status === 'signed');
}

export function checkSignatureSequence(signatories: ContractSignatory[]): {
  next_signatory: ContractSignatory | null;
  out_of_sequence: boolean;
} {
  const sorted = [...signatories].sort((a, b) => a.order - b.order);
  const next_signatory = sorted.find(s => s.status === 'pending') ?? null;
  // Out of sequence if any later signatory has signed before an earlier pending one
  const out_of_sequence = sorted.some((s, i) => s.status === 'signed' && sorted.slice(0, i).some(p => p.status === 'pending'));
  return { next_signatory, out_of_sequence };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-506 — Amendment/termination/renewal
// ─────────────────────────────────────────────────────────────────────────────

export type AmendmentType = 'amendment' | 'termination' | 'renewal';

export interface ContractAmendment {
  amendment_id: string;
  original_contract_id: string;
  new_contract_id: string; // links to new ContractRecord
  amendment_type: AmendmentType;
  authority_user_id: string;
  reason: string;
  notice_date?: string;
  effective_date: string;
  downstream_impacts: {
    budget_ids: string[];
    po_ids: string[];
    publication_ids: string[];
  };
  created_at: string;
}

export function createAmendment(
  params: Omit<ContractAmendment, 'amendment_id' | 'created_at'> & { created_at?: string },
): ContractAmendment {
  if (!params.reason.trim()) throw new Error('Amendment reason is required');
  return {
    ...params,
    amendment_id: `amend_${Date.now()}`,
    created_at: params.created_at ?? new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-507 — Obligation tracker
// ─────────────────────────────────────────────────────────────────────────────

export type ObligationType = 'deliverable' | 'payment' | 'notice' | 'insurance' | 'option' | 'renewal' | 'milestone';
export type ObligationStatus = 'pending' | 'in_progress' | 'complete' | 'overdue' | 'waived' | 'disputed' | 'cancelled';

export const OBLIGATION_STATUS_TRANSITIONS: Record<ObligationStatus, ObligationStatus[]> = {
  pending: ['in_progress', 'waived', 'cancelled', 'overdue'],
  in_progress: ['complete', 'overdue', 'disputed', 'cancelled'],
  overdue: ['in_progress', 'complete', 'waived', 'disputed', 'cancelled'],
  disputed: ['in_progress', 'complete', 'waived'],
  complete: [],
  waived: [],
  cancelled: [],
};

export interface ContractObligation {
  obligation_id: string;
  contract_id: string;
  obligation_type: ObligationType;
  label: string;
  responsible_party_id: string;
  due_date: string;
  status: ObligationStatus;
  evidence_refs: string[]; // tokens
  escalation_contact?: string;
  reminder_sent_at?: string;
  completed_at?: string;
  notes?: string;
}

export function transitionObligation(
  obligation: ContractObligation,
  to: ObligationStatus,
  actor: string,
): ContractObligation {
  const allowed = OBLIGATION_STATUS_TRANSITIONS[obligation.status];
  if (!allowed.includes(to)) throw new Error(`Invalid obligation transition: ${obligation.status} → ${to}`);
  const completed_at = to === 'complete' ? new Date().toISOString() : obligation.completed_at;
  return { ...obligation, status: to, completed_at };
}

export function attachEvidenceToObligation(
  obligation: ContractObligation,
  evidence_token: string,
): ContractObligation {
  if (['complete', 'waived', 'cancelled'].includes(obligation.status)) {
    throw new Error(`Cannot attach evidence to a ${obligation.status} obligation`);
  }
  return { ...obligation, evidence_refs: [...obligation.evidence_refs, evidence_token] };
}

export function getOverdueObligations(obligations: ContractObligation[], today: string): ContractObligation[] {
  return obligations.filter(o => {
    if (['complete', 'waived', 'cancelled'].includes(o.status)) return false;
    return o.due_date < today;
  });
}

export function summarizeObligations(obligations: ContractObligation[]): {
  total: number;
  complete: number;
  overdue: number;
  pending: number;
  disputed: number;
  all_resolved: boolean;
} {
  const complete = obligations.filter(o => o.status === 'complete' || o.status === 'waived').length;
  const overdue = obligations.filter(o => o.status === 'overdue').length;
  const pending = obligations.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
  const disputed = obligations.filter(o => o.status === 'disputed').length;
  return {
    total: obligations.length,
    complete,
    overdue,
    pending,
    disputed,
    all_resolved: complete === obligations.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONT-508 — Connect contract to PO/invoice/settlement
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractFinanceLinks {
  contract_id: string;
  po_ids: string[];
  invoice_ids: string[];
  settlement_statement_ids: string[];
  contract_value_minor?: number;
  contract_value_currency?: string;
  total_committed_minor: number;
  total_invoiced_minor: number;
  variance_minor: number;
  is_stale_version: boolean; // contract version differs from linked POs/invoices
}

export function computeContractFinanceVariance(links: ContractFinanceLinks): {
  committed_vs_contract: number;
  invoiced_vs_contract: number;
  has_overcommitment: boolean;
} {
  const contract_value = links.contract_value_minor ?? 0;
  const committed_vs_contract = links.total_committed_minor - contract_value;
  const invoiced_vs_contract = links.total_invoiced_minor - contract_value;
  return {
    committed_vs_contract,
    invoiced_vs_contract,
    has_overcommitment: committed_vs_contract > 0,
  };
}

export function detectContractVersionMismatch(
  contract: ContractRecord,
  linked_po_contract_version_ids: string[],
): { has_mismatch: boolean; stale_po_count: number } {
  const stale_pos = linked_po_contract_version_ids.filter(v => v !== contract.template_version_id);
  return {
    has_mismatch: stale_pos.length > 0,
    stale_po_count: stale_pos.length,
  };
}
