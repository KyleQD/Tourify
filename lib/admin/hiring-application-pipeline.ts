/**
 * HIRE-402 — Harden application pipeline
 *
 * Models an application through a structured pipeline:
 *   received → screening → interview → assessment → offer_pending → offer_extended
 *   → accepted | declined | withdrawn | rejected | on_hold | duplicate_blocked
 *
 * Covers: stage transitions, notes, interview tasks, decision reasons,
 * consent/retention, duplicate applicant handling, and role-aware exports.
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

export type ApplicationStage =
  | 'received'
  | 'screening'
  | 'interview'
  | 'assessment'
  | 'offer_pending'
  | 'offer_extended'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'rejected'
  | 'on_hold'
  | 'duplicate_blocked';

/** Terminal stages that cannot be re-opened without explicit admin action */
export const TERMINAL_STAGES: Set<ApplicationStage> = new Set([
  'accepted',
  'declined',
  'withdrawn',
  'rejected',
  'duplicate_blocked',
]);

/** Allowed forward and back-track transitions */
export const APPLICATION_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  received: ['screening', 'rejected', 'withdrawn', 'on_hold', 'duplicate_blocked'],
  screening: ['interview', 'rejected', 'withdrawn', 'on_hold', 'duplicate_blocked', 'received'],
  interview: ['assessment', 'offer_pending', 'rejected', 'withdrawn', 'on_hold', 'screening'],
  assessment: ['offer_pending', 'rejected', 'withdrawn', 'on_hold', 'interview'],
  offer_pending: ['offer_extended', 'rejected', 'withdrawn', 'on_hold', 'assessment'],
  offer_extended: ['accepted', 'declined', 'withdrawn'],
  accepted: [],
  declined: [],
  withdrawn: [],
  rejected: ['received'],   // re-open only by explicit admin
  on_hold: ['screening', 'interview', 'assessment', 'offer_pending', 'rejected', 'withdrawn'],
  duplicate_blocked: ['rejected', 'received'],
};

// Stages where a decision_reason is mandatory on transition out
const DECISION_REASON_REQUIRED_STAGES: Set<ApplicationStage> = new Set([
  'rejected',
  'declined',
]);

export interface StageTransitionResult {
  ok: boolean;
  stage: ApplicationStage;
  error?: string;
}

export function transitionApplicationStage(
  current: ApplicationStage,
  next: ApplicationStage,
  decisionReason: string | undefined,
): StageTransitionResult {
  if (!APPLICATION_TRANSITIONS[current].includes(next)) {
    return { ok: false, stage: current, error: `Transition ${current} → ${next} is not allowed.` };
  }
  if (DECISION_REASON_REQUIRED_STAGES.has(next) && (!decisionReason || !decisionReason.trim())) {
    return { ok: false, stage: current, error: `decision_reason is required when moving to '${next}'.` };
  }
  return { ok: true, stage: next };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export type NoteVisibility = 'internal' | 'interviewer' | 'hiring_manage_only';

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_id: string;
  visibility: NoteVisibility;
  body: string;
  stage_at_time: ApplicationStage;
  created_at: string;
  updated_at: string;
}

export function isNoteVisible(
  note: ApplicationNote,
  capability: 'hiring.manage' | 'interviewer' | 'workforce.view',
): boolean {
  switch (note.visibility) {
    case 'hiring_manage_only': return capability === 'hiring.manage';
    case 'interviewer': return capability === 'hiring.manage' || capability === 'interviewer';
    case 'internal': return true;
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Interview tasks
// ---------------------------------------------------------------------------

export type InterviewTaskStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface InterviewTask {
  id: string;
  application_id: string;
  title: string;                  // e.g. "Phone screen", "Technical interview"
  interview_type: 'phone' | 'video' | 'in_person' | 'panel' | 'test' | 'portfolio_review';
  status: InterviewTaskStatus;
  assigned_interviewer_id?: string;
  scheduled_at?: string;          // ISO-8601
  completed_at?: string;
  outcome?: 'pass' | 'fail' | 'deferred' | 'no_decision';
  notes?: string;
  created_at: string;
}

export function canCompleteInterviewTask(task: InterviewTask): boolean {
  return task.status === 'scheduled' || task.status === 'pending';
}

export function completeInterviewTask(
  task: InterviewTask,
  outcome: InterviewTask['outcome'],
  notes?: string,
): InterviewTask {
  if (!canCompleteInterviewTask(task)) {
    throw new Error(`Interview task ${task.id} cannot be completed from status '${task.status}'.`);
  }
  return {
    ...task,
    status: 'completed',
    outcome,
    notes: notes ?? task.notes,
    completed_at: new Date().toISOString(),
  };
}

export function allRequiredInterviewsComplete(tasks: InterviewTask[]): boolean {
  const required = tasks.filter(t => t.status !== 'cancelled');
  return required.every(t => t.status === 'completed');
}

// ---------------------------------------------------------------------------
// Consent and retention
// ---------------------------------------------------------------------------

export type RetentionPeriod = '30d' | '90d' | '180d' | '365d' | '2y' | 'indefinite';

export interface ApplicantConsent {
  consented_at: string;             // ISO-8601
  consent_version: string;          // e.g. "v2.1"
  data_retention_period: RetentionPeriod;
  consent_marketing?: boolean;
  consent_profiling?: boolean;
  withdrawn_at?: string;            // ISO-8601 if consent was withdrawn
}

export function isConsentActive(consent: ApplicantConsent): boolean {
  return !consent.withdrawn_at;
}

export function retentionExpiryDate(consent: ApplicantConsent, fromDate: string): string | null {
  if (consent.data_retention_period === 'indefinite') return null;
  const base = new Date(fromDate);
  const map: Record<RetentionPeriod, number> = {
    '30d': 30, '90d': 90, '180d': 180, '365d': 365, '2y': 730, 'indefinite': 0,
  };
  const days = map[consent.data_retention_period];
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Duplicate applicant handling
// ---------------------------------------------------------------------------

export type DuplicateSignal =
  | 'same_email'
  | 'same_phone'
  | 'same_name_and_org'
  | 'same_identity_record';

export interface DuplicateApplicationFlag {
  duplicate_of_application_id: string;
  signals: DuplicateSignal[];
  confidence: 'low' | 'medium' | 'high';
  reviewed_by?: string;
  reviewed_at?: string;
  resolution?: 'blocked' | 'allowed' | 'merged';
}

/** Flags with high confidence or same_identity_record are blocking by default */
export function isDuplicateBlocking(flag: DuplicateApplicationFlag): boolean {
  return flag.confidence === 'high' || flag.signals.includes('same_identity_record');
}

// ---------------------------------------------------------------------------
// Core Application record
// ---------------------------------------------------------------------------

export interface HiringApplication {
  id: string;
  org_id: string;
  requisition_id: string;

  // Applicant identity (may link to an org person if already known)
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  existing_person_id?: string;   // links to organization_people if known

  // Pipeline state
  stage: ApplicationStage;
  decision_reason?: string;      // required on rejection/decline

  // Consent
  consent: ApplicantConsent;

  // Duplicate
  duplicate_flag?: DuplicateApplicationFlag;

  // Metadata
  source: 'internal' | 'external' | 'referral' | 'agency';
  referral_by?: string;
  applied_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Role-aware export projection
// ---------------------------------------------------------------------------

/**
 * Fields that require hiring.manage; interviewers see a redacted view.
 * The export never includes fields the caller is not authorized for.
 */
export type ApplicationExportCapability = 'hiring.manage' | 'interviewer';

export interface ApplicationExportRow {
  id: string;
  requisition_id: string;
  applicant_name: string;
  applicant_email?: string;        // withheld for interviewer unless interviewing
  stage: ApplicationStage;
  decision_reason?: string;
  source: HiringApplication['source'];
  applied_at: string;
  // Sensitive fields only for hiring.manage
  applicant_phone?: string;
  existing_person_id?: string;
  duplicate_flag_confidence?: DuplicateApplicationFlag['confidence'];
  consent_retention_period?: RetentionPeriod;
}

export function projectApplicationForExport(
  app: HiringApplication,
  capability: ApplicationExportCapability,
): ApplicationExportRow {
  const base: ApplicationExportRow = {
    id: app.id,
    requisition_id: app.requisition_id,
    applicant_name: app.applicant_name,
    stage: app.stage,
    decision_reason: app.decision_reason,
    source: app.source,
    applied_at: app.applied_at,
  };

  if (capability === 'hiring.manage') {
    base.applicant_email = app.applicant_email;
    base.applicant_phone = app.applicant_phone;
    base.existing_person_id = app.existing_person_id;
    base.duplicate_flag_confidence = app.duplicate_flag?.confidence;
    base.consent_retention_period = app.consent.data_retention_period;
  }
  // Interviewers do NOT see PII or sensitive fields

  return base;
}

export function exportApplications(
  apps: HiringApplication[],
  capability: ApplicationExportCapability,
): ApplicationExportRow[] {
  return apps.map(app => projectApplicationForExport(app, capability));
}

// ---------------------------------------------------------------------------
// Pipeline summary (for dashboard)
// ---------------------------------------------------------------------------

export interface ApplicationPipelineSummary {
  by_stage: Record<ApplicationStage, number>;
  total: number;
  blocked_duplicates: number;
  on_hold: number;
  terminal: number;
}

export function summarizePipeline(apps: HiringApplication[]): ApplicationPipelineSummary {
  const by_stage = {} as Record<ApplicationStage, number>;
  let blocked_duplicates = 0;
  let on_hold = 0;
  let terminal = 0;

  for (const app of apps) {
    by_stage[app.stage] = (by_stage[app.stage] ?? 0) + 1;
    if (app.stage === 'duplicate_blocked') blocked_duplicates++;
    if (app.stage === 'on_hold') on_hold++;
    if (TERMINAL_STAGES.has(app.stage)) terminal++;
  }

  return { by_stage, total: apps.length, blocked_duplicates, on_hold, terminal };
}
