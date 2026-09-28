/**
 * HIRE-404 — Version onboarding templates
 *
 * Organizations own task/document/acknowledgement templates by role and
 * employment type.  Each template is versioned; changes create a new version
 * and never mutate a template that has already been applied to an active
 * onboarding instance.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Template item types
// ---------------------------------------------------------------------------

export type OnboardingItemType =
  | 'task'              // a to-do (no file required)
  | 'document'          // fill/sign a form or upload a document
  | 'acknowledgement';  // read and acknowledge a policy / handbook section

export type EmploymentType = 'employee' | 'contractor' | 'freelance' | 'volunteer';

// ---------------------------------------------------------------------------
// Template item definition
// ---------------------------------------------------------------------------

export interface OnboardingTemplateItem {
  id: string;
  type: OnboardingItemType;
  title: string;
  description?: string;
  /** Which roles this item applies to; empty array = all roles */
  applies_to_roles: string[];
  /** Employment types this item applies to; empty = all */
  applies_to_employment_types: EmploymentType[];
  is_required: boolean;
  /** ISO-8601 duration string: e.g. "P3D" = 3 days before start_date */
  due_offset?: string;
  /** For documents: expected MIME types */
  accepted_mime_types?: string[];
  /** For acknowledgements: which policy document version to reference */
  policy_ref?: string;
  /** Order within the template */
  ordinal: number;
}

// ---------------------------------------------------------------------------
// Template status and versioning
// ---------------------------------------------------------------------------

export type OnboardingTemplateStatus = 'draft' | 'active' | 'archived';

export interface OnboardingTemplate {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  /** Monotonically increasing; starts at 1 */
  version: number;
  status: OnboardingTemplateStatus;
  items: OnboardingTemplateItem[];
  /** The ID of the previous version (null for v1) */
  previous_version_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Versioning — create a new version from an existing active template
// ---------------------------------------------------------------------------

export interface NewVersionInput {
  new_id: string;
  name?: string;
  description?: string;
  items: OnboardingTemplateItem[];
  created_by: string;
  now?: string;
}

export interface NewVersionResult {
  previous: OnboardingTemplate;   // archived copy of old version
  next: OnboardingTemplate;       // new draft awaiting activation
}

/**
 * Creates a new draft version of an onboarding template.
 * The previous version is archived so it cannot be further mutated.
 * Applied onboarding instances snapshot their items; they reference the
 * version_id at application time and are never affected by this call.
 */
export function createTemplateVersion(
  template: OnboardingTemplate,
  input: NewVersionInput,
): NewVersionResult {
  if (template.status === 'archived') {
    throw new Error(`Cannot create a new version from an archived template (id: ${template.id}).`);
  }
  const now = input.now ?? new Date().toISOString();

  const previous: OnboardingTemplate = {
    ...template,
    status: 'archived',
    updated_at: now,
  };

  const next: OnboardingTemplate = {
    id: input.new_id,
    org_id: template.org_id,
    name: input.name ?? template.name,
    description: input.description ?? template.description,
    version: template.version + 1,
    status: 'draft',
    items: input.items,
    previous_version_id: template.id,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  };

  return { previous, next };
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activateTemplate(template: OnboardingTemplate, now?: string): OnboardingTemplate {
  if (template.status !== 'draft') {
    throw new Error(`Only draft templates can be activated (status: ${template.status}).`);
  }
  const ts = now ?? new Date().toISOString();
  return { ...template, status: 'active', updated_at: ts };
}

// ---------------------------------------------------------------------------
// Template application — snapshot items at apply time
// ---------------------------------------------------------------------------

export type OnboardingInstanceStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

export interface OnboardingInstanceItem {
  id: string;
  template_item_id: string;
  type: OnboardingItemType;
  title: string;
  description?: string;
  is_required: boolean;
  due_offset?: string;
  accepted_mime_types?: string[];
  policy_ref?: string;
  ordinal: number;
  // Runtime state (set by HIRE-405)
  status?: 'pending' | 'in_progress' | 'complete' | 'waived' | 'blocked';
  completed_at?: string;
  completed_by?: string;
}

export interface OnboardingInstance {
  id: string;
  org_id: string;
  /** Links to the person being onboarded */
  person_id?: string;
  /** Links to the offer/application that triggered onboarding */
  offer_id: string;
  application_id: string;
  requisition_id: string;

  /** Template version that was applied at creation time */
  template_id: string;
  template_version: number;

  /** Immutable snapshot of items at apply time — never mutated when template is updated */
  items: OnboardingInstanceItem[];

  role: string;
  department: string;
  employment_type: EmploymentType;
  start_date: string;

  status: OnboardingInstanceStatus;
  created_at: string;
  updated_at: string;
}

export interface ApplyTemplateInput {
  instance_id: string;
  offer_id: string;
  application_id: string;
  requisition_id: string;
  person_id?: string;
  role: string;
  department: string;
  employment_type: EmploymentType;
  start_date: string;
  now?: string;
  /** Override to generate item IDs deterministically in tests */
  itemIdPrefix?: string;
}

/**
 * Applies the template to create a new onboarding instance.
 * Only items that apply to the given role and employment_type are included.
 * The items are snapshotted — later template changes will not affect this instance.
 */
export function applyTemplate(
  template: OnboardingTemplate,
  input: ApplyTemplateInput,
): OnboardingInstance {
  if (template.status !== 'active') {
    throw new Error(`Only active templates can be applied (status: ${template.status}).`);
  }

  const now = input.now ?? new Date().toISOString();

  // Filter items to those applicable to this role + employment type
  const applicableItems = template.items.filter(item => {
    const roleMatch =
      item.applies_to_roles.length === 0 || item.applies_to_roles.includes(input.role);
    const etMatch =
      item.applies_to_employment_types.length === 0 ||
      item.applies_to_employment_types.includes(input.employment_type);
    return roleMatch && etMatch;
  });

  const items: OnboardingInstanceItem[] = applicableItems.map((item, idx) => ({
    id: `${input.itemIdPrefix ?? 'inst-item'}-${idx}`,
    template_item_id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    is_required: item.is_required,
    due_offset: item.due_offset,
    accepted_mime_types: item.accepted_mime_types,
    policy_ref: item.policy_ref,
    ordinal: item.ordinal,
    status: 'pending',
  }));

  return {
    id: input.instance_id,
    org_id: template.org_id,
    person_id: input.person_id,
    offer_id: input.offer_id,
    application_id: input.application_id,
    requisition_id: input.requisition_id,
    template_id: template.id,
    template_version: template.version,
    items,
    role: input.role,
    department: input.department,
    employment_type: input.employment_type,
    start_date: input.start_date,
    status: 'not_started',
    created_at: now,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Validate template items
// ---------------------------------------------------------------------------

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTemplateItems(items: OnboardingTemplateItem[]): TemplateValidationResult {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Template must contain at least one item.');
  }

  const ordinals = items.map(i => i.ordinal);
  const dupes = ordinals.filter((o, idx) => ordinals.indexOf(o) !== idx);
  if (dupes.length > 0) {
    errors.push(`Duplicate ordinals found: ${[...new Set(dupes)].join(', ')}.`);
  }

  for (const item of items) {
    if (!item.title.trim()) {
      errors.push(`Item '${item.id}' has an empty title.`);
    }
    if (item.type === 'document' && item.accepted_mime_types && item.accepted_mime_types.length === 0) {
      errors.push(`Document item '${item.id}' has an empty accepted_mime_types list.`);
    }
    if (item.type === 'acknowledgement' && !item.policy_ref) {
      errors.push(`Acknowledgement item '${item.id}' must have a policy_ref.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
