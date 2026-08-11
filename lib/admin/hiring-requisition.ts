/**
 * HIRE-401 — Standardize requisition workflow
 *
 * Models a hiring requisition with a 5-status lifecycle
 * (draft → approval_pending → open → paused → closed) and
 * configurable required-field validation.  Pure domain logic;
 * no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Status and transitions
// ---------------------------------------------------------------------------

export type RequisitionStatus =
  | 'draft'
  | 'approval_pending'
  | 'open'
  | 'paused'
  | 'closed';

/** Allowed transitions.  Key = current status, value = permitted next statuses. */
export const REQUISITION_TRANSITIONS: Record<RequisitionStatus, RequisitionStatus[]> = {
  draft: ['approval_pending', 'closed'],
  approval_pending: ['open', 'draft', 'closed'],
  open: ['paused', 'closed'],
  paused: ['open', 'closed'],
  closed: [], // terminal
};

export function canTransitionRequisition(
  from: RequisitionStatus,
  to: RequisitionStatus,
): boolean {
  return REQUISITION_TRANSITIONS[from].includes(to);
}

export interface RequisitionTransitionResult {
  ok: boolean;
  status: RequisitionStatus;
  error?: string;
}

export function transitionRequisition(
  req: HiringRequisition,
  to: RequisitionStatus,
  actorCapability: 'hiring.manage' | 'hiring.approve',
): RequisitionTransitionResult {
  if (!canTransitionRequisition(req.status, to)) {
    return {
      ok: false,
      status: req.status,
      error: `Transition ${req.status} → ${to} is not allowed.`,
    };
  }
  if (to === 'open' && req.status === 'approval_pending') {
    if (actorCapability !== 'hiring.approve') {
      return {
        ok: false,
        status: req.status,
        error: 'Only hiring.approve capability can transition approval_pending → open.',
      };
    }
  }
  return { ok: true, status: to };
}

// ---------------------------------------------------------------------------
// Rate range (currency-agnostic; amounts in minor units)
// ---------------------------------------------------------------------------

export interface RateRange {
  currency: string;      // ISO 4217
  min_minor: number;
  max_minor: number;
  rate_type: 'hourly' | 'daily' | 'weekly' | 'flat' | 'tbd';
}

// ---------------------------------------------------------------------------
// Travel configuration
// ---------------------------------------------------------------------------

export type TravelRequirement = 'none' | 'local' | 'regional' | 'touring' | 'international';

export interface RequisitionTravelConfig {
  requirement: TravelRequirement;
  tour_id?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Core HiringRequisition record
// ---------------------------------------------------------------------------

export interface HiringRequisition {
  id: string;
  org_id: string;

  // Status
  status: RequisitionStatus;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;  // ISO-8601

  // Role / scope
  title: string;
  role: string;
  department: string;
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'freelance' | 'volunteer';

  // Scope linkage
  tour_id?: string;
  event_id?: string;

  // Dates
  start_date: string;    // YYYY-MM-DD local
  end_date?: string;     // YYYY-MM-DD local
  open_date?: string;    // When posted
  close_date?: string;   // Effective close

  // Headcount
  headcount_total: number;     // positions being recruited
  headcount_filled: number;    // confirmed acceptances
  headcount_reserved: number;  // offers extended but not yet accepted

  // Compensation
  rate?: RateRange;

  // Requirements
  required_skills: string[];
  preferred_skills: string[];
  credential_requirements: string[];  // free-text or credential-type references

  // Travel
  travel: RequisitionTravelConfig;

  // Ownership and tracking
  owner_id: string;       // hiring.manage user
  created_by: string;
  created_at: string;     // ISO-8601
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation configuration
// ---------------------------------------------------------------------------

export interface RequisitionRequiredFieldConfig {
  require_tour_id: boolean;
  require_event_id: boolean;
  require_rate: boolean;
  require_skills: boolean;         // at least one required_skill
  require_travel_config: boolean;  // travel.requirement !== 'none' or explicitly set
  require_close_date: boolean;
  require_credential_requirements: boolean;
}

/** Sensible default — everything core is required; rate is required by default. */
export const DEFAULT_REQUISITION_REQUIRED_FIELDS: RequisitionRequiredFieldConfig = {
  require_tour_id: false,
  require_event_id: false,
  require_rate: true,
  require_skills: true,
  require_travel_config: true,
  require_close_date: false,
  require_credential_requirements: false,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RequisitionValidationResult {
  valid: boolean;
  missing_fields: string[];
  errors: string[];
}

/**
 * Validate a requisition against both invariant rules and the supplied
 * organisation-level required-field config.
 */
export function validateRequisition(
  req: HiringRequisition,
  config: RequisitionRequiredFieldConfig = DEFAULT_REQUISITION_REQUIRED_FIELDS,
): RequisitionValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  // --- Invariant required fields (always) ---
  if (!req.title.trim()) missing.push('title');
  if (!req.role.trim()) missing.push('role');
  if (!req.department.trim()) missing.push('department');
  if (!req.start_date) missing.push('start_date');
  if (!req.owner_id) missing.push('owner_id');
  if (req.headcount_total < 1) errors.push('headcount_total must be >= 1.');

  // --- Configurable required fields ---
  if (config.require_tour_id && !req.tour_id) missing.push('tour_id');
  if (config.require_event_id && !req.event_id) missing.push('event_id');

  if (config.require_rate) {
    if (!req.rate) {
      missing.push('rate');
    } else {
      if (req.rate.min_minor < 0) errors.push('rate.min_minor must be >= 0.');
      if (req.rate.max_minor < req.rate.min_minor)
        errors.push('rate.max_minor must be >= rate.min_minor.');
    }
  }

  if (config.require_skills && req.required_skills.length === 0) missing.push('required_skills');

  if (config.require_travel_config) {
    // travel is always present as a field; check it is meaningfully set
    if (!req.travel || !req.travel.requirement) missing.push('travel.requirement');
  }

  if (config.require_close_date && !req.close_date) missing.push('close_date');
  if (config.require_credential_requirements && req.credential_requirements.length === 0)
    missing.push('credential_requirements');

  // --- Consistency checks ---
  if (req.end_date && req.start_date > req.end_date) {
    errors.push('end_date must be >= start_date.');
  }
  if (req.close_date && req.open_date && req.close_date < req.open_date) {
    errors.push('close_date must be >= open_date.');
  }
  if (req.headcount_filled < 0) errors.push('headcount_filled must be >= 0.');
  if (req.headcount_reserved < 0) errors.push('headcount_reserved must be >= 0.');
  if (req.headcount_filled + req.headcount_reserved > req.headcount_total) {
    errors.push('headcount_filled + headcount_reserved cannot exceed headcount_total.');
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing_fields: missing,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Headcount helpers
// ---------------------------------------------------------------------------

export interface RequisitionHeadcountSummary {
  total: number;
  filled: number;
  reserved: number;
  open: number;
  is_fully_staffed: boolean;
}

export function getHeadcountSummary(req: HiringRequisition): RequisitionHeadcountSummary {
  const open = Math.max(0, req.headcount_total - req.headcount_filled - req.headcount_reserved);
  return {
    total: req.headcount_total,
    filled: req.headcount_filled,
    reserved: req.headcount_reserved,
    open,
    is_fully_staffed: open === 0 && req.headcount_reserved === 0 && req.headcount_filled >= req.headcount_total,
  };
}

/** Increment filled count; auto-close if fully staffed. */
export function recordAcceptance(
  req: HiringRequisition,
): { updated: HiringRequisition; headcount: RequisitionHeadcountSummary } {
  const next: HiringRequisition = {
    ...req,
    headcount_filled: req.headcount_filled + 1,
    headcount_reserved: Math.max(0, req.headcount_reserved - 1),
  };
  const headcount = getHeadcountSummary(next);
  if (headcount.is_fully_staffed && next.status === 'open') {
    next.status = 'closed';
  }
  return { updated: next, headcount };
}

/** Decrement reserved on offer decline/expiry. */
export function releaseReservation(req: HiringRequisition): HiringRequisition {
  return {
    ...req,
    headcount_reserved: Math.max(0, req.headcount_reserved - 1),
  };
}

/** Increment reserved when an offer is extended. */
export function reserveHeadcount(req: HiringRequisition): RequisitionHeadcountSummary | null {
  const summary = getHeadcountSummary(req);
  if (summary.open < 1) return null; // no open slots
  return {
    ...summary,
    reserved: summary.reserved + 1,
    open: summary.open - 1,
    is_fully_staffed: false,
  };
}

// ---------------------------------------------------------------------------
// Factory / makeRequisition
// ---------------------------------------------------------------------------

export function makeRequisition(
  partial: Omit<HiringRequisition, 'headcount_filled' | 'headcount_reserved' | 'status' | 'required_skills' | 'preferred_skills' | 'credential_requirements'> &
    Partial<Pick<HiringRequisition, 'status' | 'required_skills' | 'preferred_skills' | 'credential_requirements' | 'headcount_filled' | 'headcount_reserved'>>,
): HiringRequisition {
  return {
    required_skills: [],
    preferred_skills: [],
    credential_requirements: [],
    status: 'draft',
    headcount_filled: 0,
    headcount_reserved: 0,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Requisition summary (for list views — rate is withheld unless caller has cap)
// ---------------------------------------------------------------------------

export interface RequisitionSummary {
  id: string;
  org_id: string;
  title: string;
  role: string;
  department: string;
  employment_type: HiringRequisition['employment_type'];
  status: RequisitionStatus;
  tour_id?: string;
  event_id?: string;
  start_date: string;
  end_date?: string;
  headcount: RequisitionHeadcountSummary;
  travel_requirement: TravelRequirement;
  owner_id: string;
  created_at: string;
  // rate is intentionally omitted — only surfaced with hiring.manage or finance cap
}

export function summarizeRequisition(req: HiringRequisition): RequisitionSummary {
  return {
    id: req.id,
    org_id: req.org_id,
    title: req.title,
    role: req.role,
    department: req.department,
    employment_type: req.employment_type,
    status: req.status,
    tour_id: req.tour_id,
    event_id: req.event_id,
    start_date: req.start_date,
    end_date: req.end_date,
    headcount: getHeadcountSummary(req),
    travel_requirement: req.travel.requirement,
    owner_id: req.owner_id,
    created_at: req.created_at,
  };
}
