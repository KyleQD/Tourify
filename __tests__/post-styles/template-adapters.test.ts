import { TEMPLATE_ADAPTER_CONFIGS, getAdapterConfig } from "@/components/posts/appearance/adapters"
import { APPEARANCE_TEMPLATE_REGISTRY, getActiveTemplates, getTemplatesForFlag, getTemplateById } from "@/lib/appearance/template-registry"
import { compilePostAppearance } from "@/lib/appearance/compile"
import { sanitizeForPost } from "@/lib/appearance/sanitize"
import { getDefaultEpkAppearanceForTemplate } from "@/lib/epk/epk-appearance"
import { getDefaultPostAppearance } from "@/lib/post-appearance/template-registry"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"

const ALL_19_TEMPLATE_IDS = [
  "modern", "classic", "minimal", "bold", "cinema", "gallery", "luxe", "poster", "coastal",
  "scrapbook", "bandcard", "dossier", "pressgrid", "redcolumn", "checkerboard",
  "editorial", "whitespace", "colorblock", "sunburst",
] as const

const PAGE_APPEARANCE_TEMPLATE_IDS = [
  "cinematic-marquee",
  "editorial-cover",
  "analog-rave",
  "swiss-signal",
  "backstage-pass",
  "audio-console",
] as const

const ALL_25_TEMPLATE_IDS = [...ALL_19_TEMPLATE_IDS, ...PAGE_APPEARANCE_TEMPLATE_IDS]
const PREMIERE_TEMPLATE_IDS = [
  "16-bit-sprite", "terminal", "risograph", "cmyk-dots",
  "halftone-print", "dithered-1-bit", "punk-collage", "bootleg-pixel",
] as const

describe("Template adapter coverage", () => {
  it("has adapter config for all 19 templates", () => {
    for (const id of ALL_19_TEMPLATE_IDS) {
      expect(getAdapterConfig(id)).toBeDefined()
    }
  })

  it("all adapter configs have a valid skinId and layout", () => {
    for (const id of ALL_19_TEMPLATE_IDS) {
      const config = getAdapterConfig(id)!
      expect(config.skinId).toBeTruthy()
      expect(["standard", "editorial", "minimal", "bold"]).toContain(config.layout)
    }
  })

  it("TEMPLATE_ADAPTER_CONFIGS covers 25 legacy and eight premiere styles", () => {
    expect(Object.keys(TEMPLATE_ADAPTER_CONFIGS).length).toBe(33)
  })

  it("all 19 templates are in APPEARANCE_TEMPLATE_REGISTRY", () => {
    const registryIds = APPEARANCE_TEMPLATE_REGISTRY.map((t) => t.id)
    for (const id of ALL_19_TEMPLATE_IDS) {
      expect(registryIds).toContain(id)
    }
  })

  it("all 19 registry IDs are unique", () => {
    const ids = APPEARANCE_TEMPLATE_REGISTRY.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all active templates compile without error using default tokens", () => {
    const templates = getActiveTemplates()
    expect(templates.length).toBe(8)
    for (const template of templates) {
      const defaultAppearance = getDefaultPostAppearance(template.id)
      const sanitized = sanitizeForPost(defaultAppearance, template.id)
      expect(() =>
        compilePostAppearance(
          template.id,
          sanitized,
          template.premiere?.defaultConfiguration,
        ),
      ).not.toThrow()
    }
  })

  it("compile output has cssVariables and rootClassName for all 19 templates", () => {
    for (const id of ALL_19_TEMPLATE_IDS) {
      const template = getTemplateById(id)!
      const sanitized = sanitizeForPost(getDefaultEpkAppearanceForTemplate(id), id)
      const compiled = compilePostAppearance(template.skinId as EpkSkinId, sanitized)
      expect(compiled).toHaveProperty("cssVariables")
      expect(compiled).toHaveProperty("rootClassName")
      expect(compiled).toHaveProperty("mergedTokens")
      expect(typeof compiled.rootClassName).toBe("string")
      expect(typeof compiled.mergedTokens.card).toBe("string")
    }
  })

  it("sanitizeForPost removes page-layout-only fields for all 19 templates", () => {
    for (const id of ALL_19_TEMPLATE_IDS) {
      const raw = {
        pageBackgroundHex: "#ff0000",
        contentWidth: "wide",
        coverHeight: "tall",
        coverOverlay: "heavy",
      }
      const sanitized = sanitizeForPost(raw, id)
      expect(sanitized.pageBackgroundHex).toBeNull()
      expect(sanitized.contentWidth).toBe("default")
      expect(sanitized.coverHeight).toBe("medium")
      expect(sanitized.coverOverlay).toBe("medium")
    }
  })

  it("getTemplatesForFlag returns the same eight premiere styles regardless of the retired flag", () => {
    expect(getTemplatesForFlag(false).map((item) => item.id)).toEqual(PREMIERE_TEMPLATE_IDS)
    expect(getTemplatesForFlag(true).map((item) => item.id)).toEqual(PREMIERE_TEMPLATE_IDS)
  })

  it("keeps every legacy template resolvable but retired", () => {
    for (const id of ALL_25_TEMPLATE_IDS) {
      expect(getTemplateById(id)?.lifecycle).toBe("retired")
    }
  })

  it("all six Page Appearance templates are registered and adapted", () => {
    for (const id of PAGE_APPEARANCE_TEMPLATE_IDS) {
      expect(getTemplateById(id)?.family).toBe("page-appearance")
      expect(getAdapterConfig(id)).toBeDefined()
      expect(() =>
        compilePostAppearance(id, getDefaultPostAppearance(id)),
      ).not.toThrow()
    }
  })

  it("no CSS variable value from any skin contains selector-injection characters", () => {
    const dangerousChars = ["{", "}", "<", ">", "@", ";"]
    for (const id of ALL_19_TEMPLATE_IDS) {
      const template = getTemplateById(id)!
      const sanitized = sanitizeForPost(
        { accentHex: "#22c55e", cardBackgroundHex: "#0f172a" },
        id,
      )
      const compiled = compilePostAppearance(template.skinId as EpkSkinId, sanitized)
      for (const [key, value] of Object.entries(compiled.cssVariables)) {
        if (typeof value === "string") {
          for (const char of dangerousChars) {
            expect(value).not.toContain(char)
          }
        }
      }
    }
  })
})
