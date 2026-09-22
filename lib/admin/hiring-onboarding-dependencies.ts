/**
 * HIRE-405 — Track onboarding dependencies
 *
 * Each onboarding instance item tracks a specific dependency category:
 *   identity_invite, document, credential, policy_ack, payment_payroll,
 *   emergency_profile, travel_profile, equipment_issuance, task
 *
 * Every item has an owner, a due date (computed from start_date + offset),
 * and a status lifecycle.  Blocked/incomplete required items gate completion.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { OnboardingInstance } from './hiring-onboarding-template';

// ---------------------------------------------------------------------------
// Dependency categories
// ---------------------------------------------------------------------------

export type OnboardingDependencyCategory =
  | 'identity_invite'     // send account invite + create org person record
  | 'document'            // collect/sign a required document
  | 'credential'          // verify/upload a required credential/certification
  | 'policy_ack'          // acknowledge a policy / handbook section
  | 'payment_payroll'     // tax form, banking, payroll system handoff
  | 'emergency_profile'   // emergency contacts, medical notes, accessibility
  | 'travel_profile'      // passport, visa, frequent-flyer, dietary (travel-scoped)
  | 'equipment_issuance'  // issue org-owned equipment (radio, badge, laptop, etc.)
  | 'task';               // general to-do with no file requirement

// ---------------------------------------------------------------------------
// Item status lifecycle
// ---------------------------------------------------------------------------

export type OnboardingItemStatus =
  | 'pending'     // not yet started
  | 'in_progress' // owner has acted; awaiting completion/verification
  | 'complete'    // done
  | 'waived'      // explicitly waived by authorized user (reason required)
  | 'blocked';    // cannot proceed; requires intervention

export const ONBOARDING_ITEM_TRANSITIONS: Record<OnboardingItemStatus, OnboardingItemStatus[]> = {
  pending: ['in_progress', 'complete', 'blocked', 'waived'],
  in_progress: ['complete', 'blocked', 'pending', 'waived'],
  complete: [],             // terminal
  waived: [],               // terminal
  blocked: ['pending', 'in_progress', 'waived'],
};

export interface OnboardingItemTransitionResult {
  ok: boolean;
  status: OnboardingItemStatus;
  error?: string;
}

export function transitionOnboardingItem(
  current: OnboardingItemStatus,
  next: OnboardingItemStatus,
  waiveReason?: string,
): OnboardingItemTransitionResult {
  if (!ONBOARDING_ITEM_TRANSITIONS[current].includes(next)) {
    return { ok: false, status: current, error: `Transition ${current} → ${next} is not allowed.` };
  }
  if (next === 'waived' && (!waiveReason || !waiveReason.trim())) {
    return { ok: false, status: current, error: 'waive_reason is required when waiving an item.' };
  }
  return { ok: true, status: next };
}

// ---------------------------------------------------------------------------
// Onboarding dependency item
// ---------------------------------------------------------------------------

export interface OnboardingDependencyItem {
  id: string;
  instance_id: string;
  org_id: string;

  /** Corresponds to OnboardingInstanceItem.template_item_id */
  template_item_id: string;

  category: OnboardingDependencyCategory;
  title: string;
  description?: string;

  is_required: boolean;

  /** ID of the user/team responsible for completing this item */
  owner_id: string;

  /** Derived from start_date + template due_offset; may be null for no-deadline items */
  due_date?: string;   // YYYY-MM-DD

  status: OnboardingItemStatus;
  waive_reason?: string;

  /** For documents: reference to stored document ID or upload token */
  document_ref?: string;
  /** For credentials: reference to credential record */
  credential_ref?: string;
  /** For equipment: equipment item IDs */
  equipment_refs?: string[];
  /** For identity_invite: invite token or linked user_id */
  invite_ref?: string;

  completed_at?: string;
  completed_by?: string;
  blocked_reason?: string;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Complete an item
// ---------------------------------------------------------------------------

export interface CompleteItemInput {
  completed_by: string;
  document_ref?: string;
  credential_ref?: string;
  equipment_refs?: string[];
  invite_ref?: string;
  now?: string;
}

export function completeOnboardingItem(
  item: OnboardingDependencyItem,
  input: CompleteItemInput,
): OnboardingDependencyItem {
  const result = transitionOnboardingItem(item.status, 'complete');
  if (!result.ok) throw new Error(result.error);

  const ts = input.now ?? new Date().toISOString();
  return {
    ...item,
    status: 'complete',
    completed_at: ts,
    completed_by: input.completed_by,
    document_ref: input.document_ref ?? item.document_ref,
    credential_ref: input.credential_ref ?? item.credential_ref,
    equipment_refs: input.equipment_refs ?? item.equipment_refs,
    invite_ref: input.invite_ref ?? item.invite_ref,
    updated_at: ts,
  };
}

// ---------------------------------------------------------------------------
// Waive an item
// ---------------------------------------------------------------------------

export function waiveOnboardingItem(
  item: OnboardingDependencyItem,
  waiveReason: string,
  waivedBy: string,
  now?: string,
): OnboardingDependencyItem {
  const result = transitionOnboardingItem(item.status, 'waived', waiveReason);
  if (!result.ok) throw new Error(result.error);

  const ts = now ?? new Date().toISOString();
  return {
    ...item,
    status: 'waived',
    waive_reason: waiveReason,
    completed_by: waivedBy,
    completed_at: ts,
    updated_at: ts,
  };
}

// ---------------------------------------------------------------------------
// Block an item
// ---------------------------------------------------------------------------

export function blockOnboardingItem(
  item: OnboardingDependencyItem,
  reason: string,
  now?: string,
): OnboardingDependencyItem {
  const result = transitionOnboardingItem(item.status, 'blocked');
  if (!result.ok) throw new Error(result.error);

  const ts = now ?? new Date().toISOString();
  return { ...item, status: 'blocked', blocked_reason: reason, updated_at: ts };
}

// ---------------------------------------------------------------------------
// Due date computation
// ---------------------------------------------------------------------------

/**
 * Parses ISO-8601 duration (P_D only, i.e. "P3D", "P14D") into a day count.
 * Returns null for durations that cannot be parsed into days (or null input).
 */
export function parseDurationDays(iso8601Duration: string | undefined): number | null {
  if (!iso8601Duration) return null;
  const match = iso8601Duration.match(/^P(\d+)D$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function computeDueDate(startDate: string, dueOffset: string | undefined): string | null {
  const days = parseDurationDays(dueOffset);
  if (days === null) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() - days); // offset is BEFORE start_date
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Build dependency items from an onboarding instance
// ---------------------------------------------------------------------------

export interface BuildDependenciesInput {
  owner_id: string;
  now?: string;
  /** Override item ID generation for tests */
  idPrefix?: string;
}

/**
 * Converts an applied OnboardingInstance into a flat list of
 * OnboardingDependencyItem records, deriving category from item type
 * and computing due dates from start_date + due_offset.
 */
export function buildDependencyItems(
  instance: OnboardingInstance,
  input: BuildDependenciesInput,
): OnboardingDependencyItem[] {
  const now = input.now ?? new Date().toISOString();
  const prefix = input.idPrefix ?? 'dep';

  return instance.items.map((item, idx) => ({
    id: `${prefix}-${idx}`,
    instance_id: instance.id,
    org_id: instance.org_id,
    template_item_id: item.template_item_id,
    category: deriveCategory(item.type, item.title),
    title: item.title,
    description: item.description,
    is_required: item.is_required,
    owner_id: input.owner_id,
    due_date: computeDueDate(instance.start_date, item.due_offset) ?? undefined,
    status: 'pending',
    created_at: now,
    updated_at: now,
  }));
}

/**
 * Derives a dependency category from the item type and title.
 * Title heuristics cover common cases; default to the raw type bucket.
 */
function deriveCategory(
  type: 'task' | 'document' | 'acknowledgement',
  title: string,
): OnboardingDependencyCategory {
  const t = title.toLowerCase();
  if (type === 'acknowledgement') return 'policy_ack';
  if (type === 'document') {
    if (t.includes('w-9') || t.includes('w9') || t.includes('direct deposit') || t.includes('bank') || t.includes('payroll') || t.includes('tax')) return 'payment_payroll';
    if (t.includes('passport') || t.includes('visa') || t.includes('travel')) return 'travel_profile';
    if (t.includes('credential') || t.includes('certification') || t.includes('license')) return 'credential';
    return 'document';
  }
  // task
  if (t.includes('equipment') || t.includes('radio') || t.includes('badge') || t.includes('laptop')) return 'equipment_issuance';
  if (t.includes('emergency') || t.includes('accessibility') || t.includes('dietary') || t.includes('medical')) return 'emergency_profile';
  if (t.includes('invite') || t.includes('account') || t.includes('identity')) return 'identity_invite';
  return 'task';
}

// ---------------------------------------------------------------------------
// Instance completion check
// ---------------------------------------------------------------------------

export interface OnboardingCompletionSummary {
  total: number;
  complete: number;
  waived: number;
  pending: number;
  in_progress: number;
  blocked: number;
  required_incomplete: number;
  can_complete: boolean;
  blocking_items: string[];  // IDs of required, non-complete/non-waived items
}

export function computeOnboardingCompletion(
  items: OnboardingDependencyItem[],
): OnboardingCompletionSummary {
  let complete = 0, waived = 0, pending = 0, in_progress = 0, blocked = 0;
  const blocking_items: string[] = [];

  for (const item of items) {
    switch (item.status) {
      case 'complete': complete++; break;
      case 'waived': waived++; break;
      case 'pending': pending++; break;
      case 'in_progress': in_progress++; break;
      case 'blocked': blocked++; break;
    }
    if (item.is_required && item.status !== 'complete' && item.status !== 'waived') {
      blocking_items.push(item.id);
    }
  }

  return {
    total: items.length,
    complete,
    waived,
    pending,
    in_progress,
    blocked,
    required_incomplete: blocking_items.length,
    can_complete: blocking_items.length === 0,
    blocking_items,
  };
}

// ---------------------------------------------------------------------------
// Overdue detection
// ---------------------------------------------------------------------------

export function getOverdueItems(
  items: OnboardingDependencyItem[],
  today: string,
): OnboardingDependencyItem[] {
  return items.filter(
    item =>
      item.due_date &&
      item.due_date < today &&
      item.status !== 'complete' &&
      item.status !== 'waived',
  );
}
