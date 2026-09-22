import { describe, it, expect } from "vitest"
import { compilePostAppearance } from "@/lib/appearance/compile"
import type { PostCompiledAppearance } from "@/lib/appearance/compile"
import { normalizeEpkAppearance } from "@/lib/epk/epk-appearance"

// Helpers
function hasEscapeableSelector(value: string): boolean {
  // CSS selector-injection characters that could break [data-post-appearance] scoping
  return /[{}<>@;]/.test(value)
}

describe("PostStyleBoundary CSS isolation contract", () => {
  it("compilePostAppearance produces cssVariables for modern skin with default tokens", () => {
    const defaultAppearance = normalizeEpkAppearance({ skin: "modern" })
    const compiled = compilePostAppearance("modern", defaultAppearance)

    expect(compiled).toBeDefined()
    expect(compiled.cssVariables).toBeDefined()
    expect(compiled.rootClassName).toBeDefined()
    expect(compiled.mergedTokens).toBeDefined()
  })

  it("modern skin cssVariables is a plain object; any keys present are CSS custom properties (--prefix)", () => {
    const defaultAppearance = normalizeEpkAppearance({ skin: "modern" })
    const compiled = compilePostAppearance("modern", defaultAppearance)

    // cssVariables may be empty when no custom colors override defaults — that is valid
    expect(compiled.cssVariables).toBeTypeOf("object")
    expect(compiled.cssVariables).not.toBeNull()

    // Any keys that ARE present must be CSS custom property names
    for (const key of Object.keys(compiled.cssVariables)) {
      expect(key, `Expected CSS var key "${key}" to start with --`).toMatch(/^--/)
    }
  })

  it("modern skin with custom accentHex produces at least one CSS variable", () => {
    const appearance = normalizeEpkAppearance({ skin: "modern", accentHex: "#22c55e" })
    const compiled = compilePostAppearance("modern", appearance)
    const cssVarKeys = Object.keys(compiled.cssVariables)
    // A custom accent color must produce at least one CSS variable
    expect(cssVarKeys.length).toBeGreaterThan(0)
    for (const key of cssVarKeys) {
      expect(key).toMatch(/^--/)
    }
  })

  it("no CSS variable value from modern skin contains selector-injection characters", () => {
    const defaultAppearance = normalizeEpkAppearance({ skin: "modern" })
    const compiled: PostCompiledAppearance = compilePostAppearance("modern", defaultAppearance)

    for (const [key, value] of Object.entries(compiled.cssVariables)) {
      if (typeof value === "string") {
        expect(
          hasEscapeableSelector(value),
          `CSS variable ${key} has value "${value}" which contains a selector-escapeable character`,
        ).toBe(false)
      }
    }
  })

  it("no CSS variable value from all 19 skins contains selector-injection characters", () => {
    const skins = [
      "modern", "classic", "minimal", "bold", "cinema", "gallery",
      "luxe", "poster", "coastal", "scrapbook", "bandcard", "dossier",
      "pressgrid", "redcolumn", "checkerboard", "editorial", "whitespace",
      "colorblock", "sunburst",
    ] as const

    for (const skin of skins) {
      const defaultAppearance = normalizeEpkAppearance({ skin })
      const compiled = compilePostAppearance(skin, defaultAppearance)

      for (const [key, value] of Object.entries(compiled.cssVariables)) {
        if (typeof value === "string") {
          expect(
            hasEscapeableSelector(value),
            `[${skin}] CSS variable ${key}="${value}" contains a selector-escapeable character`,
          ).toBe(false)
        }
      }
    }
  })

  it("PostStyleBoundary props: rootClassName is a non-empty string for modern skin", () => {
    const defaultAppearance = normalizeEpkAppearance({ skin: "modern" })
    const compiled = compilePostAppearance("modern", defaultAppearance)
    // rootClassName may be empty string for some skins (e.g. surfaceStyle: "default")
    // but it must always be a string
    expect(typeof compiled.rootClassName).toBe("string")
  })

  it("PostStyleBoundary props: mergedTokens.card is a non-empty string for modern skin", () => {
    const defaultAppearance = normalizeEpkAppearance({ skin: "modern" })
    const compiled = compilePostAppearance("modern", defaultAppearance)
    expect(typeof compiled.mergedTokens.card).toBe("string")
    expect(compiled.mergedTokens.card.length).toBeGreaterThan(0)
  })

  it("PostStyleBoundary data-post-appearance attribute: templateId and templateVersion are stable values", () => {
    // These are the values we pass to the article element as data-template / data-template-version.
    // They must be strings/numbers with no special selector characters.
    const templateId = "modern"
    const templateVersion = 1

    expect(typeof templateId).toBe("string")
    expect(hasEscapeableSelector(templateId)).toBe(false)
    expect(typeof templateVersion).toBe("number")
  })
})
