/**
 * Role template helpers.
 *
 * `role_templates` is the database-backed source of truth for entity-owned role
 * overrides. The platform live-event role catalog supplies a comprehensive global
 * fallback so jobs/workforce can use the same role definitions even before every
 * catalog row is materialized in a database environment.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ONBOARDING_POSITION_TEMPLATES,
  getPositionTemplateByKey,
} from "@/lib/staff/onboarding-position-templates"
import {
  getLiveEventRoleDefinition,
  listLiveEventRoleDefinitions,
} from "@/lib/staff/live-event-role-catalog"

export type RoleCategory =
  | "bar_service"
  | "security"
  | "technical"
  | "production"
  | "hospitality"
  | "creative"
  | "operations"
  | "management"
  | "general"

export interface WorkModePermissions {
  view_shift_schedule: boolean
  check_in_out: boolean
  view_run_sheet: boolean | "limited"
  post_official_comms: boolean
  manage_other_staff: boolean
  access_staff_docs: "own" | "team" | "none"
}

export interface RoleTemplate {
  id?: string
  key: string
  label: string
  department: string
  role_category: RoleCategory
  employment_type: "full_time" | "part_time" | "contractor" | "volunteer" | "intern"
  permissions: WorkModePermissions
  required_documents: string[]
  required_credentials: unknown[]
  estimated_onboarding_days: number
  tags: string[]
  job_summary: string | null
  duties: string[]
  qualifications: string[]
  essentials: string[]
  workflow_requirements: Record<string, unknown>
  owner_entity_type?: "venue" | "organization" | null
  owner_entity_id?: string | null
}

export function derivePermissionsForCategory(category: RoleCategory): WorkModePermissions {
  const base: WorkModePermissions = {
    view_shift_schedule: true,
    check_in_out: true,
    view_run_sheet: true,
    post_official_comms: false,
    manage_other_staff: false,
    access_staff_docs: "own",
  }

  switch (category) {
    case "security":
      return { ...base, view_run_sheet: "limited" }
    case "management":
    case "production":
      return {
        ...base,
        post_official_comms: true,
        manage_other_staff: true,
        access_staff_docs: "team",
      }
    default:
      return base
  }
}

export function inferRoleCategory(input?: string | null): RoleCategory {
  const value = (input ?? "").toLowerCase()
  if (!value) return "general"
  if (/(bar|server|cashier|service)/.test(value)) return "bar_service"
  if (/(security|door|crowd)/.test(value)) return "security"
  if (/(audio|sound|light|a\/v|av|stage hand|tech|network|wifi|video)/.test(value)) return "technical"
  if (/(stage manager|production|backline|runner)/.test(value)) return "production"
  if (/(host|hospitality|vip|coat|guest)/.test(value)) return "hospitality"
  if (/(photo|designer|creative|content|social|makeup)/.test(value)) return "creative"
  if (/(forklift|warehouse|operations|logistics|transport|parking|vendor)/.test(value)) return "operations"
  if (/(manager|management|lead|director|supervisor|founder|buyer|agent)/.test(value)) return "management"
  return "general"
}

function normalizePermissions(value: unknown, category: RoleCategory): WorkModePermissions {
  const base = derivePermissionsForCategory(category)
  if (!value || typeof value !== "object" || Array.isArray(value)) return base
  const candidate = value as Partial<WorkModePermissions>
  return {
    view_shift_schedule:
      typeof candidate.view_shift_schedule === "boolean" ? candidate.view_shift_schedule : base.view_shift_schedule,
    check_in_out: typeof candidate.check_in_out === "boolean" ? candidate.check_in_out : base.check_in_out,
    view_run_sheet:
      candidate.view_run_sheet === "limited" || typeof candidate.view_run_sheet === "boolean"
        ? candidate.view_run_sheet
        : base.view_run_sheet,
    post_official_comms:
      typeof candidate.post_official_comms === "boolean" ? candidate.post_official_comms : base.post_official_comms,
    manage_other_staff:
      typeof candidate.manage_other_staff === "boolean" ? candidate.manage_other_staff : base.manage_other_staff,
    access_staff_docs:
      candidate.access_staff_docs === "own" ||
      candidate.access_staff_docs === "team" ||
      candidate.access_staff_docs === "none"
        ? candidate.access_staff_docs
        : base.access_staff_docs,
  }
}

function normalizeRoleTemplate(row: Record<string, unknown>): RoleTemplate {
  const category = (row.role_category as RoleCategory) || inferRoleCategory(`${row.department ?? ""} ${row.label ?? ""}`)
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    key: String(row.key ?? ""),
    label: String(row.label ?? row.key ?? "Role"),
    department: String(row.department ?? "General"),
    role_category: category,
    employment_type:
      row.employment_type === "full_time" ||
      row.employment_type === "part_time" ||
      row.employment_type === "contractor" ||
      row.employment_type === "volunteer" ||
      row.employment_type === "intern"
        ? row.employment_type
        : "contractor",
    permissions: normalizePermissions(row.permissions, category),
    required_documents: Array.isArray(row.required_documents) ? (row.required_documents as string[]) : [],
    required_credentials: Array.isArray(row.required_credentials) ? row.required_credentials : [],
    estimated_onboarding_days:
      typeof row.estimated_onboarding_days === "number" ? row.estimated_onboarding_days : 7,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    job_summary: typeof row.job_summary === "string" ? row.job_summary : null,
    duties: Array.isArray(row.duties) ? (row.duties as string[]) : [],
    qualifications: Array.isArray(row.qualifications) ? (row.qualifications as string[]) : [],
    essentials: Array.isArray(row.essentials) ? (row.essentials as string[]) : [],
    workflow_requirements:
      row.workflow_requirements && typeof row.workflow_requirements === "object" && !Array.isArray(row.workflow_requirements)
        ? (row.workflow_requirements as Record<string, unknown>)
        : {},
    owner_entity_type:
      row.owner_entity_type === "venue" || row.owner_entity_type === "organization"
        ? row.owner_entity_type
        : null,
    owner_entity_id: typeof row.owner_entity_id === "string" ? row.owner_entity_id : null,
  }
}

function catalogTemplateByKey(key?: string | null): RoleTemplate | null {
  const role = getLiveEventRoleDefinition(key)
  if (!role) return null
  return {
    ...role,
    permissions: role.permissions ?? derivePermissionsForCategory(role.role_category),
    required_documents: role.required_documents ?? [],
    estimated_onboarding_days: role.estimated_onboarding_days ?? 7,
  }
}

function legacyTemplateByKey(key?: string | null): RoleTemplate | null {
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
    job_summary: null,
    duties: [],
    qualifications: [],
    essentials: [],
    workflow_requirements: {},
  }
}

function fallbackTemplateFromCode(key?: string | null): RoleTemplate | null {
  return catalogTemplateByKey(key) ?? legacyTemplateByKey(key)
}

export async function getRoleTemplateById(
  supabase: SupabaseClient,
  id?: string | null
): Promise<RoleTemplate | null> {
  if (!id) return null
  try {
    const { data } = await supabase
      .from("role_templates")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle()

    return data ? normalizeRoleTemplate(data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function getRoleTemplateByKey(
  supabase: SupabaseClient,
  key: string,
  owner?: { entityType: "venue" | "organization"; entityId: string } | null
): Promise<RoleTemplate | null> {
  if (!key) return null

  try {
    let query = supabase.from("role_templates").select("*").eq("key", key).eq("is_active", true)

    if (owner) {
      query = query.or(
        `and(owner_entity_type.eq.${owner.entityType},owner_entity_id.eq.${owner.entityId}),owner_entity_id.is.null`
      )
    } else {
      query = query.is("owner_entity_id", null)
    }

    const { data } = await query
    if (Array.isArray(data) && data.length > 0) {
      const owned = owner ? data.find((row: any) => row.owner_entity_id === owner.entityId) : null
      return normalizeRoleTemplate((owned ?? data[0]) as Record<string, unknown>)
    }
  } catch {
    // Fall through to the platform catalog.
  }

  return fallbackTemplateFromCode(key)
}

export async function resolveWorkModeGrant(
  supabase: SupabaseClient,
  input: {
    roleTemplateId?: string | null
    templateKey?: string | null
    position?: string | null
    department?: string | null
    owner?: { entityType: "venue" | "organization"; entityId: string } | null
  }
): Promise<{
  roleTemplateId: string | null
  roleCategory: RoleCategory
  permissions: WorkModePermissions
}> {
  const { roleTemplateId, templateKey, position, department, owner } = input
  const template =
    (roleTemplateId ? await getRoleTemplateById(supabase, roleTemplateId) : null) ??
    (templateKey ? await getRoleTemplateByKey(supabase, templateKey, owner) : null)

  if (template) {
    return {
      roleTemplateId: template.id ?? roleTemplateId ?? null,
      roleCategory: template.role_category,
      permissions: template.permissions,
    }
  }

  const category = inferRoleCategory(`${department ?? ""} ${position ?? ""}`)
  return {
    roleTemplateId: null,
    roleCategory: category,
    permissions: derivePermissionsForCategory(category),
  }
}

export async function listGlobalRoleTemplates(
  supabase: SupabaseClient
): Promise<RoleTemplate[]> {
  const merged = new Map<string, RoleTemplate>()

  for (const role of listLiveEventRoleDefinitions()) {
    const normalized = catalogTemplateByKey(role.key)
    if (normalized) merged.set(normalized.key, normalized)
  }

  for (const seed of ONBOARDING_POSITION_TEMPLATES) {
    if (!merged.has(seed.key)) {
      const normalized = legacyTemplateByKey(seed.key)
      if (normalized) merged.set(normalized.key, normalized)
    }
  }

  try {
    const { data } = await supabase
      .from("role_templates")
      .select("*")
      .is("owner_entity_id", null)
      .eq("is_active", true)

    for (const row of data ?? []) {
      const normalized = normalizeRoleTemplate(row as Record<string, unknown>)
      if (normalized.key) merged.set(normalized.key, normalized)
    }
  } catch {
    // The code catalog remains available if the table/migration is unavailable.
  }

  return Array.from(merged.values()).sort((a, b) => {
    const department = a.department.localeCompare(b.department)
    return department !== 0 ? department : a.label.localeCompare(b.label)
  })
}
