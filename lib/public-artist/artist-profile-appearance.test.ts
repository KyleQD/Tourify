import { describe, expect, it } from "@jest/globals"
import {
  applyArtistProfileTemplatePreset,
  ARTIST_PROFILE_SECTION_IDS,
  ARTIST_PROFILE_TEMPLATES,
  contrastRatio,
  DEFAULT_ARTIST_PROFILE_APPEARANCE,
  mergeArtistProfileDesignState,
  normalizeArtistProfileAppearance,
  readArtistProfileDesignState,
  seedArtistProfileAppearanceFromLegacy,
  suggestAccessibleArtistProfileColors,
  validateArtistProfileAppearancePayload,
  validateArtistProfileContrast,
} from "@/lib/public-artist/artist-profile-appearance"

describe("artist profile appearance", () => {
  it("normalizes unsupported values and completes section contracts", () => {
    const normalized = normalizeArtistProfileAppearance({
      version: 1,
      templateId: "not-a-template",
      accentColor: "javascript:alert(1)",
      sectionOrder: ["music", "music", "about", "unknown"],
      sectionVisibility: { music: false },
    })

    expect(normalized.templateId).toBe("cinematic-marquee")
    expect(normalized.accentColor).toBe(DEFAULT_ARTIST_PROFILE_APPEARANCE.accentColor)
    expect(normalized.sectionOrder[0]).toBe("music")
    expect(new Set(normalized.sectionOrder).size).toBe(ARTIST_PROFILE_SECTION_IDS.length)
    expect(normalized.sectionVisibility.music).toBe(false)
  })

  it("rejects unknown fields, invalid colors, and duplicate sections", () => {
    const errors = validateArtistProfileAppearancePayload({
      ...DEFAULT_ARTIST_PROFILE_APPEARANCE,
      customCss: "body { display: none }",
      accentColor: "red",
      sectionOrder: ["music", "music"],
      headingFont: "https://fonts.example/unsafe.woff2",
    })
    expect(errors).toEqual(
      expect.arrayContaining([
        "Unsupported appearance field: customCss.",
        "accentColor must be a six-digit hex color.",
        "sectionOrder cannot contain duplicates.",
        "headingFont is unsupported.",
      ])
    )
  })

  it("switches templates without losing visibility or order", () => {
    const current = normalizeArtistProfileAppearance({
      ...DEFAULT_ARTIST_PROFILE_APPEARANCE,
      sectionOrder: ["music", "events", ...ARTIST_PROFILE_SECTION_IDS.filter((id) => id !== "music" && id !== "events")],
      sectionVisibility: {
        ...DEFAULT_ARTIST_PROFILE_APPEARANCE.sectionVisibility,
        storefront: false,
      },
    })
    const next = applyArtistProfileTemplatePreset("swiss-signal", current)
    expect(next.templateId).toBe("swiss-signal")
    expect(next.sectionOrder.slice(0, 2)).toEqual(["music", "events"])
    expect(next.sectionVisibility.storefront).toBe(false)
  })

  it("seeds a first draft from legacy EPK colors without publishing it", () => {
    const seeded = seedArtistProfileAppearanceFromLegacy({
      template: "bold",
      epkFont: "mono",
      epkAppearance: {
        ...({} as any),
        accentHex: "#aabbcc",
        pageBackgroundHex: "#010203",
        cardBackgroundHex: "#111213",
        textColorCustomHex: "#ffffff",
      },
    })
    expect(seeded.templateId).toBe("cinematic-marquee")
    expect(seeded.accentColor).toBe("#aabbcc")
    expect(seeded.backgroundColor).toBe("#010203")
    expect(seeded.bodyFont).toBe("mono")
  })

  it("keeps published state in artist settings without exposing a private draft", () => {
    const published = normalizeArtistProfileAppearance(DEFAULT_ARTIST_PROFILE_APPEARANCE)
    const settings = mergeArtistProfileDesignState(
      { public_appearance: { template: "modern" }, unrelated: true },
      {
        version: 1,
        draft: null,
        published,
        updatedAt: "2026-07-28T00:00:00.000Z",
        publishedAt: "2026-07-28T00:00:00.000Z",
      }
    )
    const read = readArtistProfileDesignState(settings)
    expect(read.draft).toBeNull()
    expect(read.published?.accentColor).toBe(published.accentColor)
    expect(settings.unrelated).toBe(true)
    expect(settings.public_appearance).toEqual({ template: "modern" })
  })

  it("blocks low-contrast publishing", () => {
    const appearance = normalizeArtistProfileAppearance({
      ...DEFAULT_ARTIST_PROFILE_APPEARANCE,
      backgroundColor: "#111111",
      surfaceColor: "#181818",
      textColor: "#222222",
      mutedTextColor: "#242424",
    })
    expect(contrastRatio("#ffffff", "#111111")).toBeGreaterThan(4.5)
    expect(validateArtistProfileContrast(appearance).length).toBeGreaterThan(0)
  })

  it("ships accessible signature palettes and repairs split custom surfaces", () => {
    for (const template of ARTIST_PROFILE_TEMPLATES) {
      expect(validateArtistProfileContrast(template.defaultAppearance)).toEqual([])
    }

    const split = normalizeArtistProfileAppearance({
      ...DEFAULT_ARTIST_PROFILE_APPEARANCE,
      backgroundColor: "#000000",
      surfaceColor: "#ffffff",
    })
    const repaired = normalizeArtistProfileAppearance({
      ...split,
      ...suggestAccessibleArtistProfileColors(split),
    })
    expect(validateArtistProfileContrast(repaired)).toEqual([])
  })
})
