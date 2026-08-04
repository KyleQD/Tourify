import { describe, it, expect } from 'vitest';
import {
  createTemplateVersion,
  approveTemplateVersion,
  activateTemplateVersion,
  validateContractDraft,
  checkInternalReviewComplete,
  approveContractReview,
  addNegotiationVersion,
  selectFinalNegotiationVersion,
  applySignatureWebhookEvent,
  isContractFullySigned,
  checkSignatureSequence,
  createAmendment,
  transitionObligation,
  attachEvidenceToObligation,
  getOverdueObligations,
  summarizeObligations,
  computeContractFinanceVariance,
  detectContractVersionMismatch,
  type ContractTemplateVersion,
  type ContractRecord,
  type ContractReviewRecord,
  type ContractReviewPolicy,
  type ContractSignatory,
  type ContractObligation,
  type ContractFinanceLinks,
} from '../../lib/admin/contract-domain';

// ── CONT-501 ──────────────────────────────────────────────────────────────

const baseTemplateParams: Omit<ContractTemplateVersion, 'version_id' | 'version_number' | 'status' | 'created_at'> = {
  template_id: 'tmpl_1', contract_type: 'vendor', name: 'Standard Vendor Agreement',
  clauses: [], variable_definitions: [{ name: 'vendor_name', label: 'Vendor Name', type: 'text' }],
  org_id: 'org_1', created_by: 'u',
};

describe('CONT-501 — Versioned template library', () => {
  it('creates first template version with version_number=1 and status=draft', () => {
    const v = createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    expect(v.version_number).toBe(1);
    expect(v.status).toBe('draft');
  });

  it('blocks new version creation when a draft exists', () => {
    const v1 = createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    expect(() => createTemplateVersion({ ...baseTemplateParams, previous_versions: [v1], created_at: '2026-07-23T01:00:00Z' })).toThrow();
  });

  it('approves template under_review', () => {
    const v = createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    const reviewing = { ...v, status: 'under_review' as const };
    const approved = approveTemplateVersion(reviewing, 'approver', '2026-07-24T00:00:00Z');
    expect(approved.status).toBe('approved');
    expect(approved.approved_by).toBe('approver');
  });

  it('approveTemplateVersion throws if not under_review', () => {
    const v = createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' });
    expect(() => approveTemplateVersion(v, 'approver', '2026-07-24T00:00:00Z')).toThrow();
  });

  it('activateTemplateVersion activates approved and supersedes previous active', () => {
    const v1 = { ...createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' }), status: 'active' as const };
    const v2 = { ...createTemplateVersion({ ...baseTemplateParams, previous_versions: [v1], created_at: '2026-07-24T00:00:00Z' }), status: 'approved' as const };
    const { activated, superseded } = activateTemplateVersion(v2, v1);
    expect(activated.status).toBe('active');
    expect(superseded?.status).toBe('archived');
  });
});

// ── CONT-502 ──────────────────────────────────────────────────────────────

const template: ContractTemplateVersion = {
  ...createTemplateVersion({ ...baseTemplateParams, previous_versions: [], created_at: '2026-07-23T00:00:00Z' }),
};

function makeContract(hasCounterparty = true): ContractRecord {
  return {
    contract_id: 'c1', org_id: 'org_1', template_version_id: template.version_id,
    template_checksum: 'abc123', contract_type: 'vendor',
    parties: hasCounterparty
      ? [{ party_id: 'p1', party_type: 'vendor', display_name: 'Vendor Co', is_counterparty: true }]
      : [{ party_id: 'p1', party_type: 'org', display_name: 'My Org', is_counterparty: false }],
    status: 'draft', variable_values: { vendor_name: 'Vendor Co' },
    owner_user_id: 'u', access_class: 'internal',
    created_by: 'u', created_at: '2026-07-23T00:00:00Z', updated_at: '2026-07-23T00:00:00Z',
  };
}

describe('CONT-502 — Contract draft workspace', () => {
  it('validateContractDraft passes valid contract', () => {
    expect(validateContractDraft(makeContract(), template)).toHaveLength(0);
  });

  it('validateContractDraft requires counterparty', () => {
    const errors = validateContractDraft(makeContract(false), template);
    expect(errors.some(e => e.includes('counterparty'))).toBe(true);
  });

  it('validateContractDraft detects missing variables', () => {
    const contract = { ...makeContract(), variable_values: {} };
    const errors = validateContractDraft(contract, template);
    expect(errors.some(e => e.includes('vendor_name'))).toBe(true);
  });
});

// ── CONT-503 ──────────────────────────────────────────────────────────────

const policy: ContractReviewPolicy = {
  required_roles: ['legal', 'finance'],
  requires_separation_of_duties: true,
};

function makeReview(role: ContractReviewRecord['required_role'], status: ContractReviewRecord['status'] = 'pending'): ContractReviewRecord {
  return { review_id: `rev_${role}`, contract_id: 'c1', required_role: role, reviewer_user_id: 'u', status };
}

describe('CONT-503 — Internal review/approval', () => {
  it('checkInternalReviewComplete returns incomplete with missing roles', () => {
    const result = checkInternalReviewComplete([makeReview('legal', 'approved')], policy);
    expect(result.complete).toBe(false);
    expect(result.missing_roles).toContain('finance');
  });

  it('checkInternalReviewComplete returns complete when all roles approved', () => {
    const reviews = [makeReview('legal', 'approved'), makeReview('finance', 'approved')];
    const result = checkInternalReviewComplete(reviews, policy);
    expect(result.complete).toBe(true);
  });

  it('checkInternalReviewComplete blocks on change requests', () => {
    const reviews = [makeReview('legal', 'changes_requested'), makeReview('finance', 'approved')];
    const result = checkInternalReviewComplete(reviews, policy);
    expect(result.complete).toBe(false);
    expect(result.has_change_requests).toBe(true);
  });

  it('approveContractReview requires pending status', () => {
    expect(() => approveContractReview(makeReview('legal', 'approved'))).toThrow(/pending/);
  });

  it('approveContractReview transitions to approved', () => {
    const review = approveContractReview(makeReview('legal'), 'Looks good');
    expect(review.status).toBe('approved');
    expect(review.comments).toBe('Looks good');
  });
});

// ── CONT-504 ──────────────────────────────────────────────────────────────

describe('CONT-504 — Counterparty negotiation versions', () => {
  it('addNegotiationVersion increments version_number', () => {
    const v1 = addNegotiationVersion([], {
      contract_id: 'c1', sent_by: 'org', sent_at: '2026-07-23T00:00:00Z', structured_changes: [],
    });
    expect(v1.version_number).toBe(1);
    const v2 = addNegotiationVersion([v1], {
      contract_id: 'c1', sent_by: 'counterparty', sent_at: '2026-07-24T00:00:00Z', structured_changes: [],
    });
    expect(v2.version_number).toBe(2);
  });

  it('selectFinalNegotiationVersion marks as final', () => {
    const v1 = addNegotiationVersion([], {
      contract_id: 'c1', sent_by: 'org', sent_at: '2026-07-23T00:00:00Z', structured_changes: [],
    });
    const final = selectFinalNegotiationVersion(v1, 'u');
    expect(final.is_final).toBe(true);
    expect(final.selected_by).toBe('u');
  });
});

// ── CONT-505 ──────────────────────────────────────────────────────────────

function makeSig(order: number, status: ContractSignatory['status'] = 'pending'): ContractSignatory {
  return { signatory_id: `sig_${order}`, contract_id: 'c1', party_id: `p${order}`, display_name: `Party ${order}`, order, status };
}

describe('CONT-505 — Signature adapter', () => {
  it('applySignatureWebhookEvent marks signatory as signed', () => {
    const sigs = [makeSig(1), makeSig(2)];
    const updated = applySignatureWebhookEvent(sigs, {
      event_id: 'e1', envelope_id: 'env_1', event_type: 'signed', occurred_at: '2026-07-23T00:00:00Z', signatory_id: 'sig_1',
    });
    expect(updated.find(s => s.signatory_id === 'sig_1')!.status).toBe('signed');
    expect(updated.find(s => s.signatory_id === 'sig_2')!.status).toBe('pending');
  });

  it('isContractFullySigned returns true when all signed', () => {
    const sigs = [{ ...makeSig(1), status: 'signed' as const }, { ...makeSig(2), status: 'signed' as const }];
    expect(isContractFullySigned(sigs)).toBe(true);
  });

  it('isContractFullySigned returns false when any pending', () => {
    expect(isContractFullySigned([makeSig(1), { ...makeSig(2), status: 'signed' as const }])).toBe(false);
  });

  it('checkSignatureSequence finds next pending signatory', () => {
    const sigs = [{ ...makeSig(1), status: 'signed' as const }, makeSig(2)];
    const { next_signatory, out_of_sequence } = checkSignatureSequence(sigs);
    expect(next_signatory?.signatory_id).toBe('sig_2');
    expect(out_of_sequence).toBe(false);
  });
});

// ── CONT-506 ──────────────────────────────────────────────────────────────

describe('CONT-506 — Amendment', () => {
  it('createAmendment requires reason', () => {
    expect(() => createAmendment({
      original_contract_id: 'c1', new_contract_id: 'c2', amendment_type: 'amendment',
      authority_user_id: 'u', reason: '', effective_date: '2026-09-01',
      downstream_impacts: { budget_ids: [], po_ids: [], publication_ids: [] },
    })).toThrow(/reason/i);
  });

  it('createAmendment creates amendment with id', () => {
    const amend = createAmendment({
      original_contract_id: 'c1', new_contract_id: 'c2', amendment_type: 'termination',
      authority_user_id: 'u', reason: 'Early termination by mutual agreement', effective_date: '2026-09-01',
      downstream_impacts: { budget_ids: ['b1'], po_ids: [], publication_ids: [] },
    });
    expect(amend.amendment_id).toMatch(/^amend_/);
    expect(amend.amendment_type).toBe('termination');
    expect(amend.downstream_impacts.budget_ids).toContain('b1');
  });
});

// ── CONT-507 ──────────────────────────────────────────────────────────────

function makeObligation(status: ObligationStatus = 'pending'): ContractObligation {
  return {
    obligation_id: 'obl_1', contract_id: 'c1', obligation_type: 'payment',
    label: 'First payment', responsible_party_id: 'p1', due_date: '2026-08-01',
    status, evidence_refs: [],
  };
}

type ObligationStatus = 'pending' | 'in_progress' | 'complete' | 'overdue' | 'waived' | 'disputed' | 'cancelled';

describe('CONT-507 — Obligation tracker', () => {
  it('transitionObligation pending → in_progress', () => {
    const o = transitionObligation(makeObligation(), 'in_progress', 'u');
    expect(o.status).toBe('in_progress');
  });

  it('transitionObligation blocks invalid transition', () => {
    expect(() => transitionObligation(makeObligation(), 'complete', 'u')).toThrow();
  });

  it('transitionObligation to complete sets completed_at', () => {
    const o = transitionObligation(makeObligation('in_progress'), 'complete', 'u');
    expect(o.status).toBe('complete');
    expect(o.completed_at).toBeTruthy();
  });

  it('attachEvidenceToObligation adds token', () => {
    const o = attachEvidenceToObligation(makeObligation('in_progress'), 'file_token_1');
    expect(o.evidence_refs).toContain('file_token_1');
  });

  it('attachEvidenceToObligation blocks on complete', () => {
    expect(() => attachEvidenceToObligation(makeObligation('complete' as const), 'tok')).toThrow();
  });

  it('getOverdueObligations identifies past due date', () => {
    const overdue = makeObligation('pending');
    const future = { ...makeObligation('pending'), obligation_id: 'obl_2', due_date: '2027-01-01' };
    const result = getOverdueObligations([overdue, future], '2026-08-15');
    expect(result).toHaveLength(1);
    expect(result[0].obligation_id).toBe('obl_1');
  });

  it('summarizeObligations computes all_resolved', () => {
    const resolved = [
      { ...makeObligation('complete' as const) },
      { ...makeObligation('waived' as const), obligation_id: 'obl_2' },
    ];
    const result = summarizeObligations(resolved);
    expect(result.all_resolved).toBe(true);
    expect(result.complete).toBe(2);
  });
});

// ── CONT-508 ──────────────────────────────────────────────────────────────

describe('CONT-508 — Contract finance links', () => {
  const links: ContractFinanceLinks = {
    contract_id: 'c1', po_ids: ['po_1'], invoice_ids: ['inv_1'], settlement_statement_ids: [],
    contract_value_minor: 100000_00, contract_value_currency: 'USD',
    total_committed_minor: 110000_00, total_invoiced_minor: 95000_00,
    variance_minor: 10000_00, is_stale_version: false,
  };

  it('computeContractFinanceVariance detects overcommitment', () => {
    const result = computeContractFinanceVariance(links);
    expect(result.has_overcommitment).toBe(true);
    expect(result.committed_vs_contract).toBe(10000_00);
  });

  it('computeContractFinanceVariance negative when invoiced < contract', () => {
    const result = computeContractFinanceVariance(links);
    expect(result.invoiced_vs_contract).toBe(-5000_00);
  });

  it('detectContractVersionMismatch finds stale PO versions', () => {
    const contract = makeContract();
    const result = detectContractVersionMismatch(contract, [contract.template_version_id, 'old_version_id']);
    expect(result.has_mismatch).toBe(true);
    expect(result.stale_po_count).toBe(1);
  });

  it('detectContractVersionMismatch returns no mismatch when all match', () => {
    const contract = makeContract();
    const result = detectContractVersionMismatch(contract, [contract.template_version_id]);
    expect(result.has_mismatch).toBe(false);
  });
});
