import { describe, it, expect } from 'vitest';
import {
  transitionApplicationStage,
  isNoteVisible,
  completeInterviewTask,
  allRequiredInterviewsComplete,
  isConsentActive,
  retentionExpiryDate,
  isDuplicateBlocking,
  projectApplicationForExport,
  exportApplications,
  summarizePipeline,
  TERMINAL_STAGES,
  type HiringApplication,
  type ApplicationNote,
  type InterviewTask,
  type ApplicantConsent,
  type DuplicateApplicationFlag,
} from '../../lib/admin/hiring-application-pipeline';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function baseConsent(overrides: Partial<ApplicantConsent> = {}): ApplicantConsent {
  return {
    consented_at: '2025-01-01T00:00:00Z',
    consent_version: 'v1',
    data_retention_period: '180d',
    ...overrides,
  };
}

function baseApp(overrides: Partial<HiringApplication> = {}): HiringApplication {
  return {
    id: 'app-1',
    org_id: 'org-1',
    requisition_id: 'req-1',
    applicant_name: 'Jane Doe',
    applicant_email: 'jane@example.com',
    applicant_phone: '+1-555-0100',
    stage: 'received',
    consent: baseConsent(),
    source: 'external',
    applied_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    ...overrides,
  };
}

function baseNote(overrides: Partial<ApplicationNote> = {}): ApplicationNote {
  return {
    id: 'note-1',
    application_id: 'app-1',
    author_id: 'user-1',
    visibility: 'internal',
    body: 'Strong candidate.',
    stage_at_time: 'screening',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    ...overrides,
  };
}

function baseInterviewTask(overrides: Partial<InterviewTask> = {}): InterviewTask {
  return {
    id: 'task-1',
    application_id: 'app-1',
    title: 'Phone screen',
    interview_type: 'phone',
    status: 'scheduled',
    created_at: '2025-06-01T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Stage transitions
// ---------------------------------------------------------------------------

describe('transitionApplicationStage', () => {
  it('allows received → screening', () => {
    const r = transitionApplicationStage('received', 'screening', undefined);
    expect(r.ok).toBe(true);
    expect(r.stage).toBe('screening');
  });

  it('allows screening → interview', () => {
    const r = transitionApplicationStage('screening', 'interview', undefined);
    expect(r.ok).toBe(true);
  });

  it('requires decision_reason for rejected', () => {
    const r = transitionApplicationStage('screening', 'rejected', '');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/decision_reason/);
  });

  it('allows rejected with reason', () => {
    const r = transitionApplicationStage('screening', 'rejected', 'Insufficient experience');
    expect(r.ok).toBe(true);
    expect(r.stage).toBe('rejected');
  });

  it('requires decision_reason for declined', () => {
    const r = transitionApplicationStage('offer_extended', 'declined', undefined);
    expect(r.ok).toBe(false);
  });

  it('blocks invalid transition', () => {
    const r = transitionApplicationStage('received', 'accepted', undefined);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not allowed/);
  });

  it('terminal stages have no outgoing transitions', () => {
    for (const s of TERMINAL_STAGES) {
      if (s === 'rejected' || s === 'duplicate_blocked') continue; // these allow re-open
      const r = transitionApplicationStage(s, 'received', undefined);
      expect(r.ok).toBe(false);
    }
  });

  it('allows rejected → received (admin re-open)', () => {
    const r = transitionApplicationStage('rejected', 'received', undefined);
    expect(r.ok).toBe(true);
  });

  it('allows on_hold back to screening', () => {
    const r = transitionApplicationStage('on_hold', 'screening', undefined);
    expect(r.ok).toBe(true);
  });

  it('allows backtrack screening → received', () => {
    const r = transitionApplicationStage('screening', 'received', undefined);
    expect(r.ok).toBe(true);
  });

  it('blocks draft → duplicate_blocked directly from offer_extended', () => {
    // offer_extended only has accepted/declined/withdrawn
    const r = transitionApplicationStage('offer_extended', 'duplicate_blocked', undefined);
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Notes visibility
// ---------------------------------------------------------------------------

describe('isNoteVisible', () => {
  it('internal notes are visible to all', () => {
    const note = baseNote({ visibility: 'internal' });
    expect(isNoteVisible(note, 'hiring.manage')).toBe(true);
    expect(isNoteVisible(note, 'interviewer')).toBe(true);
    expect(isNoteVisible(note, 'workforce.view')).toBe(true);
  });

  it('interviewer notes not visible to workforce.view', () => {
    const note = baseNote({ visibility: 'interviewer' });
    expect(isNoteVisible(note, 'interviewer')).toBe(true);
    expect(isNoteVisible(note, 'workforce.view')).toBe(false);
  });

  it('hiring_manage_only notes only visible to hiring.manage', () => {
    const note = baseNote({ visibility: 'hiring_manage_only' });
    expect(isNoteVisible(note, 'hiring.manage')).toBe(true);
    expect(isNoteVisible(note, 'interviewer')).toBe(false);
    expect(isNoteVisible(note, 'workforce.view')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Interview tasks
// ---------------------------------------------------------------------------

describe('completeInterviewTask', () => {
  it('completes a scheduled task', () => {
    const task = baseInterviewTask({ status: 'scheduled' });
    const completed = completeInterviewTask(task, 'pass', 'Great call');
    expect(completed.status).toBe('completed');
    expect(completed.outcome).toBe('pass');
    expect(completed.notes).toBe('Great call');
    expect(completed.completed_at).toBeTruthy();
  });

  it('completes a pending task', () => {
    const task = baseInterviewTask({ status: 'pending' });
    const completed = completeInterviewTask(task, 'fail');
    expect(completed.status).toBe('completed');
  });

  it('throws when completing a cancelled task', () => {
    const task = baseInterviewTask({ status: 'cancelled' });
    expect(() => completeInterviewTask(task, 'pass')).toThrow();
  });

  it('throws when completing an already completed task', () => {
    const task = baseInterviewTask({ status: 'completed' });
    expect(() => completeInterviewTask(task, 'pass')).toThrow();
  });
});

describe('allRequiredInterviewsComplete', () => {
  it('true when all non-cancelled tasks are completed', () => {
    const tasks = [
      baseInterviewTask({ status: 'completed' }),
      baseInterviewTask({ id: 'task-2', status: 'cancelled' }),
    ];
    expect(allRequiredInterviewsComplete(tasks)).toBe(true);
  });

  it('false when a task is still pending', () => {
    const tasks = [
      baseInterviewTask({ status: 'completed' }),
      baseInterviewTask({ id: 'task-2', status: 'pending' }),
    ];
    expect(allRequiredInterviewsComplete(tasks)).toBe(false);
  });

  it('true for empty task list', () => {
    expect(allRequiredInterviewsComplete([])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Consent and retention
// ---------------------------------------------------------------------------

describe('isConsentActive', () => {
  it('returns true when not withdrawn', () => {
    expect(isConsentActive(baseConsent())).toBe(true);
  });

  it('returns false when withdrawn', () => {
    expect(isConsentActive(baseConsent({ withdrawn_at: '2025-03-01T00:00:00Z' }))).toBe(false);
  });
});

describe('retentionExpiryDate', () => {
  it('computes 90d expiry correctly', () => {
    const expiry = retentionExpiryDate(baseConsent({ data_retention_period: '90d' }), '2025-01-01');
    expect(expiry).toBe('2025-03-31');
  });

  it('returns null for indefinite', () => {
    const expiry = retentionExpiryDate(baseConsent({ data_retention_period: 'indefinite' }), '2025-01-01');
    expect(expiry).toBeNull();
  });

  it('computes 2y expiry', () => {
    const expiry = retentionExpiryDate(baseConsent({ data_retention_period: '2y' }), '2025-01-01');
    expect(expiry).toBe('2027-01-01'); // 730 days from 2025-01-01
  });
});

// ---------------------------------------------------------------------------
// Duplicate handling
// ---------------------------------------------------------------------------

describe('isDuplicateBlocking', () => {
  it('high confidence is blocking', () => {
    const flag: DuplicateApplicationFlag = {
      duplicate_of_application_id: 'app-0',
      signals: ['same_email'],
      confidence: 'high',
    };
    expect(isDuplicateBlocking(flag)).toBe(true);
  });

  it('same_identity_record is blocking regardless of confidence', () => {
    const flag: DuplicateApplicationFlag = {
      duplicate_of_application_id: 'app-0',
      signals: ['same_identity_record'],
      confidence: 'low',
    };
    expect(isDuplicateBlocking(flag)).toBe(true);
  });

  it('low confidence same_email only is not blocking', () => {
    const flag: DuplicateApplicationFlag = {
      duplicate_of_application_id: 'app-0',
      signals: ['same_email'],
      confidence: 'low',
    };
    expect(isDuplicateBlocking(flag)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Role-aware export
// ---------------------------------------------------------------------------

describe('projectApplicationForExport', () => {
  it('hiring.manage sees all fields', () => {
    const row = projectApplicationForExport(baseApp(), 'hiring.manage');
    expect(row.applicant_email).toBe('jane@example.com');
    expect(row.applicant_phone).toBe('+1-555-0100');
    expect(row.consent_retention_period).toBe('180d');
  });

  it('interviewer does not see PII', () => {
    const row = projectApplicationForExport(baseApp(), 'interviewer');
    expect(row.applicant_email).toBeUndefined();
    expect(row.applicant_phone).toBeUndefined();
    expect(row.consent_retention_period).toBeUndefined();
    expect(row.existing_person_id).toBeUndefined();
  });

  it('applicant_name is always visible', () => {
    const row = projectApplicationForExport(baseApp(), 'interviewer');
    expect(row.applicant_name).toBe('Jane Doe');
  });
});

describe('exportApplications', () => {
  it('returns projected rows for all apps', () => {
    const apps = [baseApp(), baseApp({ id: 'app-2', applicant_email: 'bob@example.com' })];
    const rows = exportApplications(apps, 'hiring.manage');
    expect(rows).toHaveLength(2);
    expect(rows[1].applicant_email).toBe('bob@example.com');
  });
});

// ---------------------------------------------------------------------------
// Pipeline summary
// ---------------------------------------------------------------------------

describe('summarizePipeline', () => {
  it('counts by stage correctly', () => {
    const apps = [
      baseApp({ stage: 'received' }),
      baseApp({ id: 'app-2', stage: 'screening' }),
      baseApp({ id: 'app-3', stage: 'screening' }),
      baseApp({ id: 'app-4', stage: 'rejected' }),
      baseApp({ id: 'app-5', stage: 'duplicate_blocked' }),
      baseApp({ id: 'app-6', stage: 'on_hold' }),
    ];
    const summary = summarizePipeline(apps);
    expect(summary.total).toBe(6);
    expect(summary.by_stage['screening']).toBe(2);
    expect(summary.blocked_duplicates).toBe(1);
    expect(summary.on_hold).toBe(1);
    expect(summary.terminal).toBe(2); // rejected + duplicate_blocked
  });

  it('returns zeroes for empty list', () => {
    const summary = summarizePipeline([]);
    expect(summary.total).toBe(0);
    expect(summary.blocked_duplicates).toBe(0);
  });
});
