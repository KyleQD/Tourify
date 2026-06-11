/**
 * Role template helpers.
 *
 * `role_templates` (migration 20260610000000) is the DB-backed source of truth for
 * structured roles. These helpers read it and derive the Work Mode permission set
 * that is written onto `employment_assignments.permissions` when a worker is hired.
 *
 * A code fallback (ONBOARDING_POSITION_TEMPLATES) keeps hiring working even before
 * the table is seeded or when a position has no matching template.
 *
 * See: docs/architecture/multi-account-system.md §8.4 (Work Mode permissions)
 *      docs/domain/live-events-ontology.md §5 (Workforce)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ONBOARDING_POSITION_TEMPLATES,
  getPositionTemplateByKey,
} from '@/lib/staff/onboarding-position-templates'

export type RoleCategory =
  | 'bar_service'
  | 'security'
  | 'technical'
  | 'production'
  | 'hospitality'
  | 'creative'
  | 'operations'
  | 'management'
  | 'general'

/** Work Mode capabilities granted while on shift. `view_run_sheet`/`access_staff_docs` are scoped. */
export interface WorkModePermissions {
  view_shift_schedule: boolean
  check_in_out: boolean
  view_run_sheet: boolean | 'limited'
  post_official_comms: boolean
  manage_other_staff: boolean
  access_staff_docs: 'own' | 'team' | 'none'
}

export interface RoleTemplate {
  id?: string
  key: string
  label: string
  department: string
  role_category: RoleCategory
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | 'intern'
  permissions: WorkModePermissions
  required_documents: string[]
  required_credentials: unknown[]
  estimated_onboarding_days: number
  tags: string[]
}

/**
 * Default Work Mode permissions by category — the matrix in §8.4.
 * Used as a fallback when no DB template exists for a hired position.
 */
export function derivePermissionsForCategory(category: RoleCategory): WorkModePermissions {
  const base: WorkModePermissions = {
    view_shift_schedule: true,
    check_in_out: true,
    view_run_sheet: true,
    post_official_comms: false,
    manage_other_staff: false,
    access_staff_docs: 'own',
  }

  switch (category) {
    case 'security':
      return { ...base, view_run_sheet: 'limited' }
    case 'management':
    case 'production':
      return {
        ...base,
        post_official_comms: true,
        manage_other_staff: true,
        access_staff_docs: 'team',
      }
    case 'bar_service':
    case 'technical':
    case 'operations':
    case 'hospitality':
    case 'creative':
    case 'general':
    default:
      return base
  }
}

/** Infer a category from a free-text department/position when no key matches. */
export function inferRoleCategory(input?: string | null): RoleCategory {
  const value = (input ?? '').toLowerCase()
  if (!value) return 'general'
  if (/(bar|server|cashier|service)/.test(value)) return 'bar_service'
  if (/(security|door|crowd)/.test(value)) return 'security'
  if (/(audio|sound|light|a\/v|av|stage hand|tech)/.test(value)) return 'technical'
  if (/(stage manager|production|backline|runner)/.test(value)) return 'production'
  if (/(host|hospitality|vip|coat)/.test(value)) return 'hospitality'
  if (/(photo|video|dancer|creative)/.test(value)) return 'creative'
  if (/(forklift|warehouse|operations|logistics)/.test(value)) return 'operations'
  if (/(manager|management|lead|director|supervisor)/.test(value)) return 'management'
  return 'general'
}

function fallbackTemplateFromCode(key?: string | null): RoleTemplate | null {
  const seed = getPositionTemplateByKey(key)
  if (!seed) return null
  const category = inferRoleCategory(`${seed.department} ${seed.position}`)
  return {
    key: seed.key,
    label: seed.label,
    department: seed.department,
    role_category: category,
    employment_type: seed.employmentType,
    permissions: derivePermissionsForCategory(category),
    required_documents: seed.requiredDocuments,
    required_credentials: seed.requiredCredentials,
    estimated_onboarding_days: seed.estimatedDays,
    tags: seed.tags,
  }
}

/**
 * Fetch a role template by key. Prefers an entity-owned template, then a global
 * platform template, then the code seed. Returns null only when nothing matches.
 */
export async function getRoleTemplateByKey(
  supabase: SupabaseClient,
  key: string,
  owner?: { entityType: 'venue' | 'organization'; entityId: string } | null
): Promise<RoleTemplate | null> {
  if (!key) return null

  try {
    let query = supabase.from('role_templates').select('*').eq('key', key).eq('is_active', true)

    if (owner) {
      // Owned template wins; fall back to global below if none found.
      query = query.or(
        `and(owner_entity_type.eq.${owner.entityType},owner_entity_id.eq.${owner.entityId}),owner_entity_id.is.null`
      )
    } else {
      query = query.is('owner_entity_id', null)
    }

    const { data } = await query
    if (Array.isArray(data) && data.length > 0) {
      // Prefer an owned row over a global row when both exist.
      const owned = owner ? data.find((r: any) => r.owner_entity_id === owner.entityId) : null
      return (owned ?? data[0]) as RoleTemplate
    }
  } catch {
    // table missing / RLS — fall through to code seed
  }

  return fallbackTemplateFromCode(key)
}

/**
 * Resolve the Work Mode permission set + category for a hired position.
 * Tries a template key first; otherwise infers from department/position text.
 * Always returns a usable object so hiring is never blocked.
 */
export async function resolveWorkModeGrant(
  supabase: SupabaseClient,
  input: {
    templateKey?: string | null
    position?: string | null
    department?: string | null
    owner?: { entityType: 'venue' | 'organization'; entityId: string } | null
  }
): Promise<{
  roleTemplateId: string | null
  roleCategory: RoleCategory
  permissions: WorkModePermissions
}> {
  const { templateKey, position, department, owner } = input

  const template = templateKey ? await getRoleTemplateByKey(supabase, templateKey, owner) : null
  if (template) {
    return {
      roleTemplateId: template.id ?? null,
      roleCategory: template.role_category,
      permissions: template.permissions,
    }
  }

  const category = inferRoleCategory(`${department ?? ''} ${position ?? ''}`)
  return {
    roleTemplateId: null,
    roleCategory: category,
    permissions: derivePermissionsForCategory(category),
  }
}

/** List all global platform templates (with code-seed fallback). */
export async function listGlobalRoleTemplates(
  supabase: SupabaseClient
): Promise<RoleTemplate[]> {
  try {
    const { data } = await supabase
      .from('role_templates')
      .select('*')
      .is('owner_entity_id', null)
      .eq('is_active', true)
      .order('department', { ascending: true })

    if (Array.isArray(data) && data.length > 0) return data as RoleTemplate[]
  } catch {
    // fall through
  }

  return ONBOARDING_POSITION_TEMPLATES.map(seed => fallbackTemplateFromCode(seed.key)).filter(
    (t): t is RoleTemplate => t !== null
  )
}
