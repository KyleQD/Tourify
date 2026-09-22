/**
 * HIRE-403 — Build offer/engagement handoff
 *
 * An approved candidate creates a contract/offer and a contingent
 * tour_role_assignment.  Failed / declined / expired outcomes reconcile
 * the requisition headcount back to open.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { HiringApplication } from './hiring-application-pipeline';
import type { HiringRequisition } from './hiring-requisition';
import { releaseReservation, recordAcceptance } from './hiring-requisition';

// ---------------------------------------------------------------------------
// Offer lifecycle
// ---------------------------------------------------------------------------

export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'issued'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired'
  | 'superseded';

export const OFFER_STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  draft: ['pending_approval', 'withdrawn'],
  pending_approval: ['issued', 'draft', 'withdrawn'],
  issued: ['accepted', 'declined', 'withdrawn', 'expired', 'superseded'],
  accepted: [],        // terminal — handoff to engagement/onboarding
  declined: [],        // terminal — reconcile headcount
  withdrawn: [],       // terminal — reconcile headcount
  expired: [],         // terminal — reconcile headcount
  superseded: [],      // terminal — a replacement offer was issued
};

/** Outcomes that release a reserved headcount slot back to open */
export const OFFER_RELEASE_STATUSES: Set<OfferStatus> = new Set([
  'declined',
  'withdrawn',
  'expired',
  'superseded',
]);

export interface OfferTransitionResult {
  ok: boolean;
  status: OfferStatus;
  error?: string;
}

export function transitionOffer(
  current: OfferStatus,
  next: OfferStatus,
): OfferTransitionResult {
  if (!OFFER_STATUS_TRANSITIONS[current].includes(next)) {
    return { ok: false, status: current, error: `Offer transition ${current} → ${next} is not allowed.` };
  }
  return { ok: true, status: next };
}

// ---------------------------------------------------------------------------
// Offer record
// ---------------------------------------------------------------------------

export type EmploymentCategory = 'employee' | 'contractor' | 'freelance' | 'volunteer';

export interface OfferRecord {
  id: string;
  org_id: string;
  application_id: string;
  requisition_id: string;

  status: OfferStatus;

  // Compensation (currency-agnostic minor-unit amounts)
  currency: string;
  rate_minor: number;
  rate_type: 'hourly' | 'daily' | 'weekly' | 'flat';
  employment_category: EmploymentCategory;

  // Engagement scope
  tour_id?: string;
  event_id?: string;
  role: string;
  department: string;
  start_date: string;    // YYYY-MM-DD
  end_date?: string;

  // Contract reference
  contract_id?: string;

  // Expiry
  expires_at?: string;   // ISO-8601

  // Audit
  issued_by: string;
  issued_at?: string;
  accepted_at?: string;
  declined_at?: string;
  withdrawn_at?: string;
  expired_at?: string;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Contingent assignment
// ---------------------------------------------------------------------------

/**
 * A contingent_pending assignment is created immediately on offer issued.
 * It converts to 'confirmed' on acceptance, or is removed on failure.
 */
export type ContingentAssignmentStatus =
  | 'contingent_pending'   // offer issued, waiting for response
  | 'confirmed'            // offer accepted; onboarding may begin
  | 'cancelled';           // offer failed; slot returned

export interface ContingentAssignment {
  id: string;
  org_id: string;
  offer_id: string;
  application_id: string;
  requisition_id: string;
  person_id?: string;       // may not exist yet (applicant not yet in org)
  role: string;
  department: string;
  tour_id?: string;
  event_id?: string;
  start_date: string;
  end_date?: string;
  status: ContingentAssignmentStatus;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Create offer + contingent assignment from approved application
// ---------------------------------------------------------------------------

export interface CreateOfferInput {
  offer_id: string;
  assignment_id: string;
  org_id: string;
  application: HiringApplication;
  issued_by: string;
  currency: string;
  rate_minor: number;
  rate_type: OfferRecord['rate_type'];
  employment_category: EmploymentCategory;
  role: string;
  department: string;
  tour_id?: string;
  event_id?: string;
  start_date: string;
  end_date?: string;
  contract_id?: string;
  expires_at?: string;
  now?: string;   // ISO-8601; defaults to current time (injection for tests)
}

export interface CreateOfferResult {
  offer: OfferRecord;
  assignment: ContingentAssignment;
}

export function createOfferFromApprovedApplication(input: CreateOfferInput): CreateOfferResult {
  if (input.application.stage !== 'offer_pending' && input.application.stage !== 'offer_extended') {
    throw new Error(
      `Cannot create offer: application stage is '${input.application.stage}'. Must be offer_pending or offer_extended.`,
    );
  }

  const now = input.now ?? new Date().toISOString();

  const offer: OfferRecord = {
    id: input.offer_id,
    org_id: input.org_id,
    application_id: input.application.id,
    requisition_id: input.application.requisition_id,
    status: 'issued',
    currency: input.currency,
    rate_minor: input.rate_minor,
    rate_type: input.rate_type,
    employment_category: input.employment_category,
    tour_id: input.tour_id,
    event_id: input.event_id,
    role: input.role,
    department: input.department,
    start_date: input.start_date,
    end_date: input.end_date,
    contract_id: input.contract_id,
    expires_at: input.expires_at,
    issued_by: input.issued_by,
    issued_at: now,
    created_at: now,
    updated_at: now,
  };

  const assignment: ContingentAssignment = {
    id: input.assignment_id,
    org_id: input.org_id,
    offer_id: input.offer_id,
    application_id: input.application.id,
    requisition_id: input.application.requisition_id,
    role: input.role,
    department: input.department,
    tour_id: input.tour_id,
    event_id: input.event_id,
    start_date: input.start_date,
    end_date: input.end_date,
    status: 'contingent_pending',
    created_at: now,
    updated_at: now,
  };

  return { offer, assignment };
}

// ---------------------------------------------------------------------------
// Accept offer
// ---------------------------------------------------------------------------

export interface AcceptOfferResult {
  offer: OfferRecord;
  assignment: ContingentAssignment;
  requisition: HiringRequisition;
}

export function acceptOffer(
  offer: OfferRecord,
  assignment: ContingentAssignment,
  requisition: HiringRequisition,
  personId: string,
  now?: string,
): AcceptOfferResult {
  const ts = now ?? new Date().toISOString();
  const transitionResult = transitionOffer(offer.status, 'accepted');
  if (!transitionResult.ok) throw new Error(transitionResult.error);

  const updatedOffer: OfferRecord = {
    ...offer,
    status: 'accepted',
    accepted_at: ts,
    updated_at: ts,
  };

  const updatedAssignment: ContingentAssignment = {
    ...assignment,
    status: 'confirmed',
    person_id: personId,
    updated_at: ts,
  };

  const { updated: updatedRequisition } = recordAcceptance(requisition);

  return { offer: updatedOffer, assignment: updatedAssignment, requisition: updatedRequisition };
}

// ---------------------------------------------------------------------------
// Fail offer (decline / withdraw / expire / supersede)
// ---------------------------------------------------------------------------

export type OfferFailureReason = 'declined' | 'withdrawn' | 'expired' | 'superseded';

export interface FailOfferResult {
  offer: OfferRecord;
  assignment: ContingentAssignment;
  requisition: HiringRequisition;
}

export function failOffer(
  offer: OfferRecord,
  assignment: ContingentAssignment,
  requisition: HiringRequisition,
  reason: OfferFailureReason,
  now?: string,
): FailOfferResult {
  const ts = now ?? new Date().toISOString();

  const transitionResult = transitionOffer(offer.status, reason);
  if (!transitionResult.ok) throw new Error(transitionResult.error);

  const updatedOffer: OfferRecord = {
    ...offer,
    status: reason,
    declined_at: reason === 'declined' ? ts : offer.declined_at,
    withdrawn_at: reason === 'withdrawn' ? ts : offer.withdrawn_at,
    expired_at: reason === 'expired' ? ts : offer.expired_at,
    updated_at: ts,
  };

  const updatedAssignment: ContingentAssignment = {
    ...assignment,
    status: 'cancelled',
    updated_at: ts,
  };

  // Release the reserved headcount slot back to open
  const updatedRequisition = releaseReservation(requisition);

  return { offer: updatedOffer, assignment: updatedAssignment, requisition: updatedRequisition };
}

// ---------------------------------------------------------------------------
// isOfferExpired — pure check against a given now
// ---------------------------------------------------------------------------

export function isOfferExpired(offer: OfferRecord, now?: string): boolean {
  if (!offer.expires_at) return false;
  if (offer.status !== 'issued') return false;
  const nowTs = now ?? new Date().toISOString();
  return offer.expires_at <= nowTs;
}

// ---------------------------------------------------------------------------
// Offer summary (for dashboard; rate withheld unless finance cap)
// ---------------------------------------------------------------------------

export interface OfferSummary {
  id: string;
  org_id: string;
  application_id: string;
  requisition_id: string;
  status: OfferStatus;
  employment_category: EmploymentCategory;
  role: string;
  department: string;
  tour_id?: string;
  event_id?: string;
  start_date: string;
  end_date?: string;
  expires_at?: string;
  issued_at?: string;
}

export function summarizeOffer(offer: OfferRecord): OfferSummary {
  return {
    id: offer.id,
    org_id: offer.org_id,
    application_id: offer.application_id,
    requisition_id: offer.requisition_id,
    status: offer.status,
    employment_category: offer.employment_category,
    role: offer.role,
    department: offer.department,
    tour_id: offer.tour_id,
    event_id: offer.event_id,
    start_date: offer.start_date,
    end_date: offer.end_date,
    expires_at: offer.expires_at,
    issued_at: offer.issued_at,
  };
}
