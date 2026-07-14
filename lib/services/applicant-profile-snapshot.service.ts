import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  ApplicantProfileSnapshot,
  ApplicantProfileSnapshotCertification,
  ApplicantProfileSnapshotExperience,
  ApplicantProfileSnapshotPortfolioItem,
} from "@/types/hiring-application-review"

interface BuildProfileSnapshotArgs {
  supabase: SupabaseClient
  userId: string
  // Falls back to the auth email when the profile omits contact details.
  authEmail?: string | null
  // When true, contact details are shared regardless of profile privacy flags.
  // This reflects explicit consent given at apply time (standard for hiring).
  shareContact?: boolean
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

function asSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const link = asString(raw)
    if (link) result[key] = link
  }
  return result
}

/**
 * Builds an immutable snapshot of the applicant's general profile to share with
 * a hiring party at apply time. Privacy rules are applied here on the server:
 * only public portfolio/experience entries are included, contact details honor
 * the profile visibility flags unless the applicant explicitly consents, and no
 * commerce/account internals are ever included.
 */
export async function buildProfileSnapshot({
  supabase,
  userId,
  authEmail,
  shareContact = false,
}: BuildProfileSnapshotArgs): Promise<ApplicantProfileSnapshot | null> {
  const [profileRes, portfolioRes, experienceRes, certificationRes, endorsementRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("portfolio_items")
      .select("type, title, description, links, media, is_public, order_index")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("order_index", { ascending: true }),
    supabase
      .from("profile_experiences")
      .select("title, organization, start_date, end_date, is_current, description, is_visible, order_index")
      .eq("user_id", userId)
      .eq("is_visible", true)
      .order("order_index", { ascending: true }),
    supabase
      .from("profile_certifications")
      .select("name, authority, issue_date, credential_url, is_public")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("issue_date", { ascending: false }),
    supabase.from("skill_endorsements").select("skill").eq("endorsed_id", userId),
  ])

  const profile = (profileRes.data ?? null) as Record<string, unknown> | null
  if (!profile) return null

  const showEmail = profile.show_email === true || shareContact
  const showPhone = profile.show_phone === true || shareContact
  const showLocation = profile.show_location !== false

  const endorsementCounts: Record<string, number> = {}
  for (const row of (endorsementRes.data ?? []) as Array<{ skill?: unknown }>) {
    const skill = asString(row.skill)
    if (skill) endorsementCounts[skill] = (endorsementCounts[skill] ?? 0) + 1
  }

  const experiences: ApplicantProfileSnapshotExperience[] = ((experienceRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      title: asString(row.title) ?? "Experience",
      organization: asString(row.organization),
      startDate: asString(row.start_date),
      endDate: asString(row.end_date),
      isCurrent: row.is_current === true,
      description: asString(row.description),
    })
  )

  const certifications: ApplicantProfileSnapshotCertification[] = (
    (certificationRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    name: asString(row.name) ?? "Certification",
    authority: asString(row.authority),
    issueDate: asString(row.issue_date),
    credentialUrl: asString(row.credential_url),
  }))

  const portfolio: ApplicantProfileSnapshotPortfolioItem[] = ((portfolioRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      type: asString(row.type) ?? "link",
      title: asString(row.title) ?? "Portfolio item",
      description: asString(row.description),
      links: row.links ?? null,
      media: row.media ?? null,
    })
  )

  const username = asString(profile.username) ?? asString(profile.custom_url)

  return {
    version: "1",
    capturedAt: new Date().toISOString(),
    profileId: userId,
    username,
    publicProfileUrl: username ? `/profile/${username}` : null,
    basics: {
      fullName: asString(profile.full_name) ?? asString(profile.username) ?? "Applicant",
      title: asString(profile.title),
      company: asString(profile.company),
      bio: asString(profile.bio),
      avatarUrl: asString(profile.avatar_url),
      location: showLocation ? asString(profile.location) : null,
      experienceLevel: asString(profile.experience_level),
      availabilityStatus: asString(profile.availability_status),
      hourlyRate: typeof profile.hourly_rate === "number" ? profile.hourly_rate : null,
    },
    contact: {
      email: showEmail ? asString(profile.email) ?? asString(authEmail) : null,
      phone: showPhone ? asString(profile.phone) : null,
      website: asString(profile.website),
      socialLinks: asSocialLinks(profile.social_links),
    },
    skills: {
      topSkills: asStringArray(profile.top_skills),
      skills: asStringArray(profile.skills),
      endorsementCounts,
    },
    experiences,
    certifications,
    portfolio,
  }
}

export interface ProfileCompletenessResult {
  isComplete: boolean
  warnings: string[]
}

/**
 * Soft completeness check. Returns non-blocking warnings the UI can surface to
 * nudge applicants to strengthen their profile before applying.
 */
export function validateSnapshotCompleteness(snapshot: ApplicantProfileSnapshot | null): ProfileCompletenessResult {
  if (!snapshot) {
    return { isComplete: false, warnings: ["Create a profile before applying."] }
  }

  const warnings: string[] = []
  if (!snapshot.basics.bio) warnings.push("Add a short bio so employers know who you are.")
  if (snapshot.experiences.length === 0) warnings.push("Add work experience to stand out.")
  if (snapshot.skills.topSkills.length === 0 && snapshot.skills.skills.length === 0) {
    warnings.push("List a few skills relevant to this role.")
  }

  return { isComplete: warnings.length === 0, warnings }
}
