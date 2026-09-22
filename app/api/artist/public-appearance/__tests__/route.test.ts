import { NextRequest, NextResponse } from "next/server"
import { PUT } from "../route"
import { requireApiUser } from "@/lib/api/route-helpers"
import { DEFAULT_ARTIST_PROFILE_APPEARANCE } from "@/lib/public-artist/artist-profile-appearance"

jest.mock("@/lib/api/route-helpers", () => ({
  requireApiUser: jest.fn(),
  jsonError: jest.requireActual("@/lib/api/route-helpers").jsonError,
}))

const mockedRequireApiUser = requireApiUser as jest.MockedFunction<typeof requireApiUser>

type ProfileRow = {
  id: string
  user_id: string
  artist_name: string
  url_slug: string
  bio: string
  genres: string[]
  settings: Record<string, unknown>
  social_links: unknown[]
  updated_at: string
}

function createStatefulSupabase(profile: ProfileRow) {
  const privateDrafts = new Map<string, unknown>()
  const writes: Array<{ table: string; operation: string }> = []

  function builder(table: string, operation = "select", payload?: Record<string, unknown>) {
    const filters: Record<string, unknown> = {}
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn((field: string, value: unknown) => {
        filters[field] = value
        return query
      }),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      maybeSingle: jest.fn(async () => {
        if (table === "artist_profiles") {
          const matches =
            (!filters.id || filters.id === profile.id) &&
            (!filters.user_id || filters.user_id === profile.user_id)
          return { data: matches ? profile : null, error: null }
        }
        if (table === "artist_profile_design_drafts") {
          const draft = privateDrafts.get(String(filters.artist_profile_id))
          return {
            data: draft ? { draft, updated_at: "2026-07-28T00:00:00.000Z" } : null,
            error: null,
          }
        }
        return { data: null, error: null }
      }),
      update: jest.fn((value: Record<string, unknown>) =>
        builder(table, "update", value)
      ),
      upsert: jest.fn(async (value: Record<string, unknown>) => {
        writes.push({ table, operation: "upsert" })
        privateDrafts.set(String(value.artist_profile_id), value.draft)
        return { error: null }
      }),
      delete: jest.fn(() => builder(table, "delete")),
      then: (
        resolve: (value: { error: null }) => unknown,
        reject: (reason: unknown) => unknown
      ) => {
        try {
          writes.push({ table, operation })
          if (table === "artist_profiles" && operation === "update" && payload) {
            if (
              (!filters.id || filters.id === profile.id) &&
              (!filters.user_id || filters.user_id === profile.user_id)
            ) {
              Object.assign(profile, payload)
            }
          }
          if (table === "artist_profile_design_drafts" && operation === "delete") {
            privateDrafts.delete(String(filters.artist_profile_id))
          }
          return Promise.resolve(resolve({ error: null }))
        } catch (error) {
          return Promise.resolve(reject(error))
        }
      },
    }
    return query
  }

  return {
    client: {
      from: jest.fn((table: string) => builder(table)),
    },
    privateDrafts,
    writes,
  }
}

function request(body: Record<string, unknown>, profileId = "artist-1") {
  return new NextRequest(
    `http://localhost/api/artist/public-appearance?profileId=${profileId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  )
}

function profile(): ProfileRow {
  return {
    id: "artist-1",
    user_id: "owner-1",
    artist_name: "Signal Bloom",
    url_slug: "signal-bloom",
    bio: "Artist bio",
    genres: ["Electronic"],
    settings: {
      unrelated: { retained: true },
      public_appearance: { template: "modern" },
    },
    social_links: [],
    updated_at: "2026-07-27T00:00:00.000Z",
  }
}

describe("PUT /api/artist/public-appearance", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("denies anonymous access", async () => {
    const unauthorized = NextResponse.json({ error: "unauthorized" }, { status: 401 })
    mockedRequireApiUser.mockResolvedValueOnce({
      success: false,
      response: unauthorized,
    })

    const response = await PUT(request({ action: "save_draft" }))
    expect(response.status).toBe(401)
  })

  it("denies a profile that is not owned by the active user", async () => {
    const state = createStatefulSupabase(profile())
    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: { user: { id: "owner-1" }, supabase: state.client },
    } as any)

    const response = await PUT(
      request(
        { action: "save_draft", appearance: DEFAULT_ARTIST_PROFILE_APPEARANCE },
        "artist-2"
      )
    )

    expect(response.status).toBe(404)
    expect(state.writes).toHaveLength(0)
  })

  it("stores drafts privately and preserves unrelated public settings", async () => {
    const row = profile()
    const state = createStatefulSupabase(row)
    const draft = { ...DEFAULT_ARTIST_PROFILE_APPEARANCE, accentColor: "#22d3ee" }
    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: { user: { id: "owner-1" }, supabase: state.client },
    } as any)

    const response = await PUT(request({ action: "save_draft", appearance: draft }))
    const payload = await response.json()
    const storedDesign = row.settings.public_profile_design as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload.profileDesign.draft.accentColor).toBe("#22d3ee")
    expect(state.privateDrafts.get("artist-1")).toEqual(
      expect.objectContaining({ accentColor: "#22d3ee" })
    )
    expect(storedDesign.draft).toBeNull()
    expect(row.settings.unrelated).toEqual({ retained: true })
    expect(row.settings.public_appearance).toEqual({ template: "modern" })
  })

  it("publishes only a validated appearance and keeps the working copy private", async () => {
    const row = profile()
    const state = createStatefulSupabase(row)
    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: { user: { id: "owner-1" }, supabase: state.client },
    } as any)

    const response = await PUT(
      request({ action: "publish", appearance: DEFAULT_ARTIST_PROFILE_APPEARANCE })
    )
    const payload = await response.json()
    const storedDesign = row.settings.public_profile_design as any

    expect(response.status).toBe(200)
    expect(storedDesign.published.templateId).toBe("cinematic-marquee")
    expect(storedDesign.draft).toBeNull()
    expect(payload.profileDesign.draft.templateId).toBe("cinematic-marquee")
    expect(row.settings.unrelated).toEqual({ retained: true })
  })
})
