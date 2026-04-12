import { NextResponse } from "next/server"
import { GET } from "../route"
import { requireApiUser } from "@/lib/api/route-helpers"

jest.mock("@/lib/api/route-helpers", () => ({
  requireApiUser: jest.fn(),
  jsonError: jest.requireActual("@/lib/api/route-helpers").jsonError,
}))

const mockedRequireApiUser = requireApiUser as jest.MockedFunction<typeof requireApiUser>

function createLibraryQueryResult(data: unknown[] = [], error: { message: string } | null = null) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  }
}

describe("GET /api/music/library", () => {
  it("returns auth response when user is unauthenticated", async () => {
    const unauthorized = NextResponse.json(
      { error: { code: "unauthorized", message: "Authentication required", retryable: false } },
      { status: 401 }
    )
    mockedRequireApiUser.mockResolvedValueOnce({
      success: false,
      response: unauthorized,
    })

    const request = { nextUrl: new URL("http://localhost/api/music/library") } as any
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it("returns library rows for authenticated users", async () => {
    const libraryRows = [{ id: "row-1", music_track_id: "track-1" }]
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "user_music_library") return createLibraryQueryResult(libraryRows, null)
        if (table === "achievement_progress_events") return { insert: jest.fn().mockResolvedValue({ error: null }) }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "user-1" },
        supabase,
      },
    } as any)

    const request = { nextUrl: new URL("http://localhost/api/music/library?limit=10&offset=0") } as any
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual(libraryRows)
  })
})
