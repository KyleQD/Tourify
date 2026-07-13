import type { SupabaseClient } from "@supabase/supabase-js"

import { getSafeFallbackOnboardingTemplate } from "@/lib/hiring/default-onboarding-templates"
import type {
  ResolveOnboardingTemplateArgs,
  ResolvedOnboardingTemplate,
  StaffOnboardingTemplate,
} from "@/types/onboarding-template-resolver"

type DbTemplateRow = Record<string, unknown>

interface ResolverClientArgs extends ResolveOnboardingTemplateArgs {
  supabase: SupabaseClient
}

function normalizeSearchValue(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function normalizeTemplateRow(row: DbTemplateRow): StaffOnboardingTemplate {
  const fields = Array.isArray(row.fields) ? row.fields : []
  const requiredDocuments = Array.isArray(row.required_documents) ? row.required_documents : []
  const assignees = Array.isArray(row.assignees) ? row.assignees : []
  const tags = Array.isArray(row.tags) ? row.tags : []

  return {
    id: String(row.id),
    name: String(row.name ?? "Untitled onboarding template"),
    description: typeof row.description === "string" ? row.description : null,
    employer_entity_type:
      row.employer_entity_type === "venue" ||
      row.employer_entity_type === "organization" ||
      row.employer_entity_type === "artist"
        ? row.employer_entity_type
        : null,
    employer_entity_id: typeof row.employer_entity_id === "string" ? row.employer_entity_id : null,
    venue_id: typeof row.venue_id === "string" ? row.venue_id : null,
    department: typeof row.department === "string" ? row.department : null,
    position: typeof row.position === "string" ? row.position : null,
    employment_type:
      row.employment_type === "full_time" ||
      row.employment_type === "part_time" ||
      row.employment_type === "contractor" ||
      row.employment_type === "volunteer" ||
      row.employment_type === "intern"
        ? row.employment_type
        : null,
    fields: fields as StaffOnboardingTemplate["fields"],
    estimated_days: typeof row.estimated_days === "number" ? row.estimated_days : null,
    required_documents: requiredDocuments as string[],
    assignees: assignees as string[],
    tags: tags as string[],
    is_default: typeof row.is_default === "boolean" ? row.is_default : null,
    parent_template_id: typeof row.parent_template_id === "string" ? row.parent_template_id : null,
    use_count: typeof row.use_count === "number" ? row.use_count : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  }
}

function matchesSearchValue(candidate: unknown, target: string | null): boolean {
  if (!target) return true
  if (typeof candidate !== "string") return false
  return candidate.trim().toLowerCase() === target
}

async function findByExplicitTemplateId({
  supabase,
  employer,
  templateId,
}: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  if (!templateId) return null

  const { data, error } = await supabase
    .from("staff_onboarding_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle()

  if (error || !data) return null

  const template = normalizeTemplateRow(data as DbTemplateRow)
  const isEmployerScoped =
    template.employer_entity_type === employer.entityType && template.employer_entity_id === employer.entityId
  const isLegacyVenueScoped = employer.entityType === "venue" && template.venue_id === employer.entityId
  const isGlobal = !template.employer_entity_type && !template.employer_entity_id && !template.venue_id

  if (!isEmployerScoped && !isLegacyVenueScoped && !isGlobal) return null

  return template
}

async function findEmployerPositionTemplate({
  supabase,
  employer,
  position,
  department,
}: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  const normalizedPosition = normalizeSearchValue(position)
  const normalizedDepartment = normalizeSearchValue(department)

  let query = supabase
    .from("staff_onboarding_templates")
    .select("*")
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .order("is_default", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(25)

  if (position) query = query.ilike("position", position)
  if (department) query = query.ilike("department", department)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  const bestMatch = data.find((row) => {
    return (
      matchesSearchValue((row as DbTemplateRow).position, normalizedPosition) &&
      matchesSearchValue((row as DbTemplateRow).department, normalizedDepartment)
    )
  })

  return bestMatch ? normalizeTemplateRow(bestMatch as DbTemplateRow) : normalizeTemplateRow(data[0] as DbTemplateRow)
}

async function findLegacyVenuePositionTemplate({
  supabase,
  employer,
  position,
  department,
}: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  if (employer.entityType !== "venue") return null

  let query = supabase
    .from("staff_onboarding_templates")
    .select("*")
    .eq("venue_id", employer.entityId)
    .order("is_default", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(25)

  if (position) query = query.ilike("position", position)
  if (department) query = query.ilike("department", department)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  return normalizeTemplateRow(data[0] as DbTemplateRow)
}

async function findEmployerDefaultTemplate({
  supabase,
  employer,
}: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  const { data, error } = await supabase
    .from("staff_onboarding_templates")
    .select("*")
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return normalizeTemplateRow(data as DbTemplateRow)
}

async function findGlobalPositionTemplate({
  supabase,
  position,
  department,
}: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  const normalizedPosition = normalizeSearchValue(position)
  const normalizedDepartment = normalizeSearchValue(department)

  let query = supabase
    .from("staff_onboarding_templates")
    .select("*")
    .is("employer_entity_type", null)
    .is("employer_entity_id", null)
    .order("is_default", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(25)

  if (position) query = query.ilike("position", position)
  if (department) query = query.ilike("department", department)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null

  const bestMatch = data.find((row) => {
    return (
      matchesSearchValue((row as DbTemplateRow).position, normalizedPosition) &&
      matchesSearchValue((row as DbTemplateRow).department, normalizedDepartment)
    )
  })

  return bestMatch ? normalizeTemplateRow(bestMatch as DbTemplateRow) : normalizeTemplateRow(data[0] as DbTemplateRow)
}

async function findGlobalDefaultTemplate({ supabase }: ResolverClientArgs): Promise<StaffOnboardingTemplate | null> {
  const { data, error } = await supabase
    .from("staff_onboarding_templates")
    .select("*")
    .is("employer_entity_type", null)
    .is("employer_entity_id", null)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return normalizeTemplateRow(data as DbTemplateRow)
}

export async function resolveOnboardingTemplate(args: ResolverClientArgs): Promise<ResolvedOnboardingTemplate> {
  const explicitTemplate = await findByExplicitTemplateId(args)
  if (explicitTemplate) {
    return {
      template: explicitTemplate,
      source: "explicit_template",
      shouldSeedTemplate: false,
    }
  }

  const employerPositionTemplate = await findEmployerPositionTemplate(args)
  if (employerPositionTemplate) {
    return {
      template: employerPositionTemplate,
      source: "employer_position_match",
      shouldSeedTemplate: false,
    }
  }

  const legacyVenueTemplate = await findLegacyVenuePositionTemplate(args)
  if (legacyVenueTemplate) {
    return {
      template: legacyVenueTemplate,
      source: "employer_position_match",
      shouldSeedTemplate: false,
    }
  }

  const employerDefaultTemplate = await findEmployerDefaultTemplate(args)
  if (employerDefaultTemplate) {
    return {
      template: employerDefaultTemplate,
      source: "employer_default",
      shouldSeedTemplate: false,
    }
  }

  const globalPositionTemplate = await findGlobalPositionTemplate(args)
  if (globalPositionTemplate) {
    return {
      template: globalPositionTemplate,
      source: "global_position_match",
      shouldSeedTemplate: false,
    }
  }

  const globalDefaultTemplate = await findGlobalDefaultTemplate(args)
  if (globalDefaultTemplate) {
    return {
      template: globalDefaultTemplate,
      source: "global_default",
      shouldSeedTemplate: false,
    }
  }

  return {
    template: getSafeFallbackOnboardingTemplate(),
    source: "static_safe_fallback",
    shouldSeedTemplate: true,
  }
}
