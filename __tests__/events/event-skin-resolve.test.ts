import { describe, expect, it } from "vitest"
import {
  getEventPageSkinTokens,
  resolveEventPageSkinId,
} from "@/lib/events/event-skin-tokens"

describe("resolveEventPageSkinId", () => {
  it("defaults to modern", () => {
    expect(resolveEventPageSkinId(undefined)).toBe("modern")
    expect(resolveEventPageSkinId(null)).toBe("modern")
    expect(resolveEventPageSkinId("")).toBe("modern")
    expect(resolveEventPageSkinId("unknown-skin")).toBe("modern")
  })

  it("resolves canonical skins", () => {
    expect(resolveEventPageSkinId("classic")).toBe("classic")
    expect(resolveEventPageSkinId("Bold")).toBe("bold")
    expect(resolveEventPageSkinId("cinema")).toBe("cinema")
    expect(resolveEventPageSkinId("coastal")).toBe("coastal")
  })

  it("maps EPK legacy aliases", () => {
    expect(resolveEventPageSkinId("black")).toBe("minimal")
    expect(resolveEventPageSkinId("neon")).toBe("bold")
    expect(resolveEventPageSkinId("sunset")).toBe("classic")
  })
})

describe("getEventPageSkinTokens", () => {
  it("returns distinct tokens per skin", () => {
    const modern = getEventPageSkinTokens("modern")
    const classic = getEventPageSkinTokens("classic")
    expect(modern.isLightSurface).toBe(false)
    expect(classic.isLightSurface).toBe(true)
    expect(modern.page).not.toBe(classic.page)
    expect(modern.btnPrimary).toContain("purple")
  })
})
