import { describe, expect, it } from "@jest/globals"
import {
  DEFAULT_PUBLIC_ARTIST_APPEARANCE,
  mergePublicArtistAppearanceIntoSettings,
  normalizePublicArtistAppearance,
  readPublicArtistAppearanceFromSettings,
  resolvePublicArtistAppearanceForRender,
} from "@/lib/public-artist/public-artist-appearance"
import {
  buildEpkAppearanceAiPrompt,
  getEpkAppearanceSchemaContractMarkdown,
  parseEpkAppearanceAiPayload,
} from "@/lib/epk/epk-appearance-ai-prompt"
import {
  getDefaultPublicArtistUi,
  getThemedPublicArtistUi,
} from "@/lib/public-artist/public-artist-themed-ui"

describe("normalizePublicArtistAppearance", () => {
  it("returns defaults for invalid input", () => {
    const result = normalizePublicArtistAppearance(null)
    expect(result.template).toBe("modern")
    expect(result.epkFont).toBe("sans")
    expect(result.epkAppearance.cardRadius).toBe("rounded")
  })

  it("normalizes template aliases and hex colors", () => {
    const result = normalizePublicArtistAppearance({
      template: "neon",
      epkFont: "display",
      epkAppearance: {
        accentHex: "#AABBCC",
        effectStyle: "glow",
      },
    })
    expect(result.template).toBe("bold")
    expect(result.epkFont).toBe("display")
    expect(result.epkAppearance.accentHex).toBe("#aabbcc")
    expect(result.epkAppearance.effectStyle).toBe("glow")
  })
})

describe("readPublicArtistAppearanceFromSettings", () => {
  it("returns null when never configured", () => {
    expect(readPublicArtistAppearanceFromSettings({})).toBeNull()
    expect(readPublicArtistAppearanceFromSettings({ public_profile: true })).toBeNull()
  })

  it("reads and normalizes stored public_appearance", () => {
    const result = readPublicArtistAppearanceFromSettings({
      public_appearance: {
        template: "cinema",
        epkFont: "serif",
        epkAppearance: { accentHex: "#c4b5fd" },
      },
    })
    expect(result?.template).toBe("cinema")
    expect(result?.epkFont).toBe("serif")
    expect(result?.epkAppearance.accentHex).toBe("#c4b5fd")
  })
})

describe("mergePublicArtistAppearanceIntoSettings", () => {
  it("preserves unrelated settings keys", () => {
    const merged = mergePublicArtistAppearanceIntoSettings(
      { public_profile: true, professional: { location: "LA" } },
      DEFAULT_PUBLIC_ARTIST_APPEARANCE
    )
    expect(merged.public_profile).toBe(true)
    expect((merged.professional as { location: string }).location).toBe("LA")
    expect(merged.public_appearance).toMatchObject({
      template: "modern",
      epkFont: "sans",
    })
  })
})

describe("resolvePublicArtistAppearanceForRender", () => {
  it("applies CSS variables when accent is set", () => {
    const resolved = resolvePublicArtistAppearanceForRender({
      template: "modern",
      epkFont: "sans",
      epkAppearance: {
        ...DEFAULT_PUBLIC_ARTIST_APPEARANCE.epkAppearance,
        accentHex: "#8b5cf6",
        pageBackgroundHex: "#07080f",
      },
    })
    expect(resolved.rootStyle).toMatchObject({
      "--epk-accent": "#8b5cf6",
      "--epk-page-bg": "#07080f",
    })
    expect(resolved.mergedTokens.page).toContain("bg-")
  })
})

describe("public artist themed ui defaults", () => {
  it("keeps default chrome when appearance is unset", () => {
    const ui = getDefaultPublicArtistUi()
    expect(ui.pageClassName).toBe("")
    expect(ui.pageStyle).toBeUndefined()
    expect(ui.card).toContain("rounded")
  })

  it("maps resolved tokens onto themed chrome", () => {
    const resolved = resolvePublicArtistAppearanceForRender({
      template: "cinema",
      epkFont: "display",
      epkAppearance: {
        ...DEFAULT_PUBLIC_ARTIST_APPEARANCE.epkAppearance,
        accentHex: "#c4b5fd",
      },
    })
    const ui = getThemedPublicArtistUi(resolved)
    expect(ui.pageClassName.length).toBeGreaterThan(0)
    expect(ui.card.length).toBeGreaterThan(0)
    expect(ui.rootStyle).toMatchObject({ "--epk-accent": "#c4b5fd" })
  })
})

describe("epk appearance AI prompt", () => {
  it("includes schema contract and style-only guidance", () => {
    const prompt = buildEpkAppearanceAiPrompt({
      surface: "public_artist_profile",
      artistName: "Nova",
      bio: "Dreamy electronic",
      genres: ["electronic"],
      location: "Berlin",
      currentTemplate: "modern",
      currentFont: "sans",
    })
    expect(prompt).toContain("Style only")
    expect(prompt).toContain(getEpkAppearanceSchemaContractMarkdown().slice(0, 40))
    expect(prompt).toContain("Nova")
    expect(prompt).toContain("electronic")
  })

  it("parses valid AI JSON and rejects bad hex", () => {
    const ok = parseEpkAppearanceAiPayload(
      JSON.stringify({
        template: "poster",
        epkFont: "condensed",
        epkAppearance: {
          accentHex: "#f07167",
          effectStyle: "poster",
        },
      })
    )
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.data.template).toBe("poster")
      expect(ok.data.epkFont).toBe("condensed")
      expect(ok.data.epkAppearance.accentHex).toBe("#f07167")
    }

    const bad = parseEpkAppearanceAiPayload(
      JSON.stringify({
        template: "modern",
        epkFont: "sans",
        epkAppearance: { accentHex: "purple" },
      })
    )
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(bad.errors.some((e) => e.path.includes("accentHex"))).toBe(true)
    }
  })

  it("accepts fenced JSON from AI responses", () => {
    const parsed = parseEpkAppearanceAiPayload(`\`\`\`json
{
  "template": "luxe",
  "epkFont": "serif",
  "epkAppearance": { "accentHex": "#c9a962" }
}
\`\`\``)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.template).toBe("luxe")
  })
})
