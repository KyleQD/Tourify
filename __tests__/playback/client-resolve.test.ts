import { afterEach, describe, expect, it, vi } from "vitest"

import { kindOf, resolveViaPlaybackApi } from "@/lib/playback/client-resolve"

const okResponse = (payload: unknown) =>
  ({ ok: true, json: async () => payload }) as Response

afterEach(() => vi.restoreAllMocks())

describe("client resolve door", () => {
  it("posts the discriminated radio request and returns the source URL", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse({ data: { sourceUrl: "https://stream/live", capabilities: { seek: false } } }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const result = await resolveViaPlaybackApi(
      { kind: "radio_stream", stationId: "s1", playbackSessionId: "p1" },
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/music/playback/resolve")
    expect(JSON.parse(init.body)).toMatchObject({ kind: "radio_stream", stationId: "s1" })
    expect(result.url).toBe("https://stream/live")
  })

  it("maps API error payloads and statuses to friendly errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: { message: "Radio playback is not enabled." } }) }) as Response),
    )
    const result = await resolveViaPlaybackApi({ kind: "radio_stream", stationId: "s1" })
    expect(result).toEqual({ url: null, error: "Radio playback is not enabled." })
  })

  it("treats absent mediaKind as track (legacy compatibility)", () => {
    expect(kindOf({})).toBe("track")
    expect(kindOf({ mediaKind: "radio_stream" })).toBe("radio_stream")
  })
})
