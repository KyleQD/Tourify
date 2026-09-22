import { describe, it, expect } from 'vitest';
import {
  canTransitionRequisition,
  transitionRequisition,
  validateRequisition,
  makeRequisition,
  getHeadcountSummary,
  recordAcceptance,
  releaseReservation,
  reserveHeadcount,
  summarizeRequisition,
  DEFAULT_REQUISITION_REQUIRED_FIELDS,
  type HiringRequisition,
  type RequisitionRequiredFieldConfig,
} from '../../lib/admin/hiring-requisition';

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

function baseReq(overrides: Partial<HiringRequisition> = {}): HiringRequisition {
  return makeRequisition({
    id: 'req-1',
    org_id: 'org-1',
    title: 'Lighting Director',
    role: 'lighting_director',
    department: 'lighting',
    employment_type: 'contractor',
    start_date: '2025-09-01',
    headcount_total: 2,
    travel: { requirement: 'touring' },
    owner_id: 'user-mgr',
    created_by: 'user-mgr',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    rate: { currency: 'USD', min_minor: 100_00, max_minor: 150_00, rate_type: 'daily' },
    required_skills: ['grandma2', 'hog4'],
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

describe('canTransitionRequisition', () => {
  it('allows draft → approval_pending', () => {
    expect(canTransitionRequisition('draft', 'approval_pending')).toBe(true);
  });
  it('allows draft → closed', () => {
    expect(canTransitionRequisition('draft', 'closed')).toBe(true);
  });
  it('blocks draft → open directly', () => {
    expect(canTransitionRequisition('draft', 'open')).toBe(false);
  });
  it('allows approval_pending → open', () => {
    expect(canTransitionRequisition('approval_pending', 'open')).toBe(true);
  });
  it('allows approval_pending → draft (send back)', () => {
    expect(canTransitionRequisition('approval_pending', 'draft')).toBe(true);
  });
  it('allows open → paused', () => {
    expect(canTransitionRequisition('open', 'paused')).toBe(true);
  });
  it('allows paused → open', () => {
    expect(canTransitionRequisition('paused', 'open')).toBe(true);
  });
  it('blocks closed → open (terminal)', () => {
    expect(canTransitionRequisition('closed', 'open')).toBe(false);
  });
});

describe('transitionRequisition', () => {
  it('allows hiring.approve to open an approval_pending req', () => {
    const req = baseReq({ status: 'approval_pending' });
    const result = transitionRequisition(req, 'open', 'hiring.approve');
    expect(result.ok).toBe(true);
    expect(result.status).toBe('open');
  });

  it('blocks hiring.manage from opening approval_pending req', () => {
    const req = baseReq({ status: 'approval_pending' });
    const result = transitionRequisition(req, 'open', 'hiring.manage');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/hiring.approve/);
  });

  it('allows hiring.manage to submit draft → approval_pending', () => {
    const req = baseReq({ status: 'draft' });
    const result = transitionRequisition(req, 'approval_pending', 'hiring.manage');
    expect(result.ok).toBe(true);
    expect(result.status).toBe('approval_pending');
  });

  it('rejects invalid transition', () => {
    const req = baseReq({ status: 'closed' });
    const result = transitionRequisition(req, 'open', 'hiring.approve');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not allowed/);
  });
});

// ---------------------------------------------------------------------------
// Validation — invariant required fields
// ---------------------------------------------------------------------------

describe('validateRequisition — invariant fields', () => {
  it('passes a complete valid requisition', () => {
    const result = validateRequisition(baseReq());
    expect(result.valid).toBe(true);
    expect(result.missing_fields).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when title is blank', () => {
    const result = validateRequisition(baseReq({ title: '  ' }));
    expect(result.valid).toBe(false);
    expect(result.missing_fields).toContain('title');
  });

  it('fails when role is missing', () => {
    const result = validateRequisition(baseReq({ role: '' }));
    expect(result.missing_fields).toContain('role');
  });

  it('fails when headcount_total < 1', () => {
    const result = validateRequisition(baseReq({ headcount_total: 0 }));
    expect(result.errors).toContain('headcount_total must be >= 1.');
  });

  it('fails when owner_id is missing', () => {
    const result = validateRequisition(baseReq({ owner_id: '' }));
    expect(result.missing_fields).toContain('owner_id');
  });

  it('fails end_date < start_date', () => {
    const result = validateRequisition(baseReq({ start_date: '2025-09-01', end_date: '2025-08-01' }));
    expect(result.errors).toContain('end_date must be >= start_date.');
  });

  it('fails headcount_filled + reserved > total', () => {
    const result = validateRequisition(baseReq({ headcount_total: 2, headcount_filled: 1, headcount_reserved: 2 }));
    expect(result.errors).toContain('headcount_filled + headcount_reserved cannot exceed headcount_total.');
  });
});

// ---------------------------------------------------------------------------
// Validation — configurable required fields
// ---------------------------------------------------------------------------

describe('validateRequisition — configurable fields', () => {
  const strictConfig: RequisitionRequiredFieldConfig = {
    ...DEFAULT_REQUISITION_REQUIRED_FIELDS,
    require_tour_id: true,
    require_event_id: true,
    require_close_date: true,
    require_credential_requirements: true,
  };

  it('fails when tour_id required but absent', () => {
    const result = validateRequisition(baseReq(), strictConfig);
    expect(result.missing_fields).toContain('tour_id');
  });

  it('fails when event_id required but absent', () => {
    const result = validateRequisition(baseReq(), strictConfig);
    expect(result.missing_fields).toContain('event_id');
  });

  it('fails when close_date required but absent', () => {
    const result = validateRequisition(baseReq(), strictConfig);
    expect(result.missing_fields).toContain('close_date');
  });

  it('fails when credential_requirements required but empty', () => {
    const result = validateRequisition(baseReq(), strictConfig);
    expect(result.missing_fields).toContain('credential_requirements');
  });

  it('passes when all strict fields are present', () => {
    const result = validateRequisition(
      baseReq({
        tour_id: 'tour-1',
        event_id: 'ev-1',
        close_date: '2025-10-01',
        credential_requirements: ['rigging_cert'],
      }),
      strictConfig,
    );
    expect(result.valid).toBe(true);
  });

  it('fails when rate is required but absent', () => {
    const result = validateRequisition(baseReq({ rate: undefined }));
    expect(result.missing_fields).toContain('rate');
  });

  it('fails when rate.max_minor < rate.min_minor', () => {
    const result = validateRequisition(
      baseReq({ rate: { currency: 'USD', min_minor: 200_00, max_minor: 100_00, rate_type: 'daily' } }),
    );
    expect(result.errors).toContain('rate.max_minor must be >= rate.min_minor.');
  });

  it('fails when required_skills empty (default config requires them)', () => {
    const result = validateRequisition(baseReq({ required_skills: [] }));
    expect(result.missing_fields).toContain('required_skills');
  });

  it('fails when travel.requirement missing', () => {
    const result = validateRequisition(baseReq({ travel: { requirement: undefined as unknown as 'none' } }));
    expect(result.missing_fields).toContain('travel.requirement');
  });
});

// ---------------------------------------------------------------------------
// Headcount helpers
// ---------------------------------------------------------------------------

describe('getHeadcountSummary', () => {
  it('computes open positions', () => {
    const req = baseReq({ headcount_total: 3, headcount_filled: 1, headcount_reserved: 1 });
    const s = getHeadcountSummary(req);
    expect(s.open).toBe(1);
    expect(s.is_fully_staffed).toBe(false);
  });

  it('reports fully staffed when filled === total', () => {
    const req = baseReq({ headcount_total: 2, headcount_filled: 2, headcount_reserved: 0 });
    const s = getHeadcountSummary(req);
    expect(s.is_fully_staffed).toBe(true);
    expect(s.open).toBe(0);
  });
});

describe('recordAcceptance', () => {
  it('increments filled and decrements reserved', () => {
    const req = baseReq({ status: 'open', headcount_total: 2, headcount_filled: 0, headcount_reserved: 1 });
    const { updated, headcount } = recordAcceptance(req);
    expect(updated.headcount_filled).toBe(1);
    expect(updated.headcount_reserved).toBe(0);
    expect(headcount.open).toBe(1);
  });

  it('auto-closes req when fully staffed', () => {
    const req = baseReq({ status: 'open', headcount_total: 1, headcount_filled: 0, headcount_reserved: 1 });
    const { updated } = recordAcceptance(req);
    expect(updated.status).toBe('closed');
    expect(updated.headcount_filled).toBe(1);
  });
});

describe('releaseReservation', () => {
  it('decrements reserved, minimum 0', () => {
    const req = baseReq({ headcount_reserved: 1 });
    const updated = releaseReservation(req);
    expect(updated.headcount_reserved).toBe(0);
  });

  it('does not go below 0', () => {
    const req = baseReq({ headcount_reserved: 0 });
    const updated = releaseReservation(req);
    expect(updated.headcount_reserved).toBe(0);
  });
});

describe('reserveHeadcount', () => {
  it('returns updated summary when slots available', () => {
    const req = baseReq({ headcount_total: 3, headcount_filled: 0, headcount_reserved: 0 });
    const summary = reserveHeadcount(req);
    expect(summary).not.toBeNull();
    expect(summary!.reserved).toBe(1);
    expect(summary!.open).toBe(2);
  });

  it('returns null when no open slots', () => {
    const req = baseReq({ headcount_total: 1, headcount_filled: 1, headcount_reserved: 0 });
    expect(reserveHeadcount(req)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// summarizeRequisition — rate not exposed
// ---------------------------------------------------------------------------

describe('summarizeRequisition', () => {
  it('omits rate from summary', () => {
    const summary = summarizeRequisition(baseReq());
    expect((summary as Record<string, unknown>).rate).toBeUndefined();
  });

  it('includes headcount summary', () => {
    const summary = summarizeRequisition(baseReq({ headcount_total: 4, headcount_filled: 2, headcount_reserved: 1 }));
    expect(summary.headcount.open).toBe(1);
  });

  it('maps travel requirement', () => {
    const summary = summarizeRequisition(baseReq());
    expect(summary.travel_requirement).toBe('touring');
  });
});
