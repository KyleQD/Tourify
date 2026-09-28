/**
 * HIRE-406 — Convert without duplicate identity
 *
 * Completion of onboarding activates an organization person, a tour role
 * assignment, and Work Mode access in one idempotent workflow.
 * Rollback / retry cannot duplicate rows.
 *
 * Design:
 *   - A ConversionRecord tracks the single-pass state machine.
 *   - Each step is guarded by an idempotency check (step_completed flags).
 *   - Retry calls are safe: completed steps are no-ops; only pending steps run.
 *   - Rollback marks the record `rolled_back`; retry after rollback requires
 *     explicit reset by admin.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Conversion step identifiers (run in order)
// ---------------------------------------------------------------------------

export type ConversionStep =
  | 'create_org_person'      // upsert organization_people by (org_id, user_id OR email)
  | 'create_tour_role'       // upsert tour_role_assignments for this hire
  | 'grant_work_mode'        // upsert work_mode access record
  | 'update_onboarding'      // mark onboarding instance complete
  | 'update_offer'           // mark offer accepted + assignment confirmed
  | 'update_requisition';    // reconcile headcount (already handled by HIRE-403; here for audit)

export const CONVERSION_STEPS_ORDER: ConversionStep[] = [
  'create_org_person',
  'create_tour_role',
  'grant_work_mode',
  'update_onboarding',
  'update_offer',
  'update_requisition',
];

// ---------------------------------------------------------------------------
// Conversion lifecycle
// ---------------------------------------------------------------------------

export type ConversionStatus =
  | 'pending'       // not yet started
  | 'in_progress'   // started; some steps complete
  | 'complete'      // all steps done
  | 'rolled_back'   // undone by admin
  | 'failed';       // irrecoverable error; needs manual investigation

export interface ConversionStepResult {
  step: ConversionStep;
  completed: boolean;
  completed_at?: string;
  idempotency_key: string;   // prevents double-execution
  error?: string;
}

export interface ConversionRecord {
  id: string;
  org_id: string;

  /** Links */
  application_id: string;
  offer_id: string;
  requisition_id: string;
  onboarding_instance_id: string;

  /** Identity references — set as steps complete */
  user_id?: string;            // from invite / existing account
  org_person_id?: string;      // set after create_org_person
  tour_role_assignment_id?: string;  // set after create_tour_role
  work_mode_access_id?: string;      // set after grant_work_mode

  /** Applicant data needed for upsert */
  applicant_email: string;
  applicant_name: string;
  role: string;
  department: string;
  tour_id?: string;
  event_id?: string;
  start_date: string;
  end_date?: string;
  employment_type: string;

  status: ConversionStatus;
  steps: ConversionStepResult[];

  rollback_reason?: string;
  rolled_back_by?: string;
  rolled_back_at?: string;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Idempotency key generation (deterministic)
// ---------------------------------------------------------------------------

export function conversionIdempotencyKey(
  conversionId: string,
  step: ConversionStep,
): string {
  return `conv:${conversionId}:${step}`;
}

// ---------------------------------------------------------------------------
// Initialize a new conversion record
// ---------------------------------------------------------------------------

export function initConversion(
  params: Omit<ConversionRecord, 'status' | 'steps' | 'created_at' | 'updated_at'> & { now?: string },
): ConversionRecord {
  const now = params.now ?? new Date().toISOString();
  const { now: _now, ...rest } = params;
  void _now;

  const steps: ConversionStepResult[] = CONVERSION_STEPS_ORDER.map(step => ({
    step,
    completed: false,
    idempotency_key: conversionIdempotencyKey(rest.id, step),
  }));

  return {
    ...rest,
    status: 'pending',
    steps,
    created_at: now,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Mark a step complete (idempotent)
// ---------------------------------------------------------------------------

export interface MarkStepInput {
  step: ConversionStep;
  org_person_id?: string;
  tour_role_assignment_id?: string;
  work_mode_access_id?: string;
  now?: string;
}

export function markStepComplete(
  record: ConversionRecord,
  input: MarkStepInput,
): ConversionRecord {
  const ts = input.now ?? new Date().toISOString();

  // Idempotent: if already complete, return unchanged
  const existingStep = record.steps.find(s => s.step === input.step);
  if (!existingStep) throw new Error(`Unknown step: ${input.step}`);
  if (existingStep.completed) return record;   // no-op

  if (record.status === 'rolled_back') {
    throw new Error('Cannot mark a step complete on a rolled-back conversion. Reset first.');
  }

  const updatedSteps = record.steps.map(s =>
    s.step === input.step ? { ...s, completed: true, completed_at: ts } : s,
  );

  const allComplete = updatedSteps.every(s => s.completed);
  const newStatus: ConversionStatus = allComplete ? 'complete' : 'in_progress';

  return {
    ...record,
    status: newStatus,
    org_person_id: input.org_person_id ?? record.org_person_id,
    tour_role_assignment_id: input.tour_role_assignment_id ?? record.tour_role_assignment_id,
    work_mode_access_id: input.work_mode_access_id ?? record.work_mode_access_id,
    steps: updatedSteps,
    updated_at: ts,
  };
}

// ---------------------------------------------------------------------------
// Mark a step failed
// ---------------------------------------------------------------------------

export function markStepFailed(
  record: ConversionRecord,
  step: ConversionStep,
  error: string,
  now?: string,
): ConversionRecord {
  const ts = now ?? new Date().toISOString();
  const updatedSteps = record.steps.map(s =>
    s.step === step ? { ...s, error } : s,
  );
  return { ...record, status: 'failed', steps: updatedSteps, updated_at: ts };
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

export function rollbackConversion(
  record: ConversionRecord,
  reason: string,
  rolledBackBy: string,
  now?: string,
): ConversionRecord {
  if (record.status === 'complete') {
    throw new Error('Cannot roll back a completed conversion. Use a reversal workflow.');
  }
  if (record.status === 'rolled_back') return record; // idempotent
  const ts = now ?? new Date().toISOString();
  return {
    ...record,
    status: 'rolled_back',
    rollback_reason: reason,
    rolled_back_by: rolledBackBy,
    rolled_back_at: ts,
    updated_at: ts,
  };
}

// ---------------------------------------------------------------------------
// Reset for retry (admin-only; only from failed/rolled_back)
// ---------------------------------------------------------------------------

export function resetConversionForRetry(
  record: ConversionRecord,
  now?: string,
): ConversionRecord {
  if (record.status !== 'failed' && record.status !== 'rolled_back') {
    throw new Error(`Cannot reset conversion from status '${record.status}'.`);
  }
  const ts = now ?? new Date().toISOString();
  const steps = record.steps.map(s => ({
    ...s,
    // keep completed steps as-is (idempotent resume); clear errors
    error: undefined,
  }));
  return {
    ...record,
    status: record.steps.some(s => s.completed) ? 'in_progress' : 'pending',
    steps,
    rollback_reason: undefined,
    rolled_back_by: undefined,
    rolled_back_at: undefined,
    updated_at: ts,
  };
}

// ---------------------------------------------------------------------------
// nextPendingStep — returns the next step to run on resume
// ---------------------------------------------------------------------------

export function nextPendingStep(record: ConversionRecord): ConversionStep | null {
  const next = record.steps.find(s => !s.completed);
  return next ? next.step : null;
}

// ---------------------------------------------------------------------------
// isConversionDuplicate — detects if a second conversion for the same
// application/offer pair already exists and is not rolled back
// ---------------------------------------------------------------------------

export function isConversionDuplicate(
  existing: ConversionRecord[],
  applicationId: string,
  offerId: string,
): boolean {
  return existing.some(
    r =>
      r.application_id === applicationId &&
      r.offer_id === offerId &&
      r.status !== 'rolled_back',
  );
}

// ---------------------------------------------------------------------------
// Conversion summary (for dashboard)
// ---------------------------------------------------------------------------

export interface ConversionSummary {
  id: string;
  org_id: string;
  application_id: string;
  offer_id: string;
  status: ConversionStatus;
  steps_complete: number;
  steps_total: number;
  next_step: ConversionStep | null;
  has_error: boolean;
  org_person_id?: string;
  tour_role_assignment_id?: string;
  work_mode_access_id?: string;
  created_at: string;
}

export function summarizeConversion(record: ConversionRecord): ConversionSummary {
  return {
    id: record.id,
    org_id: record.org_id,
    application_id: record.application_id,
    offer_id: record.offer_id,
    status: record.status,
    steps_complete: record.steps.filter(s => s.completed).length,
    steps_total: record.steps.length,
    next_step: nextPendingStep(record),
    has_error: record.steps.some(s => !!s.error),
    org_person_id: record.org_person_id,
    tour_role_assignment_id: record.tour_role_assignment_id,
    work_mode_access_id: record.work_mode_access_id,
    created_at: record.created_at,
  };
}
