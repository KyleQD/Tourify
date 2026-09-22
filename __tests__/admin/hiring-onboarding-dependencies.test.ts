import { describe, it, expect } from 'vitest';
import {
  transitionOnboardingItem,
  completeOnboardingItem,
  waiveOnboardingItem,
  blockOnboardingItem,
  parseDurationDays,
  computeDueDate,
  buildDependencyItems,
  computeOnboardingCompletion,
  getOverdueItems,
  type OnboardingDependencyItem,
} from '../../lib/admin/hiring-onboarding-dependencies';
import { applyTemplate, type OnboardingTemplate, type OnboardingTemplateItem } from '../../lib/admin/hiring-onboarding-template';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTemplateItem(overrides: Partial<OnboardingTemplateItem> = {}): OnboardingTemplateItem {
  return {
    id: 'item-1',
    type: 'task',
    title: 'Submit emergency contacts',
    applies_to_roles: [],
    applies_to_employment_types: [],
    is_required: true,
    ordinal: 1,
    ...overrides,
  };
}

function baseTemplate(): OnboardingTemplate {
  return {
    id: 'tmpl-1',
    org_id: 'org-1',
    name: 'Test template',
    version: 1,
    status: 'active',
    items: [
      makeTemplateItem({ id: 'i1', title: 'Create account invite', type: 'task', ordinal: 1, due_offset: 'P14D', is_required: true }),
      makeTemplateItem({ id: 'i2', title: 'Sign contractor agreement', type: 'document', accepted_mime_types: ['application/pdf'], ordinal: 2, due_offset: 'P7D', is_required: true }),
      makeTemplateItem({ id: 'i3', title: 'Acknowledge touring policy', type: 'acknowledgement', policy_ref: 'pol-v1', ordinal: 3, is_required: true }),
      makeTemplateItem({ id: 'i4', title: 'Issue radio and badge', type: 'task', ordinal: 4, is_required: false }),
    ],
    created_by: 'user-admin',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

function baseItem(overrides: Partial<OnboardingDependencyItem> = {}): OnboardingDependencyItem {
  return {
    id: 'dep-1',
    instance_id: 'inst-1',
    org_id: 'org-1',
    template_item_id: 'i1',
    category: 'identity_invite',
    title: 'Create account invite',
    is_required: true,
    owner_id: 'user-hr',
    status: 'pending',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// transitionOnboardingItem
// ---------------------------------------------------------------------------

describe('transitionOnboardingItem', () => {
  it('allows pending → in_progress', () => {
    expect(transitionOnboardingItem('pending', 'in_progress').ok).toBe(true);
  });
  it('allows in_progress → complete', () => {
    expect(transitionOnboardingItem('in_progress', 'complete').ok).toBe(true);
  });
  it('allows blocked → in_progress', () => {
    expect(transitionOnboardingItem('blocked', 'in_progress').ok).toBe(true);
  });
  it('blocks complete → pending (terminal)', () => {
    const r = transitionOnboardingItem('complete', 'pending');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not allowed/);
  });
  it('requires waive_reason when moving to waived', () => {
    const r = transitionOnboardingItem('pending', 'waived', '');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/waive_reason/);
  });
  it('allows waived with reason', () => {
    const r = transitionOnboardingItem('pending', 'waived', 'HR approved exemption');
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// completeOnboardingItem
// ---------------------------------------------------------------------------

describe('completeOnboardingItem', () => {
  it('completes a pending item', () => {
    const item = baseItem({ status: 'pending' });
    const updated = completeOnboardingItem(item, { completed_by: 'user-hr', now: '2025-06-10T00:00:00Z' });
    expect(updated.status).toBe('complete');
    expect(updated.completed_by).toBe('user-hr');
    expect(updated.completed_at).toBe('2025-06-10T00:00:00Z');
  });

  it('completes an in_progress item', () => {
    const item = baseItem({ status: 'in_progress' });
    const updated = completeOnboardingItem(item, { completed_by: 'user-hr', document_ref: 'doc-42' });
    expect(updated.status).toBe('complete');
    expect(updated.document_ref).toBe('doc-42');
  });

  it('throws when completing a waived item (terminal)', () => {
    const item = baseItem({ status: 'waived' });
    expect(() => completeOnboardingItem(item, { completed_by: 'user-hr' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// waiveOnboardingItem
// ---------------------------------------------------------------------------

describe('waiveOnboardingItem', () => {
  it('waives a pending item with reason', () => {
    const updated = waiveOnboardingItem(baseItem(), 'Role exemption', 'user-hr', '2025-06-10T00:00:00Z');
    expect(updated.status).toBe('waived');
    expect(updated.waive_reason).toBe('Role exemption');
  });

  it('waives a blocked item', () => {
    const item = baseItem({ status: 'blocked' });
    const updated = waiveOnboardingItem(item, 'Exempt', 'user-hr');
    expect(updated.status).toBe('waived');
  });

  it('throws when waiving without reason (via transition guard)', () => {
    expect(() => waiveOnboardingItem(baseItem(), '', 'user-hr')).toThrow(/waive_reason/);
  });
});

// ---------------------------------------------------------------------------
// blockOnboardingItem
// ---------------------------------------------------------------------------

describe('blockOnboardingItem', () => {
  it('blocks a pending item', () => {
    const updated = blockOnboardingItem(baseItem(), 'Awaiting passport', '2025-06-10T00:00:00Z');
    expect(updated.status).toBe('blocked');
    expect(updated.blocked_reason).toBe('Awaiting passport');
  });

  it('throws when blocking a complete item', () => {
    expect(() => blockOnboardingItem(baseItem({ status: 'complete' }), 'reason')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseDurationDays + computeDueDate
// ---------------------------------------------------------------------------

describe('parseDurationDays', () => {
  it('parses P3D to 3', () => {
    expect(parseDurationDays('P3D')).toBe(3);
  });
  it('parses P14D to 14', () => {
    expect(parseDurationDays('P14D')).toBe(14);
  });
  it('returns null for non-day durations', () => {
    expect(parseDurationDays('P1M')).toBeNull();
    expect(parseDurationDays('PT1H')).toBeNull();
  });
  it('returns null for undefined', () => {
    expect(parseDurationDays(undefined)).toBeNull();
  });
});

describe('computeDueDate', () => {
  it('returns date 7 days before start_date for P7D', () => {
    expect(computeDueDate('2025-09-01', 'P7D')).toBe('2025-08-25');
  });
  it('returns null for undefined offset', () => {
    expect(computeDueDate('2025-09-01', undefined)).toBeNull();
  });
  it('returns null for non-day offset', () => {
    expect(computeDueDate('2025-09-01', 'P1M')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildDependencyItems
// ---------------------------------------------------------------------------

describe('buildDependencyItems', () => {
  it('creates dependency items from an applied instance', () => {
    const instance = applyTemplate(baseTemplate(), {
      instance_id: 'inst-1',
      offer_id: 'offer-1',
      application_id: 'app-1',
      requisition_id: 'req-1',
      role: 'lighting_director',
      department: 'lighting',
      employment_type: 'contractor',
      start_date: '2025-09-01',
      itemIdPrefix: 'inst-item',
      now: '2025-06-01T00:00:00Z',
    });

    const deps = buildDependencyItems(instance, { owner_id: 'user-hr', idPrefix: 'dep', now: '2025-06-01T00:00:00Z' });
    expect(deps).toHaveLength(4);
    expect(deps[0].status).toBe('pending');
    expect(deps[0].category).toBe('identity_invite');  // "Create account invite"
    expect(deps[1].category).toBe('document');         // "Sign contractor agreement"
    expect(deps[2].category).toBe('policy_ack');       // acknowledgement
    expect(deps[3].category).toBe('equipment_issuance'); // "Issue radio and badge"
  });

  it('computes due dates from start_date + offset', () => {
    const instance = applyTemplate(baseTemplate(), {
      instance_id: 'inst-1',
      offer_id: 'offer-1',
      application_id: 'app-1',
      requisition_id: 'req-1',
      role: 'ld',
      department: 'lighting',
      employment_type: 'contractor',
      start_date: '2025-09-01',
      now: '2025-06-01T00:00:00Z',
    });

    const deps = buildDependencyItems(instance, { owner_id: 'user-hr' });
    // P14D offset → 14 days before 2025-09-01
    expect(deps[0].due_date).toBe('2025-08-18');
    // P7D offset
    expect(deps[1].due_date).toBe('2025-08-25');
    // no offset
    expect(deps[2].due_date).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeOnboardingCompletion
// ---------------------------------------------------------------------------

describe('computeOnboardingCompletion', () => {
  it('reports can_complete when all required items done/waived', () => {
    const items: OnboardingDependencyItem[] = [
      baseItem({ id: 'd1', is_required: true, status: 'complete' }),
      baseItem({ id: 'd2', is_required: true, status: 'waived' }),
      baseItem({ id: 'd3', is_required: false, status: 'pending' }),
    ];
    const summary = computeOnboardingCompletion(items);
    expect(summary.can_complete).toBe(true);
    expect(summary.required_incomplete).toBe(0);
    expect(summary.blocking_items).toHaveLength(0);
  });

  it('reports blocking items for required incomplete', () => {
    const items: OnboardingDependencyItem[] = [
      baseItem({ id: 'd1', is_required: true, status: 'complete' }),
      baseItem({ id: 'd2', is_required: true, status: 'pending' }),
      baseItem({ id: 'd3', is_required: true, status: 'blocked' }),
    ];
    const summary = computeOnboardingCompletion(items);
    expect(summary.can_complete).toBe(false);
    expect(summary.blocking_items).toContain('d2');
    expect(summary.blocking_items).toContain('d3');
  });

  it('counts correctly for mixed statuses', () => {
    const items: OnboardingDependencyItem[] = [
      baseItem({ id: 'd1', is_required: true, status: 'complete' }),
      baseItem({ id: 'd2', is_required: false, status: 'waived' }),
      baseItem({ id: 'd3', is_required: true, status: 'in_progress' }),
      baseItem({ id: 'd4', is_required: false, status: 'blocked' }),
    ];
    const summary = computeOnboardingCompletion(items);
    expect(summary.complete).toBe(1);
    expect(summary.waived).toBe(1);
    expect(summary.in_progress).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.required_incomplete).toBe(1); // d3
  });
});

// ---------------------------------------------------------------------------
// getOverdueItems
// ---------------------------------------------------------------------------

describe('getOverdueItems', () => {
  it('returns items past their due_date that are not done', () => {
    const items: OnboardingDependencyItem[] = [
      baseItem({ id: 'd1', due_date: '2025-08-01', status: 'pending' }),
      baseItem({ id: 'd2', due_date: '2025-08-30', status: 'pending' }),
      baseItem({ id: 'd3', due_date: '2025-08-01', status: 'complete' }),
    ];
    const overdue = getOverdueItems(items, '2025-08-15');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('d1');
  });

  it('returns empty when all items are on time or complete', () => {
    const items: OnboardingDependencyItem[] = [
      baseItem({ id: 'd1', due_date: '2025-09-01', status: 'pending' }),
    ];
    expect(getOverdueItems(items, '2025-08-15')).toHaveLength(0);
  });
});
