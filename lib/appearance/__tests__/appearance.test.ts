import { describe, it, expect } from "vitest"
import {
  APPEARANCE_TEMPLATE_REGISTRY,
  getTemplateById,
  getActiveTemplates,
} from "../template-registry"
import { sanitizeForPost } from "../sanitize"
import { POST_FEED_CAPABILITY_MAP } from "../capabilities"

describe("APPEARANCE_TEMPLATE_REGISTRY", () => {
  it("keeps 25 legacy templates and adds exactly eight premiere styles", () => {
    expect(APPEARANCE_TEMPLATE_REGISTRY).toHaveLength(33)
    expect(APPEARANCE_TEMPLATE_REGISTRY.filter((item) => item.family === "epk")).toHaveLength(19)
    expect(
      APPEARANCE_TEMPLATE_REGISTRY.filter((item) => item.family === "page-appearance"),
    ).toHaveLength(6)
    expect(
      APPEARANCE_TEMPLATE_REGISTRY.filter((item) => item.family === "post-premiere"),
    ).toHaveLength(8)
    expect(getActiveTemplates()).toHaveLength(8)
    expect(getActiveTemplates().every((item) => item.family === "post-premiere")).toBe(true)
  })

  it("all IDs in registry are unique", () => {
    const ids = APPEARANCE_TEMPLATE_REGISTRY.map((t) => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

describe("getTemplateById", () => {
  it('keeps "modern" resolvable but retired for new authoring', () => {
    const template = getTemplateById("modern")
    expect(template).toBeDefined()
    expect(template?.lifecycle).toBe("retired")
  })

  it('registers the corrected CMYK label and original CYMKDots alias', () => {
    const template = getTemplateById("cmyk-dots")
    expect(template?.label).toBe("CMYK Dots")
    expect(template?.aliases).toContain("CYMKDots")
  })

  it('returns undefined for "nonexistent"', () => {
    expect(getTemplateById("nonexistent")).toBeUndefined()
  })
})

describe("sanitizeForPost", () => {
  it('strips pageBackgroundHex to null even if "#ff0000" was provided', () => {
    const result = sanitizeForPost({ pageBackgroundHex: "#ff0000" })
    expect(result.pageBackgroundHex).toBeNull()
  })

  it('resets contentWidth to "default" even if "wide" was provided', () => {
    const result = sanitizeForPost({ contentWidth: "wide" })
    expect(result.contentWidth).toBe("default")
  })

  it('preserves accentHex: "#22c55e" unchanged', () => {
    const result = sanitizeForPost({ accentHex: "#22c55e" })
    expect(result.accentHex).toBe("#22c55e")
  })
})

describe("POST_FEED_CAPABILITY_MAP", () => {
  it('pageBackgroundHex has status "unsupported"', () => {
    expect(POST_FEED_CAPABILITY_MAP.pageBackgroundHex.status).toBe("unsupported")
  })

  it('accentHex has status "supported"', () => {
    expect(POST_FEED_CAPABILITY_MAP.accentHex.status).toBe("supported")
  })
})
