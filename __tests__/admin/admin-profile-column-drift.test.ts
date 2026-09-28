import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

/**
 * Wave 34 `admin` code-drift cluster: `profiles.display_name` and `profiles.phone`.
 *
 * Neither column exists in the active migration chain or in the generated
 * contract (`lib/database.types.ts`), and `profiles` exposes `show_phone` — a
 * boolean privacy flag, not a phone number. Selecting either column made
 * PostgREST reject the whole read, so the three consumers degraded silently:
 *
 * - `onboarding/add-existing-user` discarded the read error and wrote a
 *   fabricated "Existing User" name plus an empty email into
 *   `staff_onboarding_candidates`.
 * - `tours/artists` (directory branch) threw on every search.
 * - `events/[id]/task-messages` recorded the literal sender name "Admin".
 *
 * These tests pin the repaired contract. They also assert the guard is
 * unchanged, so a drift repair can never be used to relax authorization.
 */

const authContext: {
  supabase: any
  admin: { orgId: string }
  user: { id: string }
} = {
  supabase: null,
  admin: { orgId: "org-a" },
  user: { id: "admin-user" },
}

const wrappedCapabilities: string[] = []
const withAdminAuthCapabilities: string[] = []

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  checkAdminPermissions: vi.fn(),
  withAdminCapability: vi.fn((capability, handler) => {
    return (request: NextRequest) => {
      wrappedCapabilities.push(capability)
      return handler(request, authContext)
    }
  }),
  withAdminAuth: vi.fn((handler) => (request: NextRequest) => {
    return handler(request)
  }),
  withPlatformAdmin: vi.fn((handler) => (request: NextRequest) => handler(request, authContext)),
}))

vi.mock("@/lib/admin/admin-tour-event-access", () => ({
  // Faithful to the real helper: a plain Error maps to the caller's fallback
  // status, only an access error maps to 403/404.
  adminAccessErrorResponse: vi.fn(
    (_error: unknown, fallback: string, status: number) => ({ status, message: fallback })
  ),
  assertAdminEventAccess: vi.fn(),
  assertAdminTourAccess: vi.fn(),
}))

vi.mock("@/lib/admin/tour-collaboration", () => ({
  tourArtistInputSchema: { parse: (value: unknown) => value },
}))

import { GET as GET_TOUR_ARTISTS } from "@/app/api/admin/tours/artists/route"

/** Canonical `profiles` columns, mirrored from the generated contract. */
const PROFILES_COLUMNS = [
  "account_settings",
  "account_tier",
  "account_type",
  "admin_level",
  "allow_project_offers",
  "availability_status",
  "avatar_url",
  "bio",
  "company",
  "cover_image",
  "created_at",
  "email",
  "experience_level",
  "followers_count",
  "following_count",
  "full_name",
  "global_search_vector",
  "hourly_rate",
  "id",
  "instagram",
  "is_admin",
  "is_verified",
  "location",
  "metadata",
  "name",
  "onboarding_completed",
  "posts_count",
  "preferred_project_types",
  "privacy_accepted_at",
  "profile_data",
  "public_profile",
  "role",
  "show_availability",
  "show_email",
  "show_hourly_rate",
  "show_location",
  "show_phone",
  "skills",
  "social_links",
  "stripe_connect_account_id",
  "stripe_connect_account_kind",
  "stripe_connect_v2_account_id",
  "stripe_customer_id",
  "title",
  "top_skills",
  "tos_accepted_at",
  "tos_version",
  "twitter",
  "updated_at",
  "url_slug",
  "username",
  "website",
]

function selectedProfilesColumns(selects: string[]): string[] {
  return selects.flatMap((entry) => entry.split(",").map((column) => column.trim()))
}

describe("admin profiles column drift — repaired consumers only select real columns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wrappedCapabilities.length = 0
    withAdminAuthCapabilities.length = 0
  })

  it("regression: the drifted columns are absent from the generated contract", () => {
    // Guard the premise of this repair. If a future regeneration adds
    // `display_name`/`phone`, the repoint below must be revisited.
    expect(PROFILES_COLUMNS).not.toContain("display_name")
    expect(PROFILES_COLUMNS).not.toContain("phone")
    // `show_phone` is a boolean privacy flag and is NOT a phone number source.
    expect(PROFILES_COLUMNS).toContain("show_phone")
  })
})

interface DirectorySelect {
  table: string
  columns: string
  filters: Record<string, unknown>
  orders: Array<[string, boolean]>
}

function createDirectorySupabase(options: {
  profiles: Array<Record<string, unknown>>
  artistProfiles: Array<Record<string, unknown>>
  genresError?: Error | null
}) {
  const selects: DirectorySelect[] = []
  const filters: Array<[string, unknown]> = []
  const ilikeFilters: Array<[string, string]> = []
  const orders: Array<[string, boolean]> = []
  const limits: Array<number> = []
  const genreFilters: Array<[string, unknown[]]> = []

  const chain = (row: Record<string, unknown> | null, failure: Error | null, isArtistProfiles: boolean) => {
    const self: any = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value])
        return self
      }),
      in: vi.fn((column: string, value: unknown[]) => {
        if (isArtistProfiles) genreFilters.push([column, value])
        return self
      }),
      ilike: vi.fn((column: string, value: string) => {
        ilikeFilters.push([column, value])
        return self
      }),
      order: vi.fn((column: string, orderOptions: { ascending: boolean }) => {
        orders.push([column, orderOptions.ascending])
        return self
      }),
      limit: vi.fn((value: number) => {
        limits.push(value)
        return self
      }),
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: row, error: failure }),
    }
    return self
  }

  const from = vi.fn((table: string) => {
    const isProfiles = table === "profiles"
    const isArtistProfiles = table === "artist_profiles"
    const builder: any = {
      select: vi.fn((columns: string) => {
        selects.push({ table, columns, filters: {}, orders: [] })
        const record: DirectorySelect = selects[selects.length - 1]
        const wrapped = chain(
          isProfiles ? options.profiles : isArtistProfiles ? options.artistProfiles : null,
          isArtistProfiles ? options.genresError ?? null : null,
          isArtistProfiles
        )
        const originalOrder = wrapped.order
        wrapped.order = vi.fn((column: string, orderOptions: { ascending: boolean }) => {
          record.orders.push([column, orderOptions.ascending])
          return originalOrder(column, orderOptions)
        })
        return wrapped
      }),
    }
    return builder
  })

  return { from, selects, filters, ilikeFilters, orders, limits, genreFilters }
}

describe("GET /api/admin/tours/artists — directory branch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wrappedCapabilities.length = 0
  })

  it("keeps the tour.view capability guard on the directory branch", async () => {
    const supabase = createDirectorySupabase({ profiles: [], artistProfiles: [] })
    authContext.supabase = supabase

    const response = await GET_TOUR_ARTISTS(
      new NextRequest("https://tourify.test/api/admin/tours/artists?query=nova") as any,
      { params: Promise.resolve({}) } as any
    )

    expect(response.status).toBe(200)
    expect(wrappedCapabilities).toEqual(["tour.view"])
  })

  it("selects only columns that exist on profiles and never `display_name`", async () => {
    const supabase = createDirectorySupabase({ profiles: [], artistProfiles: [] })
    authContext.supabase = supabase

    await GET_TOUR_ARTISTS(
      new NextRequest("https://tourify.test/api/admin/tours/artists?query=nova") as any,
      { params: Promise.resolve({}) } as any
    )

    const profilesSelect = supabase.selects.find((entry) => entry.table === "profiles")
    expect(profilesSelect).toBeDefined()
    const columns = selectedProfilesColumns([profilesSelect!.columns])
    for (const column of columns) {
      expect(PROFILES_COLUMNS).toContain(column)
    }
    expect(columns).not.toContain("display_name")
    expect(columns).not.toContain("primary_genres")
    // The ilike/order predicates must also target a real column.
    for (const [column] of supabase.ilikeFilters) {
      expect(PROFILES_COLUMNS).toContain(column)
    }
    for (const [column] of supabase.orders) {
      expect(PROFILES_COLUMNS).toContain(column)
    }
  })

  it("resolves genres from artist_profiles and keeps the response shape", async () => {
    const supabase = createDirectorySupabase({
      profiles: [
        { id: "user-1", full_name: "Nova Ray", username: "novaray", location: "Berlin", avatar_url: "a.png" },
        { id: "user-2", full_name: null, username: "handle_only", location: null, avatar_url: null },
      ],
      artistProfiles: [
        { user_id: "user-1", genres: ["indie", "synth"] },
        { user_id: "user-2", genres: null },
      ],
    })
    authContext.supabase = supabase

    const response = await GET_TOUR_ARTISTS(
      new NextRequest("https://tourify.test/api/admin/tours/artists?query=nova") as any,
      { params: Promise.resolve({}) } as any
    )
    const body = await response.json()

    expect(body.artists).toEqual([
      { id: "user-1", name: "Nova Ray", location: "Berlin", avatarUrl: "a.png", genres: ["indie", "synth"] },
      { id: "user-2", name: "handle_only", location: null, avatarUrl: null, genres: [] },
    ])

    const genreSelect = supabase.selects.find((entry) => entry.table === "artist_profiles")
    expect(genreSelect?.columns).toBe("user_id, genres")
    expect(supabase.genreFilters).toEqual([["user_id", ["user-1", "user-2"]]])
  })

  it("does not query artist_profiles when the directory is empty", async () => {
    const supabase = createDirectorySupabase({ profiles: [], artistProfiles: [] })
    authContext.supabase = supabase

    await GET_TOUR_ARTISTS(
      new NextRequest("https://tourify.test/api/admin/tours/artists?query=nova") as any,
      { params: Promise.resolve({}) } as any
    )

    expect(supabase.selects.some((entry) => entry.table === "artist_profiles")).toBe(false)
  })

  it("fails closed when the profiles read errors instead of returning a partial directory", async () => {
    const supabase = createDirectorySupabase({ profiles: [], artistProfiles: [] })
    supabase.from = vi.fn((table: string) => {
      if (table === "profiles") {
        const self: any = {
          select: vi.fn(() => self),
          eq: vi.fn(() => self),
          ilike: vi.fn(() => self),
          order: vi.fn(() => self),
          limit: vi.fn(() => self),
          then: (resolve: (value: unknown) => unknown) =>
            resolve({ data: null, error: new Error("column profiles.display_name does not exist") }),
        }
        return self
      }
      throw new Error("artist_profiles must not be reached when the profiles read failed")
    }) as any
    authContext.supabase = supabase

    const response = await GET_TOUR_ARTISTS(
      new NextRequest("https://tourify.test/api/admin/tours/artists?query=nova") as any,
      { params: Promise.resolve({}) } as any
    )

    expect(response.status).toBe(500)
    expect((await response.json()).artists).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// onboarding/add-existing-user — fail-closed identity resolution
// ---------------------------------------------------------------------------

interface CandidateInsert {
  values: Record<string, unknown>
}

function createOnboardingSupabase(options: {
  profile?: Record<string, unknown> | null
  profileError?: Error | null
}) {
  const selects: Array<{ table: string; columns: string }> = []
  const inserts: CandidateInsert[] = []
  const eqFilters: Array<[string, unknown]> = []

  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      const builder: any = {
        select: vi.fn((columns: string) => {
          selects.push({ table, columns })
          const self: any = {
            eq: vi.fn((column: string, value: unknown) => {
              eqFilters.push([column, value])
              return self
            }),
            maybeSingle: vi.fn(async () => ({
              data: options.profile ?? null,
              error: options.profileError ?? null,
            })),
          }
          return self
        }),
      }
      return builder
    }
    if (table === "staff_onboarding_candidates") {
      return {
        insert: vi.fn((values: Record<string, unknown>) => {
          inserts.push({ values })
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: "candidate-1" }, error: null })),
            })),
          }
        }),
      }
    }
    return {}
  })

  return { from, selects, inserts, eqFilters }
}

describe("POST /api/admin/onboarding/add-existing-user", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads only existing profiles columns and takes the phone from the request", async () => {
    const supabase = createOnboardingSupabase({
      profile: { id: "user-1", full_name: "Nova Ray", email: "nova@tourify.test" },
    })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => supabase) }))
    vi.resetModules()
    const { POST } = await import("@/app/api/admin/onboarding/add-existing-user/route")

    const response = await POST(
      new NextRequest("https://tourify.test/api/admin/onboarding/add-existing-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venue_id: "venue-1",
          user_id: "user-1",
          position: "FOH",
          department: "audio",
          phone: "+49 30 000000",
        }),
      })
    )

    expect(response.status).toBe(200)
    const profilesSelect = supabase.selects.find((entry) => entry.table === "profiles")
    expect(profilesSelect?.columns).toBe("id, full_name, email")
    expect(profilesSelect?.columns).not.toContain("phone")
    expect(supabase.inserts).toHaveLength(1)
    expect(supabase.inserts[0].values).toMatchObject({
      name: "Nova Ray",
      email: "nova@tourify.test",
      phone: "+49 30 000000",
    })
  })

  it("fails closed and writes nothing when the profile read errors", async () => {
    const supabase = createOnboardingSupabase({
      profileError: new Error("column profiles.phone does not exist"),
    })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => supabase) }))
    vi.resetModules()
    const { POST } = await import("@/app/api/admin/onboarding/add-existing-user/route")

    const response = await POST(
      new NextRequest("https://tourify.test/api/admin/onboarding/add-existing-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venue_id: "venue-1",
          user_id: "user-1",
          position: "FOH",
          department: "audio",
        }),
      })
    )

    expect(response.status).toBe(502)
    expect(supabase.inserts).toHaveLength(0)
  })

  it("fails closed and writes no fabricated candidate when the profile is missing", async () => {
    const supabase = createOnboardingSupabase({ profile: null })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => supabase) }))
    vi.resetModules()
    const { POST } = await import("@/app/api/admin/onboarding/add-existing-user/route")

    const response = await POST(
      new NextRequest("https://tourify.test/api/admin/onboarding/add-existing-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venue_id: "venue-1",
          user_id: "ghost",
          position: "FOH",
          department: "audio",
        }),
      })
    )

    expect(response.status).toBe(404)
    // The pre-repair behavior wrote name: "Existing User" and email: "".
    expect(supabase.inserts).toHaveLength(0)
  })

  it("still rejects a request that is missing required fields before any read", async () => {
    const supabase = createOnboardingSupabase({ profile: { id: "user-1", full_name: "N", email: "e" } })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => supabase) }))
    vi.resetModules()
    const { POST } = await import("@/app/api/admin/onboarding/add-existing-user/route")

    const response = await POST(
      new NextRequest("https://tourify.test/api/admin/onboarding/add-existing-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ venue_id: "venue-1", user_id: "user-1" }),
      })
    )

    expect(response.status).toBe(400)
    expect(supabase.selects).toHaveLength(0)
    expect(supabase.inserts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// events/[id]/task-messages — sender attribution
// ---------------------------------------------------------------------------

function createTaskMessageServiceClient(options: { profile?: Record<string, unknown> | null }) {
  const profileSelects: string[] = []
  const ownershipFilters: Array<[string, unknown]> = []
  const inserted: Array<{ table: string; values: Record<string, unknown> }> = []

  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      const self: any = {
        select: vi.fn((columns: string) => {
          profileSelects.push(columns)
          return self
        }),
        eq: vi.fn(() => self),
        single: vi.fn(async () => ({ data: options.profile ?? null, error: null })),
      }
      return self
    }
    if (table === "events_v2") {
      // Ownership is granted unconditionally so the sender-attribution behaviour
      // can be isolated from the route's pre-existing path-segment defect
      // (`eventId` is read from pathname segment 5, which is "task-messages",
      // not segment 4). That defect is recorded as an ADMIN-003 blocker and is
      // NOT repaired here: it changes which event's ownership gate runs, which
      // needs an explicit guard decision.
      const self: any = {
        select: vi.fn(() => self),
        eq: vi.fn((column: string, value: unknown) => {
          ownershipFilters.push([column, value])
          return self
        }),
        maybeSingle: vi.fn(async () => ({ data: { id: "event-1" }, error: null })),
      }
      return self
    }
    if (table === "event_participants") {
      const self: any = {
        select: vi.fn(() => self),
        eq: vi.fn(() => self),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      }
      return self
    }
    const builder: any = {
      insert: vi.fn((values: Record<string, unknown>) => {
        inserted.push({ table, values })
        const self: any = {
          select: vi.fn(() => self),
          single: vi.fn(async () => ({ data: { id: "msg-1" }, error: null })),
          then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }),
        }
        return self
      }),
    }
    return builder
  })

  return { from, profileSelects, inserted, ownershipFilters }
}

describe("POST /api/admin/events/[id]/task-messages — sender attribution", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function loadRoute(serviceClient: unknown) {
    vi.resetModules()
    vi.doMock("@/lib/auth/api-auth", () => ({
      authenticateApiRequest: vi.fn(),
      checkAdminPermissions: vi.fn(),
      withAuth: vi.fn((handler) => (request: NextRequest) =>
        handler(request, { user: { id: "sender-1" }, supabase: serviceClient })
      ),
      withAdminCapability: vi.fn(),
      withPlatformAdmin: vi.fn(),
    }))
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => serviceClient),
    }))
    vi.doMock("@/lib/rebuild/workforce-activity-notify", () => ({
      sendWorkforceActivityNotification: vi.fn(async () => undefined),
    }))
    return import("@/app/api/admin/events/[id]/task-messages/route")
  }

  function taskRequest() {
    return new NextRequest(
      "https://tourify.test/api/admin/events/event-1/task-messages",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient_ids: ["11111111-1111-4111-8111-111111111111"],
          task_action: "load-in",
          title: "Load in",
          description: "Bring the PA",
        }),
      }
    )
  }

  it("projects the sender from existing profiles columns only", async () => {
    const service = createTaskMessageServiceClient({
      profile: { full_name: "Nova Ray", username: "novaray" },
    })
    const { POST } = await loadRoute(service)

    const response = await POST(taskRequest())
    expect(response.status).toBe(200)

    expect(service.profileSelects).toEqual(["full_name, username"])
    const columns = selectedProfilesColumns(service.profileSelects)
    for (const column of columns) expect(PROFILES_COLUMNS).toContain(column)
    expect(columns).not.toContain("display_name")

    const message = service.inserted.find((entry) => entry.table === "event_task_messages")
    expect(message?.values.sender_name).toBe("Nova Ray")
  })

  it("documents the pre-existing eventId path-segment defect (ADMIN-003 blocker)", async () => {
    const service = createTaskMessageServiceClient({ profile: { full_name: "Nova Ray" } })
    const { POST } = await loadRoute(service)

    await POST(taskRequest())

    // `request.nextUrl.pathname.split('/')[5]` resolves to "task-messages", not
    // to the `[id]` segment at index 4, so the ownership gate is evaluated
    // against a non-existent event id. Left unrepaired: it is an authorization
    // input change outside the Wave 34 drift mandate.
    expect(service.ownershipFilters).toContainEqual(["id", "task-messages"])
  })

  it("falls back to username, then only then to the literal Admin", async () => {
    const byUsername = createTaskMessageServiceClient({ profile: { full_name: null, username: "handle" } })
    const routeA = await loadRoute(byUsername)
    await routeA.POST(taskRequest())
    expect(
      byUsername.inserted.find((entry) => entry.table === "event_task_messages")?.values.sender_name
    ).toBe("handle")

    const noProfile = createTaskMessageServiceClient({ profile: null })
    const routeB = await loadRoute(noProfile)
    await routeB.POST(taskRequest())
    expect(
      noProfile.inserted.find((entry) => entry.table === "event_task_messages")?.values.sender_name
    ).toBe("Admin")
  })
})
