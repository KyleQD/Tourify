import { describe, expect, it } from "vitest"
import {
  normalizeEpkAppearance,
  normalizeHexColor,
  resolveEpkAppearanceForRender,
  DEFAULT_EPK_APPEARANCE,
} from "@/lib/epk/epk-appearance"
import { normalizeEpkFontId, EPK_FONT_IDS } from "@/lib/epk/epk-preview-utils"

describe("normalizeHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(normalizeHexColor("#AbCdEf")).toBe("#abcdef")
  })

  it("rejects invalid values", () => {
    expect(normalizeHexColor("#fff")).toBeNull()
    expect(normalizeHexColor("red")).toBeNull()
    expect(normalizeHexColor(null)).toBeNull()
  })
})

describe("normalizeEpkAppearance", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeEpkAppearance(null)).toEqual(DEFAULT_EPK_APPEARANCE)
  })

  it("normalizes new customization fields", () => {
    const result = normalizeEpkAppearance({
      fontSizeScale: "xl",
      headingScale: "lg",
      contentWidth: "wide",
      borderStrength: "strong",
      pageBackgroundHex: "#0A1628",
      accentHex: "#c9a962",
      textColorCustomHex: "not-a-color",
    })
    expect(result.fontSizeScale).toBe("xl")
    expect(result.headingScale).toBe("lg")
    expect(result.contentWidth).toBe("wide")
    expect(result.borderStrength).toBe("strong")
    expect(result.pageBackgroundHex).toBe("#0a1628")
    expect(result.accentHex).toBe("#c9a962")
    expect(result.textColorCustomHex).toBeNull()
  })

  it("falls back unknown enums to defaults", () => {
    const result = normalizeEpkAppearance({
      fontSizeScale: "huge",
      headingScale: "mega",
      contentWidth: "full",
      borderStrength: "none",
    })
    expect(result.fontSizeScale).toBe("md")
    expect(result.headingScale).toBe("md")
    expect(result.contentWidth).toBe("default")
    expect(result.borderStrength).toBe("default")
  })
})

describe("resolveEpkAppearanceForRender", () => {
  it("sets CSS vars and content width for custom colors", () => {
    const appearance = normalizeEpkAppearance({
      accentHex: "#6366f1",
      pageBackgroundHex: "#111111",
      textColorCustomHex: "#eeeeee",
      contentWidth: "narrow",
      headingScale: "xl",
      fontSizeScale: "xs",
    })
    const resolved = resolveEpkAppearanceForRender({
      skin: "modern",
      appearance,
    })
    expect(resolved.rootStyle).toMatchObject({
      "--epk-accent": "#6366f1",
      "--epk-page-bg": "#111111",
      "--epk-custom-text": "#eeeeee",
    })
    expect(resolved.contentMaxWidthClass).toBe("max-w-3xl")
    expect(resolved.wrapperClassName).toContain("text-xs")
    expect(resolved.wrapperClassName).toContain("[&_h1]")
    expect(resolved.mergedTokens.page).toContain("--epk-page-bg")
  })

  it("keeps gallery narrow when contentWidth is default", () => {
    const resolved = resolveEpkAppearanceForRender({
      skin: "gallery",
      appearance: DEFAULT_EPK_APPEARANCE,
    })
    expect(resolved.contentMaxWidthClass).toBe("max-w-3xl")
  })
})

describe("normalizeEpkFontId", () => {
  it("accepts all registered font ids", () => {
    for (const id of EPK_FONT_IDS) expect(normalizeEpkFontId(id)).toBe(id)
  })

  it("falls back unknown fonts to sans", () => {
    expect(normalizeEpkFontId("comic-sans")).toBe("sans")
    expect(normalizeEpkFontId(undefined)).toBe("sans")
  })
})
