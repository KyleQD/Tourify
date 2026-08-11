import { describe, it, expect } from 'vitest';
import {
  createTemplateVersion,
  activateTemplate,
  applyTemplate,
  validateTemplateItems,
  type OnboardingTemplate,
  type OnboardingTemplateItem,
} from '../../lib/admin/hiring-onboarding-template';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<OnboardingTemplateItem> = {}): OnboardingTemplateItem {
  return {
    id: 'item-1',
    type: 'task',
    title: 'Complete I-9 verification',
    applies_to_roles: [],
    applies_to_employment_types: [],
    is_required: true,
    ordinal: 1,
    ...overrides,
  };
}

function baseTemplate(overrides: Partial<OnboardingTemplate> = {}): OnboardingTemplate {
  return {
    id: 'tmpl-1',
    org_id: 'org-1',
    name: 'Standard Contractor Onboarding',
    version: 1,
    status: 'active',
    items: [
      makeItem({ id: 'item-1', title: 'Sign contractor agreement', type: 'document', accepted_mime_types: ['application/pdf'], ordinal: 1 }),
      makeItem({ id: 'item-2', title: 'Acknowledge touring policy', type: 'acknowledgement', policy_ref: 'policy-v3', ordinal: 2 }),
      makeItem({ id: 'item-3', title: 'Submit emergency contacts', type: 'task', ordinal: 3 }),
    ],
    created_by: 'user-admin',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createTemplateVersion
// ---------------------------------------------------------------------------

describe('createTemplateVersion', () => {
  it('archives the current version and creates a draft next version', () => {
    const { previous, next } = createTemplateVersion(baseTemplate(), {
      new_id: 'tmpl-2',
      items: [makeItem({ id: 'item-a', ordinal: 1 })],
      created_by: 'user-admin',
      now: '2025-06-01T00:00:00Z',
    });

    expect(previous.status).toBe('archived');
    expect(previous.id).toBe('tmpl-1');
    expect(next.id).toBe('tmpl-2');
    expect(next.status).toBe('draft');
    expect(next.version).toBe(2);
    expect(next.previous_version_id).toBe('tmpl-1');
  });

  it('preserves org_id and name when not overridden', () => {
    const { next } = createTemplateVersion(baseTemplate(), {
      new_id: 'tmpl-2',
      items: [makeItem({ id: 'item-a', ordinal: 1 })],
      created_by: 'user-admin',
    });
    expect(next.org_id).toBe('org-1');
    expect(next.name).toBe('Standard Contractor Onboarding');
  });

  it('allows overriding name in the new version', () => {
    const { next } = createTemplateVersion(baseTemplate(), {
      new_id: 'tmpl-2',
      name: 'Updated Contractor Onboarding',
      items: [makeItem({ id: 'item-a', ordinal: 1 })],
      created_by: 'user-admin',
    });
    expect(next.name).toBe('Updated Contractor Onboarding');
  });

  it('throws when trying to version an archived template', () => {
    const archived = baseTemplate({ status: 'archived' });
    expect(() =>
      createTemplateVersion(archived, {
        new_id: 'tmpl-3',
        items: [],
        created_by: 'user-admin',
      }),
    ).toThrow(/archived/);
  });

  it('also allows versioning a draft', () => {
    const draft = baseTemplate({ status: 'draft' });
    const { previous, next } = createTemplateVersion(draft, {
      new_id: 'tmpl-2',
      items: [makeItem({ id: 'item-a', ordinal: 1 })],
      created_by: 'user-admin',
      now: '2025-06-01T00:00:00Z',
    });
    expect(previous.status).toBe('archived');
    expect(next.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// activateTemplate
// ---------------------------------------------------------------------------

describe('activateTemplate', () => {
  it('activates a draft template', () => {
    const draft = baseTemplate({ status: 'draft' });
    const activated = activateTemplate(draft, '2025-06-01T00:00:00Z');
    expect(activated.status).toBe('active');
  });

  it('throws when activating a non-draft', () => {
    expect(() => activateTemplate(baseTemplate({ status: 'active' }))).toThrow(/draft/);
    expect(() => activateTemplate(baseTemplate({ status: 'archived' }))).toThrow(/draft/);
  });
});

// ---------------------------------------------------------------------------
// applyTemplate
// ---------------------------------------------------------------------------

describe('applyTemplate', () => {
  it('creates instance with all items when no role/type filters', () => {
    const instance = applyTemplate(baseTemplate(), {
      instance_id: 'inst-1',
      offer_id: 'offer-1',
      application_id: 'app-1',
      requisition_id: 'req-1',
      role: 'lighting_director',
      department: 'lighting',
      employment_type: 'contractor',
      start_date: '2025-09-01',
      itemIdPrefix: 'item',
      now: '2025-06-01T00:00:00Z',
    });
    expect(instance.items).toHaveLength(3);
    expect(instance.template_version).toBe(1);
    expect(instance.status).toBe('not_started');
    expect(instance.items[0].status).toBe('pending');
  });

  it('filters items by role when role filter is set', () => {
    const templateWithFilter = baseTemplate({
      items: [
        makeItem({ id: 'item-1', title: 'All roles task', applies_to_roles: [], ordinal: 1 }),
        makeItem({ id: 'item-2', title: 'LD only task', applies_to_roles: ['lighting_director'], ordinal: 2 }),
        makeItem({ id: 'item-3', title: 'FOH only task', applies_to_roles: ['front_of_house'], ordinal: 3 }),
      ],
    });

    const instance = applyTemplate(templateWithFilter, {
      instance_id: 'inst-1',
      offer_id: 'offer-1',
      application_id: 'app-1',
      requisition_id: 'req-1',
      role: 'lighting_director',
      department: 'lighting',
      employment_type: 'contractor',
      start_date: '2025-09-01',
      now: '2025-06-01T00:00:00Z',
    });

    expect(instance.items).toHaveLength(2); // all-roles + LD only
    expect(instance.items.some(i => i.title === 'FOH only task')).toBe(false);
  });

  it('filters items by employment_type', () => {
    const templateWithFilter = baseTemplate({
      items: [
        makeItem({ id: 'item-1', title: 'All types', applies_to_employment_types: [], ordinal: 1 }),
        makeItem({ id: 'item-2', title: 'Employee only', applies_to_employment_types: ['employee'], ordinal: 2 }),
      ],
    });

    const instance = applyTemplate(templateWithFilter, {
      instance_id: 'inst-1',
      offer_id: 'offer-1',
      application_id: 'app-1',
      requisition_id: 'req-1',
      role: 'stagehand',
      department: 'stage',
      employment_type: 'contractor',
      start_date: '2025-09-01',
      now: '2025-06-01T00:00:00Z',
    });

    expect(instance.items).toHaveLength(1);
    expect(instance.items[0].title).toBe('All types');
  });

  it('throws when template is not active', () => {
    const draft = baseTemplate({ status: 'draft' });
    expect(() =>
      applyTemplate(draft, {
        instance_id: 'inst-1',
        offer_id: 'offer-1',
        application_id: 'app-1',
        requisition_id: 'req-1',
        role: 'ld',
        department: 'lighting',
        employment_type: 'contractor',
        start_date: '2025-09-01',
      }),
    ).toThrow(/active/);
  });

  it('snapshots items — later template change does not affect instance', () => {
    const tmpl = baseTemplate();
    const instance = applyTemplate(tmpl, {
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

    // Now create a new template version (would archive tmpl)
    const { next: newVersion } = createTemplateVersion(tmpl, {
      new_id: 'tmpl-2',
      items: [makeItem({ id: 'item-x', title: 'Brand new item', ordinal: 1 })],
      created_by: 'user-admin',
    });
    // Instance still has original 3 items, not new version's 1 item
    expect(instance.items).toHaveLength(3);
    expect(newVersion.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// validateTemplateItems
// ---------------------------------------------------------------------------

describe('validateTemplateItems', () => {
  it('passes a valid item list', () => {
    const result = validateTemplateItems([
      makeItem({ id: 'item-1', ordinal: 1 }),
      makeItem({ id: 'item-2', title: 'Upload W-9', type: 'document', accepted_mime_types: ['application/pdf'], ordinal: 2 }),
      makeItem({ id: 'item-3', title: 'Ack policy', type: 'acknowledgement', policy_ref: 'policy-v1', ordinal: 3 }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on empty items list', () => {
    const result = validateTemplateItems([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at least one/);
  });

  it('fails on duplicate ordinals', () => {
    const result = validateTemplateItems([
      makeItem({ id: 'item-1', ordinal: 1 }),
      makeItem({ id: 'item-2', ordinal: 1 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Duplicate ordinal/);
  });

  it('fails on empty title', () => {
    const result = validateTemplateItems([makeItem({ title: '  ', ordinal: 1 })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/empty title/);
  });

  it('fails document with empty mime list', () => {
    const result = validateTemplateItems([
      makeItem({ type: 'document', accepted_mime_types: [], ordinal: 1 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/accepted_mime_types/);
  });

  it('fails acknowledgement without policy_ref', () => {
    const result = validateTemplateItems([
      makeItem({ type: 'acknowledgement', policy_ref: undefined, ordinal: 1 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/policy_ref/);
  });
});
