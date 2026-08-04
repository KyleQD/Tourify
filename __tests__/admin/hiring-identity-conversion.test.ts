import { describe, it, expect } from 'vitest';
import {
  initConversion,
  markStepComplete,
  markStepFailed,
  rollbackConversion,
  resetConversionForRetry,
  nextPendingStep,
  isConversionDuplicate,
  summarizeConversion,
  CONVERSION_STEPS_ORDER,
  conversionIdempotencyKey,
  type ConversionRecord,
} from '../../lib/admin/hiring-identity-conversion';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function baseConversion(overrides: Partial<ConversionRecord> = {}): ConversionRecord {
  return initConversion({
    id: 'conv-1',
    org_id: 'org-1',
    application_id: 'app-1',
    offer_id: 'offer-1',
    requisition_id: 'req-1',
    onboarding_instance_id: 'inst-1',
    applicant_email: 'jane@example.com',
    applicant_name: 'Jane Doe',
    role: 'lighting_director',
    department: 'lighting',
    start_date: '2025-09-01',
    employment_type: 'contractor',
    now: '2025-06-01T00:00:00Z',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// initConversion
// ---------------------------------------------------------------------------

describe('initConversion', () => {
  it('initializes with pending status', () => {
    const conv = baseConversion();
    expect(conv.status).toBe('pending');
  });

  it('creates all 6 steps in order, all pending', () => {
    const conv = baseConversion();
    expect(conv.steps).toHaveLength(6);
    expect(conv.steps.map(s => s.step)).toEqual(CONVERSION_STEPS_ORDER);
    expect(conv.steps.every(s => !s.completed)).toBe(true);
  });

  it('generates deterministic idempotency keys', () => {
    const conv = baseConversion();
    expect(conv.steps[0].idempotency_key).toBe('conv:conv-1:create_org_person');
  });
});

// ---------------------------------------------------------------------------
// markStepComplete
// ---------------------------------------------------------------------------

describe('markStepComplete', () => {
  it('marks first step complete and moves to in_progress', () => {
    const conv = baseConversion();
    const updated = markStepComplete(conv, { step: 'create_org_person', org_person_id: 'op-42', now: '2025-06-02T00:00:00Z' });
    expect(updated.status).toBe('in_progress');
    expect(updated.org_person_id).toBe('op-42');
    expect(updated.steps[0].completed).toBe(true);
    expect(updated.steps[0].completed_at).toBe('2025-06-02T00:00:00Z');
  });

  it('is idempotent — calling twice does not change the record', () => {
    const conv = baseConversion();
    const once = markStepComplete(conv, { step: 'create_org_person', org_person_id: 'op-42' });
    const twice = markStepComplete(once, { step: 'create_org_person', org_person_id: 'op-99' });
    // org_person_id is still op-42, not op-99
    expect(twice.org_person_id).toBe('op-42');
    expect(twice.steps[0].completed).toBe(true);
  });

  it('moves to complete when all steps are marked', () => {
    let conv = baseConversion();
    for (const step of CONVERSION_STEPS_ORDER) {
      conv = markStepComplete(conv, { step });
    }
    expect(conv.status).toBe('complete');
  });

  it('throws when trying to advance a rolled-back conversion', () => {
    const conv = rollbackConversion(baseConversion(), 'cancelled', 'admin-1');
    expect(() => markStepComplete(conv, { step: 'create_org_person' })).toThrow(/rolled-back/);
  });

  it('is a no-op (idempotent) when step already complete on a completed conversion', () => {
    let conv = baseConversion();
    for (const step of CONVERSION_STEPS_ORDER) conv = markStepComplete(conv, { step });
    // Re-marking the first step on a complete record should return unchanged (idempotent no-op)
    const again = markStepComplete(conv, { step: 'create_org_person' });
    expect(again.status).toBe('complete');
    expect(again.steps[0].completed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// markStepFailed
// ---------------------------------------------------------------------------

describe('markStepFailed', () => {
  it('sets status to failed and records error', () => {
    const conv = baseConversion();
    const failed = markStepFailed(conv, 'create_org_person', 'DB constraint violation');
    expect(failed.status).toBe('failed');
    expect(failed.steps[0].error).toBe('DB constraint violation');
  });
});

// ---------------------------------------------------------------------------
// rollbackConversion
// ---------------------------------------------------------------------------

describe('rollbackConversion', () => {
  it('rolls back a pending conversion', () => {
    const conv = baseConversion();
    const rb = rollbackConversion(conv, 'Offer rescinded', 'admin-1', '2025-06-05T00:00:00Z');
    expect(rb.status).toBe('rolled_back');
    expect(rb.rollback_reason).toBe('Offer rescinded');
    expect(rb.rolled_back_by).toBe('admin-1');
    expect(rb.rolled_back_at).toBe('2025-06-05T00:00:00Z');
  });

  it('is idempotent — rolling back twice returns same record', () => {
    const conv = baseConversion();
    const rb1 = rollbackConversion(conv, 'reason', 'admin-1');
    const rb2 = rollbackConversion(rb1, 'other reason', 'admin-2');
    expect(rb2.rollback_reason).toBe('reason'); // original preserved
  });

  it('throws when rolling back a complete conversion', () => {
    let conv = baseConversion();
    for (const step of CONVERSION_STEPS_ORDER) conv = markStepComplete(conv, { step });
    expect(() => rollbackConversion(conv, 'reason', 'admin-1')).toThrow(/completed/);
  });
});

// ---------------------------------------------------------------------------
// resetConversionForRetry
// ---------------------------------------------------------------------------

describe('resetConversionForRetry', () => {
  it('resets a failed conversion for retry', () => {
    const failed = markStepFailed(baseConversion(), 'create_org_person', 'err');
    const reset = resetConversionForRetry(failed, '2025-06-06T00:00:00Z');
    expect(reset.status).toBe('pending');
    expect(reset.steps[0].error).toBeUndefined();
  });

  it('resets a rolled-back conversion', () => {
    const rb = rollbackConversion(baseConversion(), 'reason', 'admin-1');
    const reset = resetConversionForRetry(rb);
    expect(reset.status).toBe('pending');
    expect(reset.rollback_reason).toBeUndefined();
  });

  it('resumes from last completed step when some steps were done before failure', () => {
    let conv = baseConversion();
    conv = markStepComplete(conv, { step: 'create_org_person', org_person_id: 'op-1' });
    conv = markStepFailed(conv, 'create_tour_role', 'FK error');
    const reset = resetConversionForRetry(conv);
    // step 0 still complete; resume from step 1
    expect(reset.status).toBe('in_progress');
    expect(reset.steps[0].completed).toBe(true);
    expect(reset.steps[1].completed).toBe(false);
  });

  it('throws for in_progress status', () => {
    let conv = baseConversion();
    conv = markStepComplete(conv, { step: 'create_org_person' });
    expect(() => resetConversionForRetry(conv)).toThrow(/Cannot reset/);
  });
});

// ---------------------------------------------------------------------------
// nextPendingStep
// ---------------------------------------------------------------------------

describe('nextPendingStep', () => {
  it('returns create_org_person for fresh conversion', () => {
    expect(nextPendingStep(baseConversion())).toBe('create_org_person');
  });

  it('returns next step after first is completed', () => {
    const conv = markStepComplete(baseConversion(), { step: 'create_org_person' });
    expect(nextPendingStep(conv)).toBe('create_tour_role');
  });

  it('returns null when all steps complete', () => {
    let conv = baseConversion();
    for (const step of CONVERSION_STEPS_ORDER) conv = markStepComplete(conv, { step });
    expect(nextPendingStep(conv)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isConversionDuplicate
// ---------------------------------------------------------------------------

describe('isConversionDuplicate', () => {
  it('detects duplicate when same app+offer exists and is not rolled back', () => {
    const existing = [baseConversion()];
    expect(isConversionDuplicate(existing, 'app-1', 'offer-1')).toBe(true);
  });

  it('does not flag rolled-back conversions as duplicates', () => {
    const rb = rollbackConversion(baseConversion(), 'reason', 'admin-1');
    expect(isConversionDuplicate([rb], 'app-1', 'offer-1')).toBe(false);
  });

  it('returns false for different application_id', () => {
    const existing = [baseConversion()];
    expect(isConversionDuplicate(existing, 'app-99', 'offer-1')).toBe(false);
  });

  it('returns false for empty existing list', () => {
    expect(isConversionDuplicate([], 'app-1', 'offer-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// summarizeConversion
// ---------------------------------------------------------------------------

describe('summarizeConversion', () => {
  it('reports correct counts for fresh conversion', () => {
    const summary = summarizeConversion(baseConversion());
    expect(summary.steps_complete).toBe(0);
    expect(summary.steps_total).toBe(6);
    expect(summary.next_step).toBe('create_org_person');
    expect(summary.has_error).toBe(false);
  });

  it('reports all complete when done', () => {
    let conv = baseConversion();
    for (const step of CONVERSION_STEPS_ORDER) conv = markStepComplete(conv, { step });
    const summary = summarizeConversion(conv);
    expect(summary.steps_complete).toBe(6);
    expect(summary.next_step).toBeNull();
    expect(summary.status).toBe('complete');
  });

  it('reports has_error when a step failed', () => {
    const failed = markStepFailed(baseConversion(), 'create_org_person', 'err');
    expect(summarizeConversion(failed).has_error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// conversionIdempotencyKey
// ---------------------------------------------------------------------------

describe('conversionIdempotencyKey', () => {
  it('generates stable key', () => {
    expect(conversionIdempotencyKey('conv-abc', 'grant_work_mode'))
      .toBe('conv:conv-abc:grant_work_mode');
  });
});
