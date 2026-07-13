import { describe, expect, it } from "vitest"
import { resolveEpkPreviewTemplateId } from "@/lib/epk/epk-skin-tokens"

describe("resolveEpkPreviewTemplateId", () => {
  it("maps core skins 1:1", () => {
    expect(resolveEpkPreviewTemplateId("modern")).toBe("modern")
    expect(resolveEpkPreviewTemplateId("classic")).toBe("classic")
    expect(resolveEpkPreviewTemplateId("minimal")).toBe("minimal")
    expect(resolveEpkPreviewTemplateId("bold")).toBe("bold")
  })

  it("maps the five new skins 1:1", () => {
    expect(resolveEpkPreviewTemplateId("cinema")).toBe("cinema")
    expect(resolveEpkPreviewTemplateId("gallery")).toBe("gallery")
    expect(resolveEpkPreviewTemplateId("luxe")).toBe("luxe")
    expect(resolveEpkPreviewTemplateId("poster")).toBe("poster")
    expect(resolveEpkPreviewTemplateId("coastal")).toBe("coastal")
  })

  it("keeps legacy accent aliases", () => {
    expect(resolveEpkPreviewTemplateId("black")).toBe("minimal")
    expect(resolveEpkPreviewTemplateId("neon")).toBe("bold")
    expect(resolveEpkPreviewTemplateId("sunset")).toBe("classic")
  })

  it("defaults unknown ids to modern", () => {
    expect(resolveEpkPreviewTemplateId(undefined)).toBe("modern")
    expect(resolveEpkPreviewTemplateId("")).toBe("modern")
    expect(resolveEpkPreviewTemplateId("unknown-skin")).toBe("modern")
  })
})
