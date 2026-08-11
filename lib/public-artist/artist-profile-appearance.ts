import type { CSSProperties } from "react"
import type { PublicArtistAppearance } from "@/lib/public-artist/public-artist-appearance"
import { getDefaultEpkAppearanceForTemplate } from "@/lib/epk/epk-appearance"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"

export const ARTIST_PROFILE_TEMPLATE_IDS = [
  "cinematic-marquee",
  "editorial-cover",
  "analog-rave",
  "swiss-signal",
  "backstage-pass",
  "audio-console",
] as const

export type ArtistProfileTemplateId = (typeof ARTIST_PROFILE_TEMPLATE_IDS)[number]

export const ARTIST_PROFILE_SECTION_IDS = [
  "social",
  "stats",
  "about",
  "music",
  "storefront",
  "events",
  "services",
  "memberships",
  "gallery",
  "posts",
  "epk",
] as const

export type ArtistProfileSectionId = (typeof ARTIST_PROFILE_SECTION_IDS)[number]
export type ArtistProfileHeadingFont = "display" | "editorial" | "grotesk" | "condensed" | "mono"
export type ArtistProfileBodyFont = "sans" | "serif" | "mono"
export type ArtistProfileCornerStyle = "square" | "soft" | "round"
export type ArtistProfileDensity = "compact" | "comfortable" | "spacious"
export type ArtistProfileTexture = "none" | "grain" | "paper" | "halftone" | "metal"

export interface ArtistProfileAppearance {
  version: 1
  templateId: ArtistProfileTemplateId
  accentColor: string
  secondaryColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
  headingFont: ArtistProfileHeadingFont
  bodyFont: ArtistProfileBodyFont
  cornerStyle: ArtistProfileCornerStyle
  density: ArtistProfileDensity
  texture: ArtistProfileTexture
  heroOverlayOpacity: number
  heroFocalPoint: { x: number; y: number }
  showAvatar: boolean
  showCoverImage: boolean
  showVerifiedBadge: boolean
  sectionOrder: ArtistProfileSectionId[]
  sectionVisibility: Record<ArtistProfileSectionId, boolean>
}

export interface ArtistProfileDesignState {
  version: 1
  draft: ArtistProfileAppearance | null
  published: ArtistProfileAppearance | null
  updatedAt: string | null
  publishedAt: string | null
}

export interface ArtistProfileTemplateDefinition {
  id: ArtistProfileTemplateId
  name: string
  description: string
  previewImage: string
  defaultAppearance: ArtistProfileAppearance
}

export interface ArtistProfilePalettePreset {
  id: string
  name: string
  colors: Pick<
    ArtistProfileAppearance,
    "accentColor" | "secondaryColor" | "backgroundColor" | "surfaceColor" | "textColor" | "mutedTextColor"
  >
}

const HEX_RE = /^#[0-9a-f]{6}$/i
const HEADING_FONT_IDS = ["display", "editorial", "grotesk", "condensed", "mono"] as const
const BODY_FONT_IDS = ["sans", "serif", "mono"] as const
const CORNER_STYLE_IDS = ["square", "soft", "round"] as const
const DENSITY_IDS = ["compact", "comfortable", "spacious"] as const
const TEXTURE_IDS = ["none", "grain", "paper", "halftone", "metal"] as const
const DEFAULT_SECTION_ORDER = [...ARTIST_PROFILE_SECTION_IDS]
const DEFAULT_SECTION_VISIBILITY = Object.fromEntries(
  ARTIST_PROFILE_SECTION_IDS.map((id) => [id, true])
) as Record<ArtistProfileSectionId, boolean>

function appearance(
  templateId: ArtistProfileTemplateId,
  overrides: Partial<ArtistProfileAppearance>
): ArtistProfileAppearance {
  return {
    version: 1,
    templateId,
    accentColor: "#e83227",
    secondaryColor: "#f4eee7",
    backgroundColor: "#050505",
    surfaceColor: "#111111",
    textColor: "#ffffff",
    mutedTextColor: "#b8b4ae",
    headingFont: "condensed",
    bodyFont: "sans",
    cornerStyle: "square",
    density: "comfortable",
    texture: "grain",
    heroOverlayOpacity: 0.48,
    heroFocalPoint: { x: 50, y: 50 },
    showAvatar: true,
    showCoverImage: true,
    showVerifiedBadge: true,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
    ...overrides,
  }
}

export const ARTIST_PROFILE_TEMPLATES: ArtistProfileTemplateDefinition[] = [
  {
    id: "cinematic-marquee",
    name: "Cinematic Marquee",
    description: "Full-bleed performance imagery, oversized identity, and dramatic stage lighting.",
    previewImage: "/profile-templates/cinematic-marquee.webp",
    defaultAppearance: appearance("cinematic-marquee", {}),
  },
  {
    id: "editorial-cover",
    name: "Editorial Cover",
    description: "Asymmetric magazine composition with bold rules and culture-editorial typography.",
    previewImage: "/profile-templates/editorial-cover.webp",
    defaultAppearance: appearance("editorial-cover", {
      accentColor: "#f1321f",
      secondaryColor: "#2859d6",
      backgroundColor: "#f2efe7",
      surfaceColor: "#fffaf0",
      textColor: "#101010",
      mutedTextColor: "#5e5b55",
      headingFont: "editorial",
      texture: "paper",
      heroOverlayOpacity: 0.18,
    }),
  },
  {
    id: "analog-rave",
    name: "Analog Rave",
    description: "Underground flyer collage built from halftones, torn cards, tape, and stamps.",
    previewImage: "/profile-templates/analog-rave.webp",
    defaultAppearance: appearance("analog-rave", {
      accentColor: "#f4ca17",
      secondaryColor: "#e73a2c",
      backgroundColor: "#e8e1d3",
      surfaceColor: "#f4eddf",
      textColor: "#111111",
      mutedTextColor: "#4f4a40",
      bodyFont: "mono",
      texture: "halftone",
      heroOverlayOpacity: 0.06,
    }),
  },
  {
    id: "swiss-signal",
    name: "Swiss Signal",
    description: "Disciplined international grid, numbered modules, fine rules, and signal orange.",
    previewImage: "/profile-templates/swiss-signal.webp",
    defaultAppearance: appearance("swiss-signal", {
      accentColor: "#ff4b00",
      secondaryColor: "#101010",
      backgroundColor: "#f4f0e8",
      surfaceColor: "#fffdf7",
      textColor: "#101010",
      mutedTextColor: "#5d5b55",
      headingFont: "grotesk",
      density: "spacious",
      texture: "none",
      heroOverlayOpacity: 0,
    }),
  },
  {
    id: "backstage-pass",
    name: "Backstage Pass",
    description: "Road-case hardware, credentials, production labels, and touring typography.",
    previewImage: "/profile-templates/backstage-pass.webp",
    defaultAppearance: appearance("backstage-pass", {
      accentColor: "#ff5a1f",
      secondaryColor: "#2375d8",
      backgroundColor: "#050505",
      surfaceColor: "#171717",
      textColor: "#f0eee8",
      mutedTextColor: "#a9a69d",
      bodyFont: "mono",
      cornerStyle: "soft",
      density: "compact",
      texture: "metal",
      heroOverlayOpacity: 0.22,
    }),
  },
  {
    id: "audio-console",
    name: "Audio Console",
    description: "Rack hardware, spectrum energy, LED meters, and luminous control surfaces.",
    previewImage: "/profile-templates/audio-console.webp",
    defaultAppearance: appearance("audio-console", {
      accentColor: "#a6e84b",
      secondaryColor: "#52c7f2",
      backgroundColor: "#080a0b",
      surfaceColor: "#121516",
      textColor: "#f3f6f6",
      mutedTextColor: "#8a9292",
      headingFont: "grotesk",
      bodyFont: "mono",
      cornerStyle: "soft",
      density: "compact",
      texture: "metal",
      heroOverlayOpacity: 0.12,
    }),
  },
]

export const ARTIST_PROFILE_TEMPLATE_MAP = Object.fromEntries(
  ARTIST_PROFILE_TEMPLATES.map((template) => [template.id, template])
) as Record<ArtistProfileTemplateId, ArtistProfileTemplateDefinition>

export const DEFAULT_ARTIST_PROFILE_APPEARANCE =
  ARTIST_PROFILE_TEMPLATE_MAP["cinematic-marquee"].defaultAppearance

const SHARED_PALETTES: ArtistProfilePalettePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      accentColor: "#8b5cf6",
      secondaryColor: "#22d3ee",
      backgroundColor: "#070914",
      surfaceColor: "#141827",
      textColor: "#f8fafc",
      mutedTextColor: "#aab4c5",
    },
  },
  {
    id: "warm",
    name: "Warm Spotlight",
    colors: {
      accentColor: "#ff6b35",
      secondaryColor: "#ffd166",
      backgroundColor: "#180d09",
      surfaceColor: "#2a1710",
      textColor: "#fff5e9",
      mutedTextColor: "#d8baa6",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: {
      accentColor: "#f5f5f5",
      secondaryColor: "#a3a3a3",
      backgroundColor: "#0a0a0a",
      surfaceColor: "#1b1b1b",
      textColor: "#fafafa",
      mutedTextColor: "#b5b5b5",
    },
  },
]

export function getArtistProfilePalettePresets(
  templateId: ArtistProfileTemplateId
): ArtistProfilePalettePreset[] {
  const signature = ARTIST_PROFILE_TEMPLATE_MAP[templateId].defaultAppearance
  return [
    {
      id: "signature",
      name: "Signature",
      colors: {
        accentColor: signature.accentColor,
        secondaryColor: signature.secondaryColor,
        backgroundColor: signature.backgroundColor,
        surfaceColor: signature.surfaceColor,
        textColor: signature.textColor,
        mutedTextColor: signature.mutedTextColor,
      },
    },
    ...SHARED_PALETTES,
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_RE.test(value) ? value.toLowerCase() : fallback
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, number))
}

export function normalizeArtistProfileAppearance(raw: unknown): ArtistProfileAppearance {
  const source = isRecord(raw) ? raw : {}
  const templateId = enumValue(
    source.templateId,
    ARTIST_PROFILE_TEMPLATE_IDS,
    DEFAULT_ARTIST_PROFILE_APPEARANCE.templateId
  )
  const defaults = ARTIST_PROFILE_TEMPLATE_MAP[templateId].defaultAppearance
  const rawOrder = Array.isArray(source.sectionOrder) ? source.sectionOrder : []
  const requested = rawOrder.filter(
    (value): value is ArtistProfileSectionId =>
      typeof value === "string" &&
      ARTIST_PROFILE_SECTION_IDS.includes(value as ArtistProfileSectionId)
  )
  const sectionOrder = [
    ...new Set(requested),
    ...ARTIST_PROFILE_SECTION_IDS.filter((id) => !requested.includes(id)),
  ]
  const rawVisibility = isRecord(source.sectionVisibility) ? source.sectionVisibility : {}
  const focal = isRecord(source.heroFocalPoint) ? source.heroFocalPoint : {}

  return {
    version: 1,
    templateId,
    accentColor: color(source.accentColor, defaults.accentColor),
    secondaryColor: color(source.secondaryColor, defaults.secondaryColor),
    backgroundColor: color(source.backgroundColor, defaults.backgroundColor),
    surfaceColor: color(source.surfaceColor, defaults.surfaceColor),
    textColor: color(source.textColor, defaults.textColor),
    mutedTextColor: color(source.mutedTextColor, defaults.mutedTextColor),
    headingFont: enumValue(source.headingFont, HEADING_FONT_IDS, defaults.headingFont),
    bodyFont: enumValue(source.bodyFont, BODY_FONT_IDS, defaults.bodyFont),
    cornerStyle: enumValue(source.cornerStyle, CORNER_STYLE_IDS, defaults.cornerStyle),
    density: enumValue(source.density, DENSITY_IDS, defaults.density),
    texture: enumValue(source.texture, TEXTURE_IDS, defaults.texture),
    heroOverlayOpacity: numberInRange(source.heroOverlayOpacity, defaults.heroOverlayOpacity, 0, 0.9),
    heroFocalPoint: {
      x: numberInRange(focal.x, defaults.heroFocalPoint.x, 0, 100),
      y: numberInRange(focal.y, defaults.heroFocalPoint.y, 0, 100),
    },
    showAvatar: typeof source.showAvatar === "boolean" ? source.showAvatar : defaults.showAvatar,
    showCoverImage: typeof source.showCoverImage === "boolean" ? source.showCoverImage : defaults.showCoverImage,
    showVerifiedBadge:
      typeof source.showVerifiedBadge === "boolean" ? source.showVerifiedBadge : defaults.showVerifiedBadge,
    sectionOrder,
    sectionVisibility: Object.fromEntries(
      ARTIST_PROFILE_SECTION_IDS.map((id) => [
        id,
        typeof rawVisibility[id] === "boolean" ? rawVisibility[id] : defaults.sectionVisibility[id],
      ])
    ) as Record<ArtistProfileSectionId, boolean>,
  }
}

export function validateArtistProfileAppearancePayload(raw: unknown): string[] {
  if (!isRecord(raw)) return ["Appearance must be a JSON object."]
  const errors: string[] = []
  const allowedKeys = new Set([
    "version",
    "templateId",
    "accentColor",
    "secondaryColor",
    "backgroundColor",
    "surfaceColor",
    "textColor",
    "mutedTextColor",
    "headingFont",
    "bodyFont",
    "cornerStyle",
    "density",
    "texture",
    "heroOverlayOpacity",
    "heroFocalPoint",
    "showAvatar",
    "showCoverImage",
    "showVerifiedBadge",
    "sectionOrder",
    "sectionVisibility",
  ])
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) errors.push(`Unsupported appearance field: ${key}.`)
  }
  if (raw.version !== 1) errors.push("Appearance version must be 1.")
  if (
    typeof raw.templateId !== "string" ||
    !ARTIST_PROFILE_TEMPLATE_IDS.includes(raw.templateId as ArtistProfileTemplateId)
  ) {
    errors.push("Unsupported profile template.")
  }
  for (const key of [
    "accentColor",
    "secondaryColor",
    "backgroundColor",
    "surfaceColor",
    "textColor",
    "mutedTextColor",
  ] as const) {
    if (typeof raw[key] !== "string" || !HEX_RE.test(raw[key] as string))
      errors.push(`${key} must be a six-digit hex color.`)
  }
  for (const [key, allowed] of [
    ["headingFont", HEADING_FONT_IDS],
    ["bodyFont", BODY_FONT_IDS],
    ["cornerStyle", CORNER_STYLE_IDS],
    ["density", DENSITY_IDS],
    ["texture", TEXTURE_IDS],
  ] as const) {
    if (typeof raw[key] !== "string" || !allowed.includes(raw[key] as never))
      errors.push(`${key} is unsupported.`)
  }
  if (
    typeof raw.heroOverlayOpacity !== "number" ||
    !Number.isFinite(raw.heroOverlayOpacity) ||
    raw.heroOverlayOpacity < 0 ||
    raw.heroOverlayOpacity > 0.9
  ) {
    errors.push("heroOverlayOpacity must be between 0 and 0.9.")
  }
  for (const key of ["showAvatar", "showCoverImage", "showVerifiedBadge"] as const) {
    if (typeof raw[key] !== "boolean") errors.push(`${key} must be true or false.`)
  }
  if (!Array.isArray(raw.sectionOrder)) {
    errors.push("sectionOrder must be an array.")
  } else {
    const valid = raw.sectionOrder.filter(
      (value): value is ArtistProfileSectionId =>
        typeof value === "string" &&
        ARTIST_PROFILE_SECTION_IDS.includes(value as ArtistProfileSectionId)
    )
    if (valid.length !== raw.sectionOrder.length) errors.push("sectionOrder contains an unsupported section.")
    if (new Set(valid).size !== valid.length) errors.push("sectionOrder cannot contain duplicates.")
    if (
      valid.length !== ARTIST_PROFILE_SECTION_IDS.length ||
      ARTIST_PROFILE_SECTION_IDS.some((section) => !valid.includes(section))
    ) {
      errors.push("sectionOrder must include every supported section exactly once.")
    }
  }
  if (!isRecord(raw.sectionVisibility)) {
    errors.push("sectionVisibility must be an object.")
  } else {
    for (const [key, value] of Object.entries(raw.sectionVisibility)) {
      if (!ARTIST_PROFILE_SECTION_IDS.includes(key as ArtistProfileSectionId))
        errors.push(`Unsupported section visibility key: ${key}.`)
      else if (typeof value !== "boolean") errors.push(`${key} visibility must be true or false.`)
    }
    for (const section of ARTIST_PROFILE_SECTION_IDS) {
      if (!(section in raw.sectionVisibility))
        errors.push(`sectionVisibility is missing ${section}.`)
    }
  }
  if (!isRecord(raw.heroFocalPoint)) {
    errors.push("heroFocalPoint must be an object.")
  } else {
    if (Object.keys(raw.heroFocalPoint).some((key) => key !== "x" && key !== "y"))
      errors.push("heroFocalPoint supports only x and y.")
    for (const axis of ["x", "y"] as const) {
      const value = raw.heroFocalPoint[axis]
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)
        errors.push(`heroFocalPoint.${axis} must be between 0 and 100.`)
    }
  }
  return [...new Set(errors)]
}

export function applyArtistProfileTemplatePreset(
  templateId: ArtistProfileTemplateId,
  current: ArtistProfileAppearance
): ArtistProfileAppearance {
  const defaults = ARTIST_PROFILE_TEMPLATE_MAP[templateId].defaultAppearance
  return normalizeArtistProfileAppearance({
    ...defaults,
    sectionOrder: current.sectionOrder,
    sectionVisibility: current.sectionVisibility,
    showAvatar: current.showAvatar,
    showCoverImage: current.showCoverImage,
    showVerifiedBadge: current.showVerifiedBadge,
    heroFocalPoint: current.heroFocalPoint,
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function luminance(hex: string): number {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

export function validateArtistProfileContrast(appearance: ArtistProfileAppearance): string[] {
  const errors: string[] = []
  for (const background of [appearance.backgroundColor, appearance.surfaceColor]) {
    if (contrastRatio(appearance.textColor, background) < 4.5)
      errors.push(`Text color needs at least 4.5:1 contrast against ${background}.`)
    if (contrastRatio(appearance.mutedTextColor, background) < 3)
      errors.push(`Muted text needs at least 3:1 contrast against ${background}.`)
  }
  return [...new Set(errors)]
}

export function suggestAccessibleArtistProfileColors(
  appearance: ArtistProfileAppearance
): Pick<ArtistProfileAppearance, "surfaceColor" | "textColor" | "mutedTextColor"> {
  const backgrounds = [appearance.backgroundColor, appearance.surfaceColor]
  const lightMinimum = Math.min(...backgrounds.map((value) => contrastRatio("#ffffff", value)))
  const darkMinimum = Math.min(...backgrounds.map((value) => contrastRatio("#111111", value)))
  const eitherCandidateWorks = lightMinimum >= 4.5 || darkMinimum >= 4.5
  const useLight = eitherCandidateWorks
    ? lightMinimum >= darkMinimum
    : contrastRatio("#ffffff", appearance.backgroundColor) >=
      contrastRatio("#111111", appearance.backgroundColor)
  const textColor = useLight ? "#ffffff" : "#111111"
  const mutedTextColor = useLight ? "#c7cbd1" : "#555555"

  return {
    textColor,
    mutedTextColor,
    // A split black/white page can have no single accessible text color.
    // Converging the secondary surface on the page background makes the
    // one-click suggestion safe while preserving the user's accent choices.
    surfaceColor: eitherCandidateWorks ? appearance.surfaceColor : appearance.backgroundColor,
  }
}

export function readArtistProfileDesignState(settings: unknown): ArtistProfileDesignState {
  const root = isRecord(settings) ? settings : {}
  const raw = isRecord(root.public_profile_design) ? root.public_profile_design : {}
  return {
    version: 1,
    draft: raw.draft ? normalizeArtistProfileAppearance(raw.draft) : null,
    published: raw.published ? normalizeArtistProfileAppearance(raw.published) : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
  }
}

export function mergeArtistProfileDesignState(
  settings: unknown,
  design: ArtistProfileDesignState
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    public_profile_design: design,
  }
}

export function seedArtistProfileAppearanceFromLegacy(
  legacy: PublicArtistAppearance | null
): ArtistProfileAppearance {
  if (!legacy) return normalizeArtistProfileAppearance(DEFAULT_ARTIST_PROFILE_APPEARANCE)
  const source = legacy.epkAppearance
  const legacyTypography =
    legacy.epkFont === "mono"
      ? { headingFont: "mono" as const, bodyFont: "mono" as const }
      : legacy.epkFont === "serif"
        ? { headingFont: "editorial" as const, bodyFont: "serif" as const }
        : legacy.epkFont === "display"
          ? { headingFont: "display" as const, bodyFont: "sans" as const }
          : { headingFont: "grotesk" as const, bodyFont: "sans" as const }
  return normalizeArtistProfileAppearance({
    ...DEFAULT_ARTIST_PROFILE_APPEARANCE,
    accentColor: source.accentHex,
    secondaryColor: source.secondaryAccentHex,
    backgroundColor: source.pageBackgroundHex,
    surfaceColor: source.cardBackgroundHex,
    textColor: source.textColorCustomHex,
    mutedTextColor: source.textColorCustomHex,
    ...legacyTypography,
  })
}

export function artistProfileAppearanceStyle(appearance: ArtistProfileAppearance): CSSProperties {
  const radius = { square: "0px", soft: "18px", round: "32px" }[appearance.cornerStyle]
  const gap = { compact: "1rem", comfortable: "1.5rem", spacious: "2.25rem" }[appearance.density]
  const heading = {
    display: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    editorial: "Georgia, Cambria, 'Times New Roman', serif",
    grotesk: "Inter, ui-sans-serif, system-ui, sans-serif",
    condensed: "'Arial Narrow', Impact, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  }[appearance.headingFont]
  const body = {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, Cambria, 'Times New Roman', serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  }[appearance.bodyFont]

  const orderVars = Object.fromEntries(
    appearance.sectionOrder.map((id, index) => [`--artist-order-${id}`, String(index)])
  )
  return {
    "--artist-theme-accent": appearance.accentColor,
    "--artist-theme-secondary": appearance.secondaryColor,
    "--artist-theme-background": appearance.backgroundColor,
    "--artist-theme-surface": appearance.surfaceColor,
    "--artist-theme-text": appearance.textColor,
    "--artist-theme-muted": appearance.mutedTextColor,
    "--artist-theme-radius": radius,
    "--artist-theme-gap": gap,
    "--artist-theme-heading": heading,
    "--artist-theme-body": body,
    "--artist-theme-overlay": String(appearance.heroOverlayOpacity),
    "--artist-theme-focus-x": `${appearance.heroFocalPoint.x}%`,
    "--artist-theme-focus-y": `${appearance.heroFocalPoint.y}%`,
    ...orderVars,
  } as CSSProperties
}

export function artistProfileAppearanceToLegacyTheme(
  appearance: ArtistProfileAppearance
): PublicArtistAppearance {
  const skinByTemplate: Record<ArtistProfileTemplateId, EpkSkinId> = {
    "cinematic-marquee": "cinema",
    "editorial-cover": "classic",
    "analog-rave": "poster",
    "swiss-signal": "minimal",
    "backstage-pass": "luxe",
    "audio-console": "bold",
  }
  const template = skinByTemplate[appearance.templateId]
  return {
    template,
    epkFont:
      appearance.bodyFont === "mono"
        ? "mono"
        : appearance.headingFont === "editorial"
          ? "serif"
          : appearance.headingFont === "condensed"
            ? "display"
            : "sans",
    epkAppearance: {
      ...getDefaultEpkAppearanceForTemplate(template),
      accentHex: appearance.accentColor,
      secondaryAccentHex: appearance.secondaryColor,
      pageBackgroundHex: appearance.backgroundColor,
      cardBackgroundHex: appearance.surfaceColor,
      textColorCustomHex: appearance.textColor,
      borderColorHex: appearance.mutedTextColor,
      cardRadius:
        appearance.cornerStyle === "square"
          ? "sharp"
          : appearance.cornerStyle === "round"
            ? "pill"
            : "rounded",
      effectStyle:
        appearance.texture === "grain"
          ? "grain"
          : appearance.templateId === "audio-console"
            ? "glow"
            : "none",
    },
  }
}
