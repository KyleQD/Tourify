import { describe, expect, it } from "vitest"

import {
  buildProfileSnapshot,
  validateSnapshotCompleteness,
} from "@/lib/services/applicant-profile-snapshot.service"
import { getScreeningFields, isProfileSourcedField } from "@/lib/hiring/quick-apply-fields"
import type { ApplicationFormField } from "@/types/admin-onboarding"

interface TableData {
  profiles: Record<string, unknown> | null
  portfolio_items: Record<string, unknown>[]
  profile_experiences: Record<string, unknown>[]
  profile_certifications: Record<string, unknown>[]
  skill_endorsements: Array<{ skill: string }>
}

function createSupabaseMock(data: TableData) {
  return {
    from(table: keyof TableData) {
      const result =
        table === "profiles"
          ? { data: data.profiles, error: null }
          : { data: data[table], error: null }

      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: unknown) => unknown) => resolve(result),
      }

      return builder
    },
  }
}

const baseProfile = {
  id: "user_1",
  full_name: "Avery Worker",
  username: "avery",
  title: "Stage Manager",
  company: "Tour Co",
  bio: "Ten years on the road.",
  avatar_url: "https://example.com/avatar.png",
  location: "Austin, TX",
  email: "avery@example.com",
  phone: "555-0100",
  website: "https://avery.example.com",
  experience_level: "senior",
  availability_status: "available",
  hourly_rate: 75,
  top_skills: ["Rigging", "Scheduling"],
  skills: ["Rigging", "Scheduling", "Advancing"],
  social_links: { linkedin: "https://linkedin.com/in/avery" },
  show_email: false,
  show_phone: false,
  show_location: true,
}

function createData(overrides: Partial<TableData> = {}): TableData {
  return {
    profiles: baseProfile,
    portfolio_items: [{ type: "video", title: "Reel", description: "Highlights", links: [], media: [] }],
    profile_experiences: [
      { title: "Stage Manager", organization: "Tour Co", start_date: "2020-01-01", is_current: true, description: "Lead" },
    ],
    profile_certifications: [{ name: "OSHA 30", authority: "OSHA", issue_date: "2021-01-01" }],
    skill_endorsements: [{ skill: "Rigging" }, { skill: "Rigging" }, { skill: "Scheduling" }],
    ...overrides,
  }
}

describe("buildProfileSnapshot", () => {
  it("maps profile fields into a snapshot", async () => {
    const supabase = createSupabaseMock(createData())

    const snapshot = await buildProfileSnapshot({ supabase: supabase as never, userId: "user_1" })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.basics.fullName).toBe("Avery Worker")
    expect(snapshot?.basics.title).toBe("Stage Manager")
    expect(snapshot?.skills.topSkills).toEqual(["Rigging", "Scheduling"])
    expect(snapshot?.skills.endorsementCounts).toEqual({ Rigging: 2, Scheduling: 1 })
    expect(snapshot?.experiences).toHaveLength(1)
    expect(snapshot?.certifications[0]?.name).toBe("OSHA 30")
    expect(snapshot?.publicProfileUrl).toBe("/profile/avery")
  })

  it("hides contact details when privacy flags are off and no consent is given", async () => {
    const supabase = createSupabaseMock(createData())

    const snapshot = await buildProfileSnapshot({ supabase: supabase as never, userId: "user_1", shareContact: false })

    expect(snapshot?.contact.email).toBeNull()
    expect(snapshot?.contact.phone).toBeNull()
    // Website is not gated by a privacy flag.
    expect(snapshot?.contact.website).toBe("https://avery.example.com")
  })

  it("shares contact details when the applicant consents", async () => {
    const supabase = createSupabaseMock(createData())

    const snapshot = await buildProfileSnapshot({ supabase: supabase as never, userId: "user_1", shareContact: true })

    expect(snapshot?.contact.email).toBe("avery@example.com")
    expect(snapshot?.contact.phone).toBe("555-0100")
  })

  it("falls back to the auth email when the profile has none and consent is given", async () => {
    const supabase = createSupabaseMock(createData({ profiles: { ...baseProfile, email: null } }))

    const snapshot = await buildProfileSnapshot({
      supabase: supabase as never,
      userId: "user_1",
      authEmail: "fallback@example.com",
      shareContact: true,
    })

    expect(snapshot?.contact.email).toBe("fallback@example.com")
  })

  it("returns null when the applicant has no profile", async () => {
    const supabase = createSupabaseMock(createData({ profiles: null }))

    const snapshot = await buildProfileSnapshot({ supabase: supabase as never, userId: "user_1" })

    expect(snapshot).toBeNull()
  })
})

describe("validateSnapshotCompleteness", () => {
  it("flags a missing profile as incomplete", () => {
    const result = validateSnapshotCompleteness(null)
    expect(result.isComplete).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("returns no warnings for a rich profile", async () => {
    const supabase = createSupabaseMock(createData())
    const snapshot = await buildProfileSnapshot({ supabase: supabase as never, userId: "user_1" })

    const result = validateSnapshotCompleteness(snapshot)
    expect(result.isComplete).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })
})

describe("getScreeningFields", () => {
  const fields: ApplicationFormField[] = [
    { id: "1", name: "full_name", label: "Full name", type: "text", required: true, order: 0 },
    { id: "2", name: "email", label: "Email", type: "email", required: true, order: 1 },
    { id: "3", name: "guard_card", label: "Guard card #", type: "text", required: true, order: 2 },
    { id: "4", name: "availability", label: "Availability", type: "select", required: false, order: 3 },
    { id: "5", name: "custom_tag", label: "Tagged profile field", type: "text", required: false, order: 4, profileField: true },
  ]

  it("excludes profile-sourced and explicitly tagged fields", () => {
    const screening = getScreeningFields(fields)
    expect(screening.map((field) => field.name)).toEqual(["guard_card", "availability"])
  })

  it("identifies profile-sourced fields", () => {
    expect(isProfileSourcedField({ name: "email" })).toBe(true)
    expect(isProfileSourcedField({ name: "guard_card" })).toBe(false)
    expect(isProfileSourcedField({ name: "anything", profileField: true })).toBe(true)
  })
})
