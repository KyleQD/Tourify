import type { ApplicationFormField } from "@/types/admin-onboarding"

// Field names that map directly onto the general profile and are therefore
// auto-filled by Quick Apply rather than re-asked as screening questions.
export const PROFILE_SOURCED_FIELD_NAMES = new Set<string>([
  "full_name",
  "name",
  "email",
  "phone",
  "resume",
  "resume_url",
])

interface FieldLike {
  name?: unknown
  profileField?: unknown
  profile_field?: unknown
}

/**
 * A field is profile-sourced when the employer explicitly tagged it as such, or
 * when its name matches a well-known profile field. Profile-sourced fields are
 * hidden from the Quick Apply screening step because their values come from the
 * shared profile snapshot.
 */
export function isProfileSourcedField(field: FieldLike): boolean {
  if (field.profileField === true || field.profile_field === true) return true
  const name = typeof field.name === "string" ? field.name.toLowerCase() : ""
  return PROFILE_SOURCED_FIELD_NAMES.has(name)
}

/**
 * Returns only the employer-specific screening questions an applicant still
 * needs to answer in the Quick Apply flow.
 */
export function getScreeningFields(fields: ApplicationFormField[] | undefined | null): ApplicationFormField[] {
  if (!Array.isArray(fields)) return []
  return fields
    .filter((field) => !isProfileSourcedField(field))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
