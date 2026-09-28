import { describe, it, expect } from 'vitest';
import {
  transitionOffer,
  createOfferFromApprovedApplication,
  acceptOffer,
  failOffer,
  isOfferExpired,
  summarizeOffer,
  OFFER_RELEASE_STATUSES,
  type OfferRecord,
  type ContingentAssignment,
} from '../../lib/admin/hiring-offer-handoff';
import { makeRequisition, type HiringRequisition } from '../../lib/admin/hiring-requisition';
import type { HiringApplication } from '../../lib/admin/hiring-application-pipeline';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseApp(overrides: Partial<HiringApplication> = {}): HiringApplication {
  return {
    id: 'app-1',
    org_id: 'org-1',
    requisition_id: 'req-1',
    applicant_name: 'Jane Doe',
    applicant_email: 'jane@example.com',
    stage: 'offer_pending',
    consent: { consented_at: '2025-01-01T00:00:00Z', consent_version: 'v1', data_retention_period: '180d' },
    source: 'external',
    applied_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    ...overrides,
  };
}

function baseReq(overrides: Partial<HiringRequisition> = {}): HiringRequisition {
  return makeRequisition({
    id: 'req-1',
    org_id: 'org-1',
    title: 'Lighting Director',
    role: 'lighting_director',
    department: 'lighting',
    employment_type: 'contractor',
    start_date: '2025-09-01',
    headcount_total: 3,
    travel: { requirement: 'touring' },
    owner_id: 'user-mgr',
    created_by: 'user-mgr',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    rate: { currency: 'USD', min_minor: 100_00, max_minor: 150_00, rate_type: 'daily' },
    required_skills: ['grandma2'],
    headcount_reserved: 1,
    ...overrides,
  });
}

function baseOffer(overrides: Partial<OfferRecord> = {}): OfferRecord {
  return {
    id: 'offer-1',
    org_id: 'org-1',
    application_id: 'app-1',
    requisition_id: 'req-1',
    status: 'issued',
    currency: 'USD',
    rate_minor: 120_00,
    rate_type: 'daily',
    employment_category: 'contractor',
    role: 'lighting_director',
    department: 'lighting',
    start_date: '2025-09-01',
    issued_by: 'user-mgr',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function baseAssignment(overrides: Partial<ContingentAssignment> = {}): ContingentAssignment {
  return {
    id: 'ca-1',
    org_id: 'org-1',
    offer_id: 'offer-1',
    application_id: 'app-1',
    requisition_id: 'req-1',
    role: 'lighting_director',
    department: 'lighting',
    start_date: '2025-09-01',
    status: 'contingent_pending',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Offer transitions
// ---------------------------------------------------------------------------

describe('transitionOffer', () => {
  it('allows draft → pending_approval', () => {
    expect(transitionOffer('draft', 'pending_approval').ok).toBe(true);
  });
  it('allows pending_approval → issued', () => {
    expect(transitionOffer('pending_approval', 'issued').ok).toBe(true);
  });
  it('allows issued → accepted', () => {
    expect(transitionOffer('issued', 'accepted').ok).toBe(true);
  });
  it('allows issued → declined', () => {
    expect(transitionOffer('issued', 'declined').ok).toBe(true);
  });
  it('allows issued → expired', () => {
    expect(transitionOffer('issued', 'expired').ok).toBe(true);
  });
  it('blocks accepted → declined (terminal)', () => {
    const r = transitionOffer('accepted', 'declined');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not allowed/);
  });
  it('blocks draft → accepted directly', () => {
    expect(transitionOffer('draft', 'accepted').ok).toBe(false);
  });
});

describe('OFFER_RELEASE_STATUSES', () => {
  it('contains declined/withdrawn/expired/superseded', () => {
    expect(OFFER_RELEASE_STATUSES.has('declined')).toBe(true);
    expect(OFFER_RELEASE_STATUSES.has('withdrawn')).toBe(true);
    expect(OFFER_RELEASE_STATUSES.has('expired')).toBe(true);
    expect(OFFER_RELEASE_STATUSES.has('superseded')).toBe(true);
    expect(OFFER_RELEASE_STATUSES.has('accepted')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createOfferFromApprovedApplication
// ---------------------------------------------------------------------------

describe('createOfferFromApprovedApplication', () => {
  it('creates issued offer and contingent_pending assignment', () => {
    const { offer, assignment } = createOfferFromApprovedApplication({
      offer_id: 'offer-1',
      assignment_id: 'ca-1',
      org_id: 'org-1',
      application: baseApp({ stage: 'offer_pending' }),
      issued_by: 'user-mgr',
      currency: 'USD',
      rate_minor: 120_00,
      rate_type: 'daily',
      employment_category: 'contractor',
      role: 'lighting_director',
      department: 'lighting',
      tour_id: 'tour-1',
      start_date: '2025-09-01',
      now: '2025-06-15T10:00:00Z',
    });

    expect(offer.status).toBe('issued');
    expect(offer.issued_at).toBe('2025-06-15T10:00:00Z');
    expect(offer.tour_id).toBe('tour-1');
    expect(assignment.status).toBe('contingent_pending');
    expect(assignment.offer_id).toBe('offer-1');
  });

  it('throws when application stage is not offer_pending or offer_extended', () => {
    expect(() =>
      createOfferFromApprovedApplication({
        offer_id: 'offer-1',
        assignment_id: 'ca-1',
        org_id: 'org-1',
        application: baseApp({ stage: 'screening' }),
        issued_by: 'user-mgr',
        currency: 'USD',
        rate_minor: 100_00,
        rate_type: 'daily',
        employment_category: 'contractor',
        role: 'ld',
        department: 'lighting',
        start_date: '2025-09-01',
      }),
    ).toThrow(/offer_pending/);
  });

  it('accepts offer_extended stage too', () => {
    const { offer } = createOfferFromApprovedApplication({
      offer_id: 'offer-2',
      assignment_id: 'ca-2',
      org_id: 'org-1',
      application: baseApp({ stage: 'offer_extended' }),
      issued_by: 'user-mgr',
      currency: 'USD',
      rate_minor: 100_00,
      rate_type: 'daily',
      employment_category: 'contractor',
      role: 'ld',
      department: 'lighting',
      start_date: '2025-09-01',
      now: '2025-06-15T10:00:00Z',
    });
    expect(offer.status).toBe('issued');
  });
});

// ---------------------------------------------------------------------------
// acceptOffer
// ---------------------------------------------------------------------------

describe('acceptOffer', () => {
  it('transitions offer to accepted, assignment to confirmed, records fill', () => {
    const req = baseReq({ headcount_total: 3, headcount_filled: 0, headcount_reserved: 1 });
    const { offer, assignment, requisition } = acceptOffer(
      baseOffer(),
      baseAssignment(),
      req,
      'person-42',
      '2025-06-20T10:00:00Z',
    );

    expect(offer.status).toBe('accepted');
    expect(offer.accepted_at).toBe('2025-06-20T10:00:00Z');
    expect(assignment.status).toBe('confirmed');
    expect(assignment.person_id).toBe('person-42');
    expect(requisition.headcount_filled).toBe(1);
    expect(requisition.headcount_reserved).toBe(0);
  });

  it('auto-closes requisition when fully staffed on accept', () => {
    const req = baseReq({ headcount_total: 1, headcount_filled: 0, headcount_reserved: 1, status: 'open' });
    const { requisition } = acceptOffer(baseOffer(), baseAssignment(), req, 'person-42');
    expect(requisition.status).toBe('closed');
  });

  it('throws when offer is not in issued status', () => {
    expect(() => acceptOffer(baseOffer({ status: 'draft' }), baseAssignment(), baseReq(), 'p1')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// failOffer
// ---------------------------------------------------------------------------

describe('failOffer', () => {
  it('declined: transitions offer, cancels assignment, releases reservation', () => {
    const req = baseReq({ headcount_total: 3, headcount_filled: 0, headcount_reserved: 1 });
    const { offer, assignment, requisition } = failOffer(
      baseOffer(),
      baseAssignment(),
      req,
      'declined',
      '2025-06-20T10:00:00Z',
    );

    expect(offer.status).toBe('declined');
    expect(offer.declined_at).toBe('2025-06-20T10:00:00Z');
    expect(assignment.status).toBe('cancelled');
    expect(requisition.headcount_reserved).toBe(0);
  });

  it('withdrawn: sets withdrawn_at', () => {
    const { offer } = failOffer(baseOffer(), baseAssignment(), baseReq({ headcount_reserved: 1 }), 'withdrawn', '2025-06-20T10:00:00Z');
    expect(offer.withdrawn_at).toBe('2025-06-20T10:00:00Z');
  });

  it('expired: sets expired_at', () => {
    const { offer } = failOffer(baseOffer(), baseAssignment(), baseReq({ headcount_reserved: 1 }), 'expired', '2025-06-20T10:00:00Z');
    expect(offer.expired_at).toBe('2025-06-20T10:00:00Z');
  });

  it('superseded: marks offer superseded', () => {
    const { offer } = failOffer(baseOffer(), baseAssignment(), baseReq({ headcount_reserved: 1 }), 'superseded', '2025-06-20T10:00:00Z');
    expect(offer.status).toBe('superseded');
  });

  it('throws when offer is already accepted (terminal)', () => {
    expect(() =>
      failOffer(baseOffer({ status: 'accepted' }), baseAssignment(), baseReq(), 'declined'),
    ).toThrow(/not allowed/);
  });
});

// ---------------------------------------------------------------------------
// isOfferExpired
// ---------------------------------------------------------------------------

describe('isOfferExpired', () => {
  it('returns true when expires_at is in the past', () => {
    const offer = baseOffer({ expires_at: '2025-01-01T00:00:00Z' });
    expect(isOfferExpired(offer, '2025-06-01T00:00:00Z')).toBe(true);
  });

  it('returns false when expires_at is in the future', () => {
    const offer = baseOffer({ expires_at: '2025-12-01T00:00:00Z' });
    expect(isOfferExpired(offer, '2025-06-01T00:00:00Z')).toBe(false);
  });

  it('returns false when no expires_at', () => {
    expect(isOfferExpired(baseOffer())).toBe(false);
  });

  it('returns false when offer is not in issued status', () => {
    const offer = baseOffer({ status: 'draft', expires_at: '2025-01-01T00:00:00Z' });
    expect(isOfferExpired(offer, '2025-06-01T00:00:00Z')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// summarizeOffer — rate withheld
// ---------------------------------------------------------------------------

describe('summarizeOffer', () => {
  it('omits rate_minor and currency from summary', () => {
    const summary = summarizeOffer(baseOffer());
    expect((summary as Record<string, unknown>).rate_minor).toBeUndefined();
    expect((summary as Record<string, unknown>).currency).toBeUndefined();
  });

  it('includes status, role, start_date', () => {
    const summary = summarizeOffer(baseOffer());
    expect(summary.status).toBe('issued');
    expect(summary.role).toBe('lighting_director');
    expect(summary.start_date).toBe('2025-09-01');
  });
});
