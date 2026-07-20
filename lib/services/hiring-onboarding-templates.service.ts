import type { SupabaseClient } from "@supabase/supabase-js"

import type { HiringEntity } from "@/types/hiring-entity"
import type { OnboardingFormField } from "@/types/onboarding-template-resolver"

export type TemplateScope = "employer" | "global"

export interface TemplateWriteInput {
  name?: string | null
  description?: string | null
  department?: string | null
  position?: string | null
  employmentType?: string | null
  fields?: OnboardingFormField[]
  estimatedDays?: number | null
  requiredDocuments?: string[]
  tags?: string[]
  isDefault?: boolean
}

const TEMPLATE_COLUMNS =
  "id,name,description,department,position,employment_type,fields,estimated_days,required_documents,tags,is_default,parent_template_id,employer_entity_type,employer_entity_id,use_count,version,created_at,updated_at"

function employerColumns(employer: HiringEntity) {
  return {
    employer_entity_type: employer.entityType,
    employer_entity_id: employer.entityId,
    venue_id: employer.entityType === "venue" ? employer.entityId : employer.scope?.venueId ?? null,
  }
}

function normalizeWriteInput(input: TemplateWriteInput) {
  const payload: Record<string, unknown> = {}
  if (typeof input.name === "string") payload.name = input.name.trim() || "Untitled template"
  if (input.description !== undefined) payload.description = input.description
  if (input.department !== undefined) payload.department = input.department
  if (input.position !== undefined) payload.position = input.position
  if (input.employmentType !== undefined) payload.employment_type = input.employmentType ?? "contractor"
  if (Array.isArray(input.fields)) payload.fields = input.fields
  if (input.estimatedDays !== undefined) payload.estimated_days = Number(input.estimatedDays ?? 0) || 0
  if (Array.isArray(input.requiredDocuments)) payload.required_documents = input.requiredDocuments
  if (Array.isArray(input.tags)) payload.tags = input.tags
  if (typeof input.isDefault === "boolean") payload.is_default = input.isDefault
  return payload
}

// If a template is marked default, demote other employer templates so there is only one.
async function clearOtherDefaults({
  supabase,
  employer,
  keepId,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  keepId?: string
}) {
  let query = supabase
    .from("staff_onboarding_templates")
    .update({ is_default: false })
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .eq("is_default", true)

  if (keepId) query = query.neq("id", keepId)
  await query
}

export async function listTemplatesForEmployer({
  supabase,
  employer,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
}): Promise<{ data?: Array<Record<string, unknown> & { scope: TemplateScope }>; error?: string }> {
  const [employerResult, globalResult] = await Promise.all([
    supabase
      .from("staff_onboarding_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("staff_onboarding_templates")
      .select(TEMPLATE_COLUMNS)
      .is("employer_entity_type", null)
      .is("employer_entity_id", null)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
  ])

  if (employerResult.error) return { error: employerResult.error.message }
  if (globalResult.error) return { error: globalResult.error.message }

  const employerTemplates = (employerResult.data ?? []).map((row) => ({ ...row, scope: "employer" as const }))
  const globalTemplates = (globalResult.data ?? []).map((row) => ({ ...row, scope: "global" as const }))

  return { data: [...employerTemplates, ...globalTemplates] }
}

export async function getTemplateById({
  supabase,
  id,
}: {
  supabase: SupabaseClient
  id: string
}): Promise<{ data?: Record<string, unknown> & { scope: TemplateScope }; error?: string }> {
  const { data, error } = await supabase.from("staff_onboarding_templates").select(TEMPLATE_COLUMNS).eq("id", id).maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: "Template not found." }
  return { data: { ...data, scope: data.employer_entity_type ? ("employer" as const) : ("global" as const) } }
}

export async function createTemplateForEmployer({
  supabase,
  employer,
  actorUserId,
  input,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  actorUserId: string
  input: TemplateWriteInput
}): Promise<{ data?: Record<string, unknown>; error?: string }> {
  const payload = {
    ...normalizeWriteInput(input),
    ...employerColumns(employer),
    fields: Array.isArray(input.fields) ? input.fields : [],
    created_by: actorUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("staff_onboarding_templates").insert(payload).select(TEMPLATE_COLUMNS).single()
  if (error) return { error: error.message }

  if (data.is_default) await clearOtherDefaults({ supabase, employer, keepId: data.id })

  return { data }
}

export async function updateTemplateForEmployer({
  supabase,
  employer,
  id,
  input,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  id: string
  input: TemplateWriteInput
}): Promise<{ data?: Record<string, unknown>; error?: string; forbidden?: boolean }> {
  const existing = await getTemplateById({ supabase, id })
  if (existing.error || !existing.data) return { error: existing.error ?? "Template not found." }

  if (existing.data.scope === "global") {
    return { forbidden: true, error: "Global templates are read-only. Clone this template to customize it." }
  }

  if (
    existing.data.employer_entity_type !== employer.entityType ||
    existing.data.employer_entity_id !== employer.entityId
  ) {
    return { forbidden: true, error: "Template does not belong to the active hiring entity." }
  }

  // If this template is already attached to published jobs or in-flight candidates,
  // create a new versioned row instead of mutating the live source.
  const [{ count: publishedJobCount }, { count: activeCandidateCount }] = await Promise.all([
    supabase
      .from("job_posting_templates")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_template_id", id)
      .eq("status", "published"),
    supabase
      .from("staff_onboarding_candidates")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id)
      .in("status", ["pending", "in_progress", "submitted", "needs_revision"]),
  ])

  const isInUse = (publishedJobCount ?? 0) > 0 || (activeCandidateCount ?? 0) > 0
  const currentVersion = Number(existing.data.version) || 1

  if (isInUse) {
    const versionedPayload = {
      ...normalizeWriteInput(input),
      ...employerColumns(employer),
      fields: Array.isArray(input.fields)
        ? input.fields
        : Array.isArray(existing.data.fields)
          ? existing.data.fields
          : [],
      name:
        typeof input.name === "string" && input.name.trim()
          ? input.name.trim()
          : String(existing.data.name ?? "Untitled template"),
      parent_template_id: id,
      version: currentVersion + 1,
      is_default: Boolean(input.isDefault ?? existing.data.is_default),
      use_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("staff_onboarding_templates")
      .insert(versionedPayload)
      .select(TEMPLATE_COLUMNS)
      .single()

    if (error) return { error: error.message }
    if (data.is_default) await clearOtherDefaults({ supabase, employer, keepId: data.id })
    return { data }
  }

  const payload = {
    ...normalizeWriteInput(input),
    version: currentVersion,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("staff_onboarding_templates")
    .update(payload)
    .eq("id", id)
    .select(TEMPLATE_COLUMNS)
    .single()

  if (error) return { error: error.message }

  if (data.is_default) await clearOtherDefaults({ supabase, employer, keepId: data.id })

  return { data }
}

export async function deleteTemplateForEmployer({
  supabase,
  employer,
  id,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  id: string
}): Promise<{ ok?: true; error?: string; forbidden?: boolean }> {
  const existing = await getTemplateById({ supabase, id })
  if (existing.error || !existing.data) return { error: existing.error ?? "Template not found." }

  if (existing.data.scope === "global") {
    return { forbidden: true, error: "Global templates cannot be deleted." }
  }

  if (
    existing.data.employer_entity_type !== employer.entityType ||
    existing.data.employer_entity_id !== employer.entityId
  ) {
    return { forbidden: true, error: "Template does not belong to the active hiring entity." }
  }

  const { error } = await supabase.from("staff_onboarding_templates").delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function cloneTemplateForEmployer({
  supabase,
  employer,
  actorUserId,
  sourceId,
  name,
}: {
  supabase: SupabaseClient
  employer: HiringEntity
  actorUserId: string
  sourceId: string
  name?: string | null
}): Promise<{ data?: Record<string, unknown>; error?: string }> {
  const source = await getTemplateById({ supabase, id: sourceId })
  if (source.error || !source.data) return { error: source.error ?? "Source template not found." }

  const row = source.data
  const payload = {
    ...employerColumns(employer),
    name: (name && name.trim()) || `${row.name ?? "Template"} (copy)`,
    description: row.description ?? null,
    department: row.department ?? null,
    position: row.position ?? null,
    employment_type: row.employment_type ?? "contractor",
    fields: Array.isArray(row.fields) ? row.fields : [],
    estimated_days: row.estimated_days ?? 0,
    required_documents: Array.isArray(row.required_documents) ? row.required_documents : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    is_default: false,
    parent_template_id: sourceId,
    created_by: actorUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("staff_onboarding_templates").insert(payload).select(TEMPLATE_COLUMNS).single()
  if (error) return { error: error.message }
  return { data }
}
