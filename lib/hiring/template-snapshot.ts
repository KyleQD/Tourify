import type { OnboardingFormField, StaffOnboardingTemplate } from "@/types/onboarding-template-resolver"

export interface OnboardingTemplateSnapshot {
  id: string
  name: string
  description: string | null
  department: string | null
  position: string | null
  employment_type: string | null
  fields: OnboardingFormField[]
  required_documents: string[]
  estimated_days: number | null
  version: number
  snapshotted_at: string
}

export function buildOnboardingTemplateSnapshot(
  template: Pick<
    StaffOnboardingTemplate,
    | "id"
    | "name"
    | "description"
    | "department"
    | "position"
    | "employment_type"
    | "fields"
    | "required_documents"
    | "estimated_days"
  > & { version?: number | null }
): OnboardingTemplateSnapshot {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    department: template.department ?? null,
    position: template.position ?? null,
    employment_type: template.employment_type ?? null,
    fields: Array.isArray(template.fields) ? template.fields : [],
    required_documents: Array.isArray(template.required_documents) ? template.required_documents : [],
    estimated_days: typeof template.estimated_days === "number" ? template.estimated_days : null,
    version: typeof template.version === "number" && template.version > 0 ? template.version : 1,
    snapshotted_at: new Date().toISOString(),
  }
}

export function templateFromSnapshot(snapshot: unknown): StaffOnboardingTemplate | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null
  const row = snapshot as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.name !== "string") return null

  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : null,
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
    fields: Array.isArray(row.fields) ? (row.fields as OnboardingFormField[]) : [],
    required_documents: Array.isArray(row.required_documents) ? (row.required_documents as string[]) : [],
    estimated_days: typeof row.estimated_days === "number" ? row.estimated_days : null,
    use_count: null,
    is_default: null,
    parent_template_id: null,
    created_at: null,
    updated_at: typeof row.snapshotted_at === "string" ? row.snapshotted_at : null,
  }
}

export function snapshotVersionLabel(snapshot: OnboardingTemplateSnapshot | null | undefined): string | null {
  if (!snapshot) return null
  return `v${snapshot.version}`
}
