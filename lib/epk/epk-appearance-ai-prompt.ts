import {
  DEFAULT_EPK_APPEARANCE,
  getDefaultEpkAppearanceForTemplate,
  invalidEpkAppearanceHexFields,
  normalizeEpkAppearance,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance"
import {
  resolveEpkPreviewTemplateId,
  type EpkSkinId,
} from "@/lib/epk/epk-skin-tokens"
import {
  EPK_FONT_IDS,
  normalizeEpkFontId,
  type EpkFontId,
} from "@/lib/epk/epk-preview-utils"

export interface EpkAppearanceAiPayload {
  template: EpkSkinId
  epkFont: EpkFontId
  epkAppearance: EpkAppearance
}

export interface EpkAppearanceAiPromptSnapshot {
  surface: "epk" | "public_artist_profile"
  artistName: string | null
  bio: string | null
  genres: string[]
  location: string | null
  currentTemplate: string
  currentFont: string
}

export interface EpkAppearanceValidationError {
  path: string
  message: string
}

const TEMPLATE_IDS = [
  "modern",
  "classic",
  "minimal",
  "bold",
  "cinema",
  "gallery",
  "luxe",
  "poster",
  "coastal",
  "scrapbook",
  "bandcard",
  "dossier",
  "pressgrid",
  "redcolumn",
  "checkerboard",
  "editorial",
  "whitespace",
  "colorblock",
  "sunburst",
] as const

const EXAMPLE_PAYLOAD: EpkAppearanceAiPayload = {
  template: "cinema",
  epkFont: "display",
  epkAppearance: {
    ...getDefaultEpkAppearanceForTemplate("cinema"),
    accentHex: "#c4b5fd",
    secondaryAccentHex: "#67e8f9",
    pageBackgroundHex: "#0a0a0f",
    effectStyle: "glow",
    effectIntensity: "medium",
    backgroundStyle: "radial",
    heroImageTreatment: "cinematic",
    buttonStyle: "glass",
    surfaceStyle: "glass",
  },
}

export function getEpkAppearanceSchemaContractMarkdown(): string {
  return [
    "### Root object",
    "- `template` (string, required): one of " + TEMPLATE_IDS.map((id) => `\`${id}\``).join(", "),
    "- `epkFont` (string, required): one of " + EPK_FONT_IDS.map((id) => `\`${id}\``).join(", "),
    "- `epkAppearance` (object, required): visual knobs listed below",
    "",
    "### epkAppearance fields",
    "- `fontSizeScale`: `xs` | `sm` | `md` | `lg` | `xl`",
    "- `textColorPreset`: `inherit` | `high_contrast` | `muted`",
    "- `textColorCustomHex`: `#rrggbb` or null",
    "- `cardRadius`: `sharp` | `rounded` | `pill`",
    "- `cardSurface`: `default` | `elevated` | `minimal`",
    "- `accentHex`, `secondaryAccentHex`, `pageBackgroundHex`, `cardBackgroundHex`, `borderColorHex`: `#rrggbb` or null",
    "- `headingScale`: `sm` | `md` | `lg` | `xl`",
    "- `contentWidth`: `narrow` | `default` | `wide`",
    "- `borderStrength`: `subtle` | `default` | `strong`",
    "- `buttonStyle`: `solid` | `glass` | `outline` | `neon` | `minimal`",
    "- `surfaceStyle`: `default` | `glass` | `solid` | `editorial` | `outlined`",
    "- `effectStyle`: `none` | `glow` | `glass` | `shadow` | `neon` | `grain` | `spotlight` | `poster`",
    "- `effectIntensity`: `subtle` | `medium` | `high`",
    "- `backgroundStyle`: `template` | `solid` | `radial` | `mesh` | `spotlight`",
    "- `heroImageTreatment`: `natural` | `cinematic` | `duotone` | `soft` | `posterized`",
    "- `sectionDividerStyle`: `none` | `line` | `accent` | `glow` | `ticker`",
    "- `buttonRadius`: `sharp` | `rounded` | `pill`",
    "- `avatarShape`: `circle` | `rounded` | `square`",
    "- `avatarSize`: `sm` | `md` | `lg` | `xl`",
    "- `sectionSpacing`: `compact` | `default` | `relaxed`",
    "- `coverHeight`: `short` | `medium` | `tall`",
    "- `coverOverlay`: `light` | `medium` | `heavy`",
    "",
    "### Rules",
    "- Return ONLY style fields. Do not invent bio, tracks, events, or layout sections.",
    "- Hex colors must be 6-digit `#rrggbb` (lowercase preferred).",
    "- Pick one cohesive mood and push it through template + palette + effects.",
  ].join("\n")
}

export function buildEpkAppearanceAiPrompt(snapshot: EpkAppearanceAiPromptSnapshot): string {
  const surfaceLabel =
    snapshot.surface === "epk"
      ? "Tourify artist EPK (electronic press kit)"
      : "Tourify public artist profile page (style overlay only — same content/sections)"

  return [
    "# Tourify EPK-style appearance",
    "",
    `You are designing a **visual appearance** for a ${surfaceLabel}.`,
    "Return **ONLY** a single valid JSON object that matches the schema below.",
    "Do not wrap the JSON in markdown fences. Do not include commentary before or after the JSON.",
    "",
    "## Goal",
    "Style only: template skin, font, colors, surfaces, and effects.",
    "Do not change information architecture, sections, CTAs, or invent profile content.",
    "",
    "## Schema contract",
    getEpkAppearanceSchemaContractMarkdown(),
    "",
    "## Artist context",
    `- name: ${snapshot.artistName || "(unknown)"}`,
    `- genres: ${snapshot.genres.length ? snapshot.genres.join(", ") : "(none)"}`,
    `- location: ${snapshot.location || "(none)"}`,
    `- bio: ${snapshot.bio ? snapshot.bio.slice(0, 400) : "(none)"}`,
    `- current template: ${snapshot.currentTemplate}`,
    `- current font: ${snapshot.currentFont}`,
    "",
    "## Minimal valid example",
    "```json",
    JSON.stringify(EXAMPLE_PAYLOAD, null, 2),
    "```",
    "",
    "## Design guidance",
    "- Match mood to genre and bio tone (e.g. cinema for cinematic R&B, bold/neon for electronic, classic for singer-songwriter)",
    "- Keep contrast readable",
    "- Prefer a strong accent + supporting secondary; avoid random unrelated colors",
    "",
    "## Output",
    "Return only the JSON object with `template`, `epkFont`, and `epkAppearance`.",
  ].join("\n")
}

export function buildEpkAppearanceFixPrompt(errors: EpkAppearanceValidationError[]): string {
  return [
    "# Fix Tourify EPK-style appearance JSON",
    "",
    "The previous JSON failed validation. Return a corrected JSON object only (no markdown fences).",
    "",
    "## Errors",
    ...errors.map((error) => `- ${error.path}: ${error.message}`),
    "",
    "## Schema contract",
    getEpkAppearanceSchemaContractMarkdown(),
    "",
    "## Output",
    "Return only the fixed JSON object.",
  ].join("\n")
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced?.[1]) return fenced[1].trim()
  return trimmed
}

export function parseEpkAppearanceAiPayload(raw: string): {
  success: true
  data: EpkAppearanceAiPayload
} | {
  success: false
  errors: EpkAppearanceValidationError[]
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonFences(raw))
  } catch {
    return {
      success: false,
      errors: [{ path: "$", message: "Invalid JSON" }],
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      success: false,
      errors: [{ path: "$", message: "Root must be an object" }],
    }
  }

  const o = parsed as Record<string, unknown>
  const errors: EpkAppearanceValidationError[] = []

  if (typeof o.template !== "string" || !o.template.trim()) {
    errors.push({ path: "template", message: "template is required" })
  }

  if (typeof o.epkFont !== "string") {
    errors.push({ path: "epkFont", message: "epkFont is required" })
  } else if (!(EPK_FONT_IDS as readonly string[]).includes(o.epkFont)) {
    errors.push({
      path: "epkFont",
      message: `epkFont must be one of: ${EPK_FONT_IDS.join(", ")}`,
    })
  }

  if (!o.epkAppearance || typeof o.epkAppearance !== "object" || Array.isArray(o.epkAppearance)) {
    errors.push({ path: "epkAppearance", message: "epkAppearance object is required" })
  } else {
    const invalidHex = invalidEpkAppearanceHexFields(o.epkAppearance)
    for (const field of invalidHex) {
      errors.push({
        path: `epkAppearance.${field}`,
        message: "Must be a 6-digit hex color like #aabbcc or null",
      })
    }
  }

  if (errors.length) return { success: false, errors }

  const template = resolveEpkPreviewTemplateId(String(o.template))
  const epkFont = normalizeEpkFontId(o.epkFont)
  const epkAppearance = normalizeEpkAppearance(o.epkAppearance, template)

  return {
    success: true,
    data: { template, epkFont, epkAppearance },
  }
}

export function defaultEpkAppearanceAiPayload(
  template: string = "modern"
): EpkAppearanceAiPayload {
  const skin = resolveEpkPreviewTemplateId(template)
  return {
    template: skin,
    epkFont: "sans",
    epkAppearance: getDefaultEpkAppearanceForTemplate(skin) ?? { ...DEFAULT_EPK_APPEARANCE },
  }
}
