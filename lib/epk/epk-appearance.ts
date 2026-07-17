import type { CSSProperties } from "react"
import type { EpkSkinId, EpkSkinTokens } from "@/lib/epk/epk-skin-tokens"
import {
  EPK_SKIN_TOKENS,
  resolveEpkPreviewTemplateId,
} from "@/lib/epk/epk-skin-tokens"

export interface EpkAppearance {
  fontSizeScale: "xs" | "sm" | "md" | "lg" | "xl"
  textColorPreset: "inherit" | "high_contrast" | "muted"
  /** When set, applied via CSS variable on headings/body tokens */
  textColorCustomHex: string | null
  cardRadius: "sharp" | "rounded" | "pill"
  cardSurface: "default" | "elevated" | "minimal"
  accentHex: string | null
  secondaryAccentHex: string | null
  /** Optional page background override */
  pageBackgroundHex: string | null
  cardBackgroundHex: string | null
  borderColorHex: string | null
  headingScale: "sm" | "md" | "lg" | "xl"
  contentWidth: "narrow" | "default" | "wide"
  borderStrength: "subtle" | "default" | "strong"
  buttonStyle: "solid" | "glass" | "outline" | "neon" | "minimal"
  surfaceStyle: "default" | "glass" | "solid" | "editorial" | "outlined"
  effectStyle: "none" | "glow" | "glass" | "shadow" | "neon" | "grain" | "spotlight" | "poster"
  effectIntensity: "subtle" | "medium" | "high"
  backgroundStyle: "template" | "solid" | "radial" | "mesh" | "spotlight"
  heroImageTreatment: "natural" | "cinematic" | "duotone" | "soft" | "posterized"
  sectionDividerStyle: "none" | "line" | "accent" | "glow" | "ticker"
  buttonRadius: "sharp" | "rounded" | "pill"
  avatarShape: "circle" | "rounded" | "square"
  avatarSize: "sm" | "md" | "lg" | "xl"
  sectionSpacing: "compact" | "default" | "relaxed"
  coverHeight: "short" | "medium" | "tall"
  coverOverlay: "light" | "medium" | "heavy"
}

export const DEFAULT_EPK_APPEARANCE: EpkAppearance = {
  fontSizeScale: "md",
  textColorPreset: "inherit",
  textColorCustomHex: null,
  cardRadius: "rounded",
  cardSurface: "default",
  accentHex: null,
  secondaryAccentHex: null,
  pageBackgroundHex: null,
  cardBackgroundHex: null,
  borderColorHex: null,
  headingScale: "md",
  contentWidth: "default",
  borderStrength: "default",
  buttonStyle: "solid",
  surfaceStyle: "default",
  effectStyle: "none",
  effectIntensity: "subtle",
  backgroundStyle: "template",
  heroImageTreatment: "natural",
  sectionDividerStyle: "line",
  buttonRadius: "rounded",
  avatarShape: "circle",
  avatarSize: "lg",
  sectionSpacing: "default",
  coverHeight: "medium",
  coverOverlay: "medium",
}

const HEX_RE = /^#([0-9A-Fa-f]{6})$/
const COLOR_FIELDS = [
  "textColorCustomHex",
  "accentHex",
  "secondaryAccentHex",
  "pageBackgroundHex",
  "cardBackgroundHex",
  "borderColorHex",
] as const

export function normalizeHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const v = raw.trim()
  if (!HEX_RE.test(v)) return null
  return v.toLowerCase()
}

export function invalidEpkAppearanceHexFields(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  if (typeof raw !== "object" || Array.isArray(raw)) return ["epkAppearance"]

  const o = raw as Record<string, unknown>
  return COLOR_FIELDS.filter((field) => {
    if (!(field in o)) return false
    const value = o[field]
    return value !== null && value !== undefined && normalizeHexColor(value) === null
  })
}

export function getDefaultEpkAppearance(_templateId?: string): EpkAppearance {
  return { ...DEFAULT_EPK_APPEARANCE }
}

export function getDefaultEpkAppearanceForTemplate(templateId?: string): EpkAppearance {
  const skin = resolveEpkPreviewTemplateId(templateId)
  const [palette] = EPK_PALETTE_PRESETS[skin] ?? []

  return {
    ...getDefaultEpkAppearance(templateId),
    ...(palette
      ? {
          accentHex: palette.accentHex,
          secondaryAccentHex: palette.secondaryAccentHex,
          pageBackgroundHex: palette.pageBackgroundHex,
          textColorCustomHex: palette.textColorCustomHex,
          cardBackgroundHex: palette.cardBackgroundHex,
          borderColorHex: palette.borderColorHex,
        }
      : {}),
  }
}

export function normalizeEpkAppearance(raw: unknown, template?: string): EpkAppearance {
  const base = getDefaultEpkAppearance(template)
  if (!raw || typeof raw !== "object") return base
  const o = raw as Record<string, unknown>
  return {
    fontSizeScale: pick(o.fontSizeScale, ["xs", "sm", "md", "lg", "xl"], base.fontSizeScale),
    textColorPreset: pick(
      o.textColorPreset,
      ["inherit", "high_contrast", "muted"],
      base.textColorPreset
    ),
    textColorCustomHex: normalizeHexColor(o.textColorCustomHex),
    cardRadius: pick(o.cardRadius, ["sharp", "rounded", "pill"], base.cardRadius),
    cardSurface: pick(o.cardSurface, ["default", "elevated", "minimal"], base.cardSurface),
    accentHex: normalizeHexColor(o.accentHex),
    secondaryAccentHex: normalizeHexColor(o.secondaryAccentHex),
    pageBackgroundHex: normalizeHexColor(o.pageBackgroundHex),
    cardBackgroundHex: normalizeHexColor(o.cardBackgroundHex),
    borderColorHex: normalizeHexColor(o.borderColorHex),
    headingScale: pick(o.headingScale, ["sm", "md", "lg", "xl"], base.headingScale),
    contentWidth: pick(o.contentWidth, ["narrow", "default", "wide"], base.contentWidth),
    borderStrength: pick(
      o.borderStrength,
      ["subtle", "default", "strong"],
      base.borderStrength
    ),
    buttonStyle: pick(
      o.buttonStyle,
      ["solid", "glass", "outline", "neon", "minimal"],
      base.buttonStyle
    ),
    surfaceStyle: pick(
      o.surfaceStyle,
      ["default", "glass", "solid", "editorial", "outlined"],
      base.surfaceStyle
    ),
    effectStyle: pick(
      o.effectStyle,
      ["none", "glow", "glass", "shadow", "neon", "grain", "spotlight", "poster"],
      base.effectStyle
    ),
    effectIntensity: pick(
      o.effectIntensity,
      ["subtle", "medium", "high"],
      base.effectIntensity
    ),
    backgroundStyle: pick(
      o.backgroundStyle,
      ["template", "solid", "radial", "mesh", "spotlight"],
      base.backgroundStyle
    ),
    heroImageTreatment: pick(
      o.heroImageTreatment,
      ["natural", "cinematic", "duotone", "soft", "posterized"],
      base.heroImageTreatment
    ),
    sectionDividerStyle: pick(
      o.sectionDividerStyle,
      ["none", "line", "accent", "glow", "ticker"],
      base.sectionDividerStyle
    ),
    buttonRadius: pick(o.buttonRadius, ["sharp", "rounded", "pill"], base.buttonRadius),
    avatarShape: pick(o.avatarShape, ["circle", "rounded", "square"], base.avatarShape),
    avatarSize: pick(o.avatarSize, ["sm", "md", "lg", "xl"], base.avatarSize),
    sectionSpacing: pick(
      o.sectionSpacing,
      ["compact", "default", "relaxed"],
      base.sectionSpacing
    ),
    coverHeight: pick(o.coverHeight, ["short", "medium", "tall"], base.coverHeight),
    coverOverlay: pick(o.coverOverlay, ["light", "medium", "heavy"], base.coverOverlay),
  }
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function applyCardRadiusClassString(s: string, radius: EpkAppearance["cardRadius"]): string {
  if (radius === "rounded") return s
  if (radius === "sharp") {
    return s
      .replace(/\brounded-3xl\b/g, "rounded-none")
      .replace(/\brounded-2xl\b/g, "rounded-none")
      .replace(/\brounded-xl\b/g, "rounded-none")
      .replace(/\brounded-lg\b/g, "rounded-none")
      .replace(/\brounded-md\b/g, "rounded-none")
      .replace(/\brounded-\[[^\]]+\]/g, "rounded-none")
  }
  return s
    .replace(/\brounded-2xl\b/g, "rounded-3xl")
    .replace(/\brounded-xl\b/g, "rounded-2xl")
    .replace(/\brounded-lg\b/g, "rounded-xl")
    .replace(/\brounded-md\b/g, "rounded-lg")
}

function applySurface(s: string, surface: EpkAppearance["cardSurface"]): string {
  if (surface === "default") return s
  if (surface === "elevated") return `${s} shadow-lg shadow-black/15`
  return `${s} !border-opacity-40 opacity-[0.98]`
}

const SURFACE_STYLE_CLASS: Record<EpkAppearance["surfaceStyle"], string> = {
  default: "",
  glass: "backdrop-blur-xl bg-white/[0.075] shadow-2xl shadow-black/20",
  solid: "shadow-none",
  editorial: "shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
  outlined: "bg-transparent shadow-none",
}

const EFFECT_CARD_CLASS: Record<EpkAppearance["effectStyle"], string> = {
  none: "",
  glow: "shadow-[0_0_34px_color-mix(in_srgb,var(--epk-accent,#8b5cf6)_22%,transparent)]",
  glass: "backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  shadow: "shadow-[0_22px_70px_rgba(0,0,0,0.32)]",
  neon: "shadow-[0_0_36px_color-mix(in_srgb,var(--epk-accent,#8b5cf6)_30%,transparent)]",
  grain: "shadow-[0_20px_55px_rgba(0,0,0,0.24)]",
  spotlight: "shadow-[0_24px_80px_rgba(0,0,0,0.34)]",
  poster: "shadow-[8px_8px_0_color-mix(in_srgb,var(--epk-accent,#8b5cf6)_34%,transparent)]",
}

const EFFECT_INTENSITY_CLASS: Record<EpkAppearance["effectIntensity"], string> = {
  subtle: "opacity-[0.98]",
  medium: "",
  high: "ring-1 ring-[color:var(--epk-accent-muted)]",
}

const BUTTON_RADIUS_CLASS: Record<EpkAppearance["buttonRadius"], string> = {
  sharp: "!rounded-none",
  rounded: "!rounded-xl",
  pill: "!rounded-full",
}

const BUTTON_STYLE_CLASS: Record<EpkAppearance["buttonStyle"], string> = {
  solid: "",
  glass: "!bg-white/10 !text-[color:var(--epk-custom-text,#ffffff)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
  outline: "!bg-transparent !text-[color:var(--epk-accent)]",
  neon: "shadow-[0_0_26px_color-mix(in_srgb,var(--epk-accent,#8b5cf6)_42%,transparent)]",
  minimal: "!border-transparent !bg-transparent !text-[color:var(--epk-accent)] shadow-none",
}

function applySurfaceStyle(s: string, style: EpkAppearance["surfaceStyle"]): string {
  const cls = SURFACE_STYLE_CLASS[style]
  return cls ? `${s} ${cls}` : s
}

function applyEffectStyle(
  s: string,
  effect: EpkAppearance["effectStyle"],
  intensity: EpkAppearance["effectIntensity"]
): string {
  const effectClass = EFFECT_CARD_CLASS[effect]
  const intensityClass = effect === "none" ? "" : EFFECT_INTENSITY_CLASS[intensity]
  return [s, effectClass, intensityClass].filter(Boolean).join(" ")
}

function applyButtonTreatment(
  s: string,
  style: EpkAppearance["buttonStyle"],
  radius: EpkAppearance["buttonRadius"]
): string {
  return [s, BUTTON_STYLE_CLASS[style], BUTTON_RADIUS_CLASS[radius]].filter(Boolean).join(" ")
}

function applyBorderStrength(
  s: string,
  strength: EpkAppearance["borderStrength"]
): string {
  if (strength === "default") return s
  if (strength === "subtle") {
    return `${s} !border-opacity-40`
      .replace(/\bborder-4\b/g, "border")
      .replace(/\bborder-2\b/g, "border")
  }
  return `${s} !border-opacity-100`
    .replace(/\bborder(?!-)\b/g, "border-2")
    .replace(/\bborder border-2\b/g, "border-2")
}

function mergeTokens(base: EpkSkinTokens, appearance: EpkAppearance): EpkSkinTokens {
  let card = applyCardRadiusClassString(base.card, appearance.cardRadius)
  let cardMuted = applyCardRadiusClassString(base.cardMuted, appearance.cardRadius)
  let dashed = applyCardRadiusClassString(base.dashed, appearance.cardRadius)
  let oneLinerWrap = applyCardRadiusClassString(base.oneLinerWrap, appearance.cardRadius)
  let statCell = applyCardRadiusClassString(base.statCell, appearance.cardRadius)

  card = applySurface(card, appearance.cardSurface)
  cardMuted = applySurface(cardMuted, appearance.cardSurface)
  dashed = applySurface(dashed, appearance.cardSurface)
  statCell = applySurface(statCell, appearance.cardSurface)

  card = applySurfaceStyle(card, appearance.surfaceStyle)
  cardMuted = applySurfaceStyle(cardMuted, appearance.surfaceStyle)
  dashed = applySurfaceStyle(dashed, appearance.surfaceStyle)
  statCell = applySurfaceStyle(statCell, appearance.surfaceStyle)
  oneLinerWrap = applySurfaceStyle(oneLinerWrap, appearance.surfaceStyle)

  card = applyBorderStrength(card, appearance.borderStrength)
  cardMuted = applyBorderStrength(cardMuted, appearance.borderStrength)
  dashed = applyBorderStrength(dashed, appearance.borderStrength)
  statCell = applyBorderStrength(statCell, appearance.borderStrength)
  oneLinerWrap = applyBorderStrength(oneLinerWrap, appearance.borderStrength)

  card = applyEffectStyle(card, appearance.effectStyle, appearance.effectIntensity)
  cardMuted = applyEffectStyle(cardMuted, appearance.effectStyle, appearance.effectIntensity)
  dashed = applyEffectStyle(dashed, appearance.effectStyle, appearance.effectIntensity)
  statCell = applyEffectStyle(statCell, appearance.effectStyle, appearance.effectIntensity)

  let page = base.page
  if (appearance.pageBackgroundHex) {
    page = `${page} !bg-[color:var(--epk-page-bg)]`
  }
  if (appearance.pageBackgroundHex || appearance.cardBackgroundHex) {
    card = `${card} !bg-[color:var(--epk-card-bg)]`
    cardMuted = `${cardMuted} !bg-[color:var(--epk-muted-card-bg)]`
    dashed = `${dashed} !bg-[color:var(--epk-muted-card-bg)]`
    oneLinerWrap = `${oneLinerWrap} !bg-[color:var(--epk-muted-card-bg)]`
    statCell = `${statCell} !bg-[color:var(--epk-muted-card-bg)]`
  }
  if (appearance.borderColorHex) {
    card = `${card} !border-[color:var(--epk-border-custom)]`
    cardMuted = `${cardMuted} !border-[color:var(--epk-border-custom)]`
    dashed = `${dashed} !border-[color:var(--epk-border-custom)]`
    oneLinerWrap = `${oneLinerWrap} !border-[color:var(--epk-border-custom)]`
    statCell = `${statCell} !border-[color:var(--epk-border-custom)]`
  }

  let heading = base.heading
  let subheading = base.subheading
  let accentIcon = base.accentIcon
  let btnPrimary = base.btnPrimary
  let btnGhost = base.btnGhost
  let badge = base.badge
  let link = base.link
  let statValue = base.statValue
  let trackArtFallback = base.trackArtFallback
  let muted = base.muted
  let label = base.label
  let bodyStrong = base.bodyStrong
  let outlineBtn = base.outlineBtn

  if (appearance.textColorPreset === "muted") {
    heading = `${heading} opacity-80`
    subheading = `${subheading} opacity-75`
  } else if (appearance.textColorPreset === "high_contrast") {
    heading = `${heading} font-semibold drop-shadow-sm`
    subheading = `${subheading} font-medium`
  }

  if (appearance.textColorCustomHex) {
    heading = `${heading} !text-[color:var(--epk-custom-text)]`
    subheading = `${subheading} !text-[color:var(--epk-custom-text)]`
    muted = `${muted} !text-[color:var(--epk-custom-text)] opacity-70`
    label = `${label} !text-[color:var(--epk-custom-text)] opacity-65`
    bodyStrong = `${bodyStrong} !text-[color:var(--epk-custom-text)]`
    btnGhost = `${btnGhost} !text-[color:var(--epk-custom-text)]`
    outlineBtn = `${outlineBtn} !text-[color:var(--epk-custom-text)]`
  }

  if (appearance.accentHex) {
    accentIcon = "text-[color:var(--epk-accent)]"
    btnPrimary = `${btnPrimary} !border-[color:var(--epk-accent)] !bg-[color:var(--epk-accent)] hover:opacity-90`
    btnGhost = `${btnGhost} !border-[color:var(--epk-accent)]`
    outlineBtn = `${outlineBtn} !border-[color:var(--epk-accent)]`
    badge = `${badge} !border-[color:var(--epk-accent)] !bg-[color:var(--epk-accent-soft)]`
    card = `${card} !border-[color:var(--epk-accent-muted)]`
    cardMuted = `${cardMuted} !border-[color:var(--epk-accent-muted)]`
    dashed = `${dashed} !border-[color:var(--epk-accent-muted)]`
    link = "text-[color:var(--epk-accent)]"
    oneLinerWrap = `${oneLinerWrap} !border-[color:var(--epk-accent)]`
    statCell = `${statCell} !border-[color:var(--epk-accent)]`
    statValue = `${statValue} !text-[color:var(--epk-accent)]`
    trackArtFallback = "bg-[color:var(--epk-accent)]"
  }
  if (appearance.secondaryAccentHex) {
    badge = `${badge} !text-[color:var(--epk-secondary-accent)]`
    link = "text-[color:var(--epk-secondary-accent)]"
  }

  btnPrimary = applyButtonTreatment(btnPrimary, appearance.buttonStyle, appearance.buttonRadius)
  btnGhost = applyButtonTreatment(btnGhost, appearance.buttonStyle, appearance.buttonRadius)
  outlineBtn = applyButtonTreatment(outlineBtn, appearance.buttonStyle, appearance.buttonRadius)

  return {
    ...base,
    page,
    card,
    cardMuted,
    dashed,
    oneLinerWrap,
    statCell,
    heading,
    subheading,
    badge,
    accentIcon,
    btnPrimary,
    btnGhost,
    link,
    statValue,
    trackArtFallback,
    muted,
    label,
    bodyStrong,
    outlineBtn,
  }
}

const AVATAR_SIZE: Record<EpkAppearance["avatarSize"], string> = {
  sm: "h-16 w-16 sm:h-20 sm:w-20",
  md: "h-20 w-20 sm:h-24 sm:w-24",
  lg: "h-28 w-28 sm:h-32 sm:w-32",
  xl: "h-36 w-36 sm:h-40 sm:w-40",
}

const AVATAR_SHAPE: Record<EpkAppearance["avatarShape"], string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  square: "rounded-none",
}

const SECTION_GAP: Record<EpkAppearance["sectionSpacing"], string> = {
  compact: "mb-5",
  default: "mb-8",
  relaxed: "mb-12",
}

const HERO_GAP: Record<EpkAppearance["sectionSpacing"], string> = {
  compact: "mb-6",
  default: "mb-10",
  relaxed: "mb-14",
}

const COVER_HEIGHT: Record<EpkAppearance["coverHeight"], string> = {
  short: "h-36 sm:h-44",
  medium: "h-48 sm:h-56",
  tall: "h-56 sm:h-64",
}

const COVER_OVERLAY: Record<EpkAppearance["coverOverlay"], string> = {
  light: "from-stone-900/15",
  medium: "from-stone-900/35",
  heavy: "from-stone-900/55",
}

const FONT_SCALE: Record<EpkAppearance["fontSizeScale"], string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

/** md = inherit template hero title sizes */
const HEADING_SCALE: Record<EpkAppearance["headingScale"], string> = {
  sm: "[&_h1]:!text-3xl sm:[&_h1]:!text-4xl",
  md: "",
  lg: "[&_h1]:!text-5xl sm:[&_h1]:!text-6xl",
  xl: "[&_h1]:!text-6xl sm:[&_h1]:!text-7xl",
}

const CONTENT_WIDTH: Record<EpkAppearance["contentWidth"], string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
}

const PAGE_EFFECT_CLASS: Record<EpkAppearance["effectStyle"], string> = {
  none: "",
  glow: "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--epk-accent,#8b5cf6)_18%,transparent),transparent_48%)]",
  glass: "before:pointer-events-none before:absolute before:inset-0 before:bg-white/[0.015]",
  shadow: "",
  neon: "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--epk-accent,#8b5cf6)_24%,transparent),transparent_44%)]",
  grain: "before:pointer-events-none before:absolute before:inset-0 before:opacity-[0.18] before:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_4px)]",
  spotlight: "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.16),transparent_34%)]",
  poster: "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_12px)]",
}

const BACKGROUND_STYLE_CLASS: Record<EpkAppearance["backgroundStyle"], string> = {
  template: "",
  solid: "",
  radial: "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_18%_8%,color-mix(in_srgb,var(--epk-accent,#8b5cf6)_18%,transparent),transparent_34%)]",
  mesh: "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_14%_8%,color-mix(in_srgb,var(--epk-accent,#8b5cf6)_20%,transparent),transparent_28%),radial-gradient(circle_at_84%_10%,color-mix(in_srgb,var(--epk-secondary-accent,var(--epk-accent,#06b6d4))_18%,transparent),transparent_30%)]",
  spotlight: "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.13),transparent_36%)]",
}

const HERO_IMAGE_TREATMENT_CLASS: Record<EpkAppearance["heroImageTreatment"], string> = {
  natural: "",
  cinematic: "contrast-110 saturate-110",
  duotone: "grayscale contrast-125 mix-blend-luminosity",
  soft: "saturate-90 contrast-95",
  posterized: "contrast-125 saturate-150",
}

const SECTION_DIVIDER_CLASS: Record<EpkAppearance["sectionDividerStyle"], string> = {
  none: "",
  line: "border-t border-white/10 pt-6",
  accent: "border-t border-[color:var(--epk-accent-muted)] pt-6",
  glow: "border-t border-[color:var(--epk-accent-muted)] pt-6 shadow-[0_-18px_34px_-34px_var(--epk-accent,#8b5cf6)]",
  ticker: "border-t-2 border-dashed border-[color:var(--epk-accent-muted)] pt-6",
}

export interface ResolvedEpkAppearance {
  wrapperClassName: string
  rootStyle: CSSProperties
  mergedTokens: EpkSkinTokens
  styles: {
    page: CSSProperties
    heroShell: CSSProperties
    card: CSSProperties
    mutedCard: CSSProperties
    statCell: CSSProperties
    badge: CSSProperties
    buttonPrimary: CSSProperties
    buttonGhost: CSSProperties
    avatarRing: CSSProperties
    divider: CSSProperties
    decorativeAccent: CSSProperties
    accentText: CSSProperties
    heading: CSSProperties
    body: CSSProperties
    muted: CSSProperties
    label: CSSProperties
    placeholder: CSSProperties
    mediaFrame: CSSProperties
    trackArt: CSSProperties
  }
  color: {
    hasCustomAccent: boolean
    hasCustomSecondaryAccent: boolean
    hasCustomText: boolean
    hasCustomPageBackground: boolean
    hasCustomCardBackground: boolean
    hasCustomBorder: boolean
    accentBg: string
    accentSoftBg: string
    accentBorder: string
    accentRing: string
    accentText: string
    accentDivider: string
    secondaryBg: string
    secondaryText: string
    secondaryBorder: string
    text: string
    subtext: string
    mutedText: string
    labelText: string
    bodyText: string
    placeholderText: string
    cardBg: string
    mutedCardBg: string
    mediaFrame: string
    mediaEmpty: string
    skeleton: string
    customBorder: string
    customCardBg: string
    effectClass: string
    pageEffectClass: string
    sectionDivider: string
    heroImage: string
    buttonRadius: string
  }
  sectionGapClass: string
  heroGapClass: string
  avatarClassName: string
  avatarShapeClass: string
  classicCoverHeightClass: string
  classicCoverOverlayFromClass: string
  contentMaxWidthClass: string
}

function nonEmptyStyle(style: CSSProperties): CSSProperties {
  return Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as CSSProperties
}

export function resolveEpkAppearanceForRender({
  skin,
  appearance,
}: {
  skin: EpkSkinId
  appearance: EpkAppearance
}): ResolvedEpkAppearance {
  const base = EPK_SKIN_TOKENS[skin]
  const mergedTokens = mergeTokens(base, appearance)
  const hasCustomAccent = Boolean(appearance.accentHex)
  const hasCustomSecondaryAccent = Boolean(appearance.secondaryAccentHex)
  const hasCustomText = Boolean(appearance.textColorCustomHex)
  const hasCustomPageBackground =
    Boolean(appearance.pageBackgroundHex) || appearance.backgroundStyle !== "template"
  const hasCustomSurfaceBackground =
    Boolean(appearance.pageBackgroundHex) || Boolean(appearance.cardBackgroundHex)
  const hasCustomCardBackground = Boolean(appearance.cardBackgroundHex)
  const hasCustomBorder = Boolean(appearance.borderColorHex)

  const rootStyle: CSSProperties & Record<string, string> = {}
  if (appearance.accentHex) {
    rootStyle["--epk-accent"] = appearance.accentHex
    rootStyle["--epk-accent-soft"] = "color-mix(in srgb, var(--epk-accent) 16%, transparent)"
    rootStyle["--epk-accent-muted"] = "color-mix(in srgb, var(--epk-accent) 48%, transparent)"
  }
  if (appearance.secondaryAccentHex) {
    rootStyle["--epk-secondary-accent"] = appearance.secondaryAccentHex
    rootStyle["--epk-secondary-soft"] =
      "color-mix(in srgb, var(--epk-secondary-accent) 18%, transparent)"
  }
  if (appearance.textColorCustomHex)
    rootStyle["--epk-custom-text"] = appearance.textColorCustomHex
  if (appearance.pageBackgroundHex) {
    rootStyle["--epk-page-bg"] = appearance.pageBackgroundHex ?? "transparent"
  }
  if (appearance.cardBackgroundHex) {
    rootStyle["--epk-card-custom-bg"] = appearance.cardBackgroundHex
  }
  if (appearance.borderColorHex) {
    rootStyle["--epk-border-custom"] = appearance.borderColorHex
  }
  if (appearance.pageBackgroundHex || appearance.cardBackgroundHex) {
    rootStyle["--epk-card-bg"] = appearance.cardBackgroundHex
      ? "var(--epk-card-custom-bg)"
      : "color-mix(in srgb, var(--epk-page-bg) 88%, var(--epk-custom-text, #ffffff) 12%)"
    rootStyle["--epk-muted-card-bg"] = appearance.cardBackgroundHex
      ? "color-mix(in srgb, var(--epk-card-custom-bg) 88%, var(--epk-custom-text, #ffffff) 12%)"
      : "color-mix(in srgb, var(--epk-page-bg) 94%, var(--epk-custom-text, #ffffff) 6%)"
  }

  const editableAccent = appearance.accentHex ?? undefined
  const editableSecondary = appearance.secondaryAccentHex ?? undefined
  const editableText = appearance.textColorCustomHex ?? undefined
  const editablePageBg = appearance.pageBackgroundHex ?? undefined
  const editableCardBg = appearance.cardBackgroundHex
    ? "var(--epk-card-custom-bg)"
    : appearance.pageBackgroundHex
      ? "var(--epk-card-bg)"
      : undefined
  const editableMutedBg = appearance.cardBackgroundHex
    ? "var(--epk-muted-card-bg)"
    : appearance.pageBackgroundHex
      ? "var(--epk-muted-card-bg)"
      : undefined
  const editableBorder = appearance.borderColorHex ?? appearance.accentHex ?? undefined
  const editableSoftAccent = appearance.accentHex ? "var(--epk-accent-soft)" : undefined

  const styles: ResolvedEpkAppearance["styles"] = {
    page: nonEmptyStyle({
      backgroundColor: editablePageBg,
      color: editableText,
    }),
    heroShell: nonEmptyStyle({
      backgroundColor: editableCardBg,
      borderColor: editableBorder,
      color: editableText,
    }),
    card: nonEmptyStyle({
      backgroundColor: editableCardBg,
      borderColor: editableBorder,
      color: editableText,
    }),
    mutedCard: nonEmptyStyle({
      backgroundColor: editableMutedBg,
      borderColor: editableBorder,
      color: editableText,
    }),
    statCell: nonEmptyStyle({
      backgroundColor: editableMutedBg,
      borderColor: editableBorder,
      color: editableText,
    }),
    badge: nonEmptyStyle({
      backgroundColor: editableSoftAccent,
      borderColor: editableBorder,
      color: editableSecondary ?? editableText,
    }),
    buttonPrimary: nonEmptyStyle({
      backgroundColor: editableAccent,
      borderColor: editableAccent,
    }),
    buttonGhost: nonEmptyStyle({
      borderColor: editableBorder,
      color: editableText ?? editableAccent,
    }),
    avatarRing: nonEmptyStyle({
      borderColor: editableBorder,
      backgroundColor: editableAccent,
    }),
    divider: nonEmptyStyle({
      backgroundColor: editableAccent,
      borderColor: editableBorder,
    }),
    decorativeAccent: nonEmptyStyle({
      backgroundColor: editableAccent,
      borderColor: editableBorder,
      color: editableAccent,
    }),
    accentText: nonEmptyStyle({
      color: editableAccent,
    }),
    heading: nonEmptyStyle({
      color: editableText,
    }),
    body: nonEmptyStyle({
      color: editableText,
    }),
    muted: nonEmptyStyle({
      color: editableText,
      opacity: editableText ? 0.72 : undefined,
    }),
    label: nonEmptyStyle({
      color: editableText,
      opacity: editableText ? 0.68 : undefined,
    }),
    placeholder: nonEmptyStyle({
      color: editableText,
      opacity: editableText ? 0.55 : undefined,
    }),
    mediaFrame: nonEmptyStyle({
      backgroundColor: editableMutedBg,
      borderColor: editableBorder,
    }),
    trackArt: nonEmptyStyle({
      backgroundColor: editableAccent,
    }),
  }

  const contentMaxWidthClass =
    appearance.contentWidth === "default" && skin === "gallery"
      ? "max-w-3xl"
      : CONTENT_WIDTH[appearance.contentWidth]

  return {
    wrapperClassName: [FONT_SCALE[appearance.fontSizeScale], HEADING_SCALE[appearance.headingScale]]
      .filter(Boolean)
      .join(" "),
    rootStyle,
    mergedTokens,
    styles,
    color: {
      hasCustomAccent,
      hasCustomSecondaryAccent,
      hasCustomText,
      hasCustomPageBackground,
      hasCustomCardBackground,
      hasCustomBorder,
      accentBg: hasCustomAccent ? "bg-[color:var(--epk-accent)]" : "",
      accentSoftBg: hasCustomAccent ? "bg-[color:var(--epk-accent-soft)]" : "",
      accentBorder: hasCustomAccent ? "border-[color:var(--epk-accent)]" : "",
      accentRing: hasCustomAccent ? "ring-[color:var(--epk-accent)]" : "",
      accentText: hasCustomAccent ? "text-[color:var(--epk-accent)]" : "",
      accentDivider: hasCustomAccent ? "bg-[color:var(--epk-accent)]" : "",
      secondaryBg: hasCustomSecondaryAccent ? "bg-[color:var(--epk-secondary-accent)]" : "",
      secondaryText: hasCustomSecondaryAccent ? "text-[color:var(--epk-secondary-accent)]" : "",
      secondaryBorder: hasCustomSecondaryAccent
        ? "border-[color:var(--epk-secondary-accent)]"
        : "",
      text: hasCustomText ? "!text-[color:var(--epk-custom-text)]" : "",
      subtext: hasCustomText ? "!text-[color:var(--epk-custom-text)] opacity-85" : "",
      mutedText: hasCustomText ? "!text-[color:var(--epk-custom-text)] opacity-70" : "",
      labelText: hasCustomText ? "!text-[color:var(--epk-custom-text)] opacity-65" : "",
      bodyText: hasCustomText ? "!text-[color:var(--epk-custom-text)]" : "",
      placeholderText: hasCustomText ? "italic !text-[color:var(--epk-custom-text)] opacity-55" : "",
      cardBg: hasCustomSurfaceBackground ? "!bg-[color:var(--epk-card-bg)]" : "",
      mutedCardBg: hasCustomSurfaceBackground ? "!bg-[color:var(--epk-muted-card-bg)]" : "",
      mediaFrame: hasCustomAccent
        ? "border-[color:var(--epk-accent-muted)]"
        : base.isLightSurface
          ? "border-neutral-200 bg-neutral-100"
          : "border-white/10 bg-white/5",
      mediaEmpty: hasCustomAccent
        ? "border-dashed border-[color:var(--epk-accent-muted)] bg-[color:var(--epk-accent-soft)]"
        : base.isLightSurface
          ? "border-dashed border-neutral-300 bg-neutral-50"
          : "border-dashed border-white/15 bg-white/[0.04]",
      skeleton: hasCustomText
        ? "bg-[color:var(--epk-custom-text)] opacity-20"
        : base.isLightSurface
          ? "bg-neutral-200/80"
          : "bg-white/10",
      customBorder: hasCustomBorder ? "border-[color:var(--epk-border-custom)]" : "",
      customCardBg: hasCustomCardBackground ? "bg-[color:var(--epk-card-custom-bg)]" : "",
      effectClass: EFFECT_CARD_CLASS[appearance.effectStyle],
      pageEffectClass: [PAGE_EFFECT_CLASS[appearance.effectStyle], BACKGROUND_STYLE_CLASS[appearance.backgroundStyle]]
        .filter(Boolean)
        .join(" "),
      sectionDivider: SECTION_DIVIDER_CLASS[appearance.sectionDividerStyle],
      heroImage: HERO_IMAGE_TREATMENT_CLASS[appearance.heroImageTreatment],
      buttonRadius: BUTTON_RADIUS_CLASS[appearance.buttonRadius],
    },
    sectionGapClass: SECTION_GAP[appearance.sectionSpacing],
    heroGapClass: HERO_GAP[appearance.sectionSpacing],
    avatarClassName: AVATAR_SIZE[appearance.avatarSize],
    avatarShapeClass: AVATAR_SHAPE[appearance.avatarShape],
    classicCoverHeightClass: COVER_HEIGHT[appearance.coverHeight],
    classicCoverOverlayFromClass: COVER_OVERLAY[appearance.coverOverlay],
    contentMaxWidthClass,
  }
}

/** Curated swatches for EPK accent / page / text pickers */
export const EPK_COLOR_SWATCHES = [
  "#c9a962",
  "#f07167",
  "#2d6a5a",
  "#6366f1",
  "#06b6d4",
  "#e8dcc8",
  "#faf3eb",
  "#0c0c0e",
  "#0a1628",
  "#f4f1ea",
  "#e8efe9",
  "#facc15",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#ffffff",
] as const

export interface EpkPalettePreset {
  id: string
  name: string
  accentHex: string
  secondaryAccentHex: string | null
  pageBackgroundHex: string | null
  textColorCustomHex: string | null
  cardBackgroundHex: string | null
  borderColorHex: string | null
}

export const EPK_PALETTE_PRESETS: Record<EpkSkinId, EpkPalettePreset[]> = {
  modern: [
    {
      id: "violet-signal",
      name: "Violet Signal",
      accentHex: "#8b5cf6",
      secondaryAccentHex: "#06b6d4",
      pageBackgroundHex: "#07080f",
      textColorCustomHex: "#f8fafc",
      cardBackgroundHex: "#111827",
      borderColorHex: "#4c1d95",
    },
    {
      id: "laser-rose",
      name: "Laser Rose",
      accentHex: "#ec4899",
      secondaryAccentHex: "#22d3ee",
      pageBackgroundHex: "#0f1020",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#18152a",
      borderColorHex: "#be185d",
    },
  ],
  classic: [
    {
      id: "press-room",
      name: "Press Room",
      accentHex: "#92400e",
      secondaryAccentHex: "#b45309",
      pageBackgroundHex: "#f4f1ea",
      textColorCustomHex: "#1c1917",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#d6d3d1",
    },
    {
      id: "vinyl-cream",
      name: "Vinyl Cream",
      accentHex: "#7c2d12",
      secondaryAccentHex: "#c9a962",
      pageBackgroundHex: "#faf3eb",
      textColorCustomHex: "#292524",
      cardBackgroundHex: "#fffaf3",
      borderColorHex: "#e7d7c1",
    },
  ],
  minimal: [
    {
      id: "mono-noir",
      name: "Mono Noir",
      accentHex: "#ffffff",
      secondaryAccentHex: "#94a3b8",
      pageBackgroundHex: "#050505",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#0d0d0d",
      borderColorHex: "#333333",
    },
    {
      id: "steel-line",
      name: "Steel Line",
      accentHex: "#e2e8f0",
      secondaryAccentHex: "#38bdf8",
      pageBackgroundHex: "#020617",
      textColorCustomHex: "#f8fafc",
      cardBackgroundHex: "#0f172a",
      borderColorHex: "#334155",
    },
  ],
  bold: [
    {
      id: "hazard-stage",
      name: "Hazard Stage",
      accentHex: "#facc15",
      secondaryAccentHex: "#ef4444",
      pageBackgroundHex: "#030303",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#09090b",
      borderColorHex: "#facc15",
    },
    {
      id: "club-voltage",
      name: "Club Voltage",
      accentHex: "#22c55e",
      secondaryAccentHex: "#a855f7",
      pageBackgroundHex: "#020403",
      textColorCustomHex: "#f7fee7",
      cardBackgroundHex: "#06120a",
      borderColorHex: "#22c55e",
    },
  ],
  cinema: [
    {
      id: "silver-screen",
      name: "Silver Screen",
      accentHex: "#e5e7eb",
      secondaryAccentHex: "#71717a",
      pageBackgroundHex: "#0c0c0e",
      textColorCustomHex: "#f4f4f5",
      cardBackgroundHex: "#09090b",
      borderColorHex: "#52525b",
    },
    {
      id: "red-carpet",
      name: "Red Carpet",
      accentHex: "#dc2626",
      secondaryAccentHex: "#fbbf24",
      pageBackgroundHex: "#120607",
      textColorCustomHex: "#fff7ed",
      cardBackgroundHex: "#18090a",
      borderColorHex: "#7f1d1d",
    },
  ],
  gallery: [
    {
      id: "white-cube",
      name: "White Cube",
      accentHex: "#111827",
      secondaryAccentHex: "#64748b",
      pageBackgroundHex: "#fafafa",
      textColorCustomHex: "#171717",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#e5e5e5",
    },
    {
      id: "ink-wash",
      name: "Ink Wash",
      accentHex: "#0f172a",
      secondaryAccentHex: "#2dd4bf",
      pageBackgroundHex: "#f8fafc",
      textColorCustomHex: "#0f172a",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#cbd5e1",
    },
  ],
  luxe: [
    {
      id: "midnight-gold",
      name: "Midnight Gold",
      accentHex: "#c9a962",
      secondaryAccentHex: "#e8dcc8",
      pageBackgroundHex: "#0a1628",
      textColorCustomHex: "#f5f0e8",
      cardBackgroundHex: "#0d1c32",
      borderColorHex: "#c9a962",
    },
    {
      id: "platinum-club",
      name: "Platinum Club",
      accentHex: "#d8b4fe",
      secondaryAccentHex: "#f5d0fe",
      pageBackgroundHex: "#100a1f",
      textColorCustomHex: "#faf5ff",
      cardBackgroundHex: "#171129",
      borderColorHex: "#7e22ce",
    },
  ],
  poster: [
    {
      id: "street-bill",
      name: "Street Bill",
      accentHex: "#f07167",
      secondaryAccentHex: "#facc15",
      pageBackgroundHex: "#140808",
      textColorCustomHex: "#faf3eb",
      cardBackgroundHex: "#1a0c0c",
      borderColorHex: "#f07167",
    },
    {
      id: "acid-print",
      name: "Acid Print",
      accentHex: "#a3e635",
      secondaryAccentHex: "#fb7185",
      pageBackgroundHex: "#0a0a0a",
      textColorCustomHex: "#f7fee7",
      cardBackgroundHex: "#111111",
      borderColorHex: "#a3e635",
    },
  ],
  coastal: [
    {
      id: "sea-glass",
      name: "Sea Glass",
      accentHex: "#2d6a5a",
      secondaryAccentHex: "#06b6d4",
      pageBackgroundHex: "#e8efe9",
      textColorCustomHex: "#1a3a3a",
      cardBackgroundHex: "#f4f8f5",
      borderColorHex: "#b8cfc4",
    },
    {
      id: "sun-wash",
      name: "Sun Wash",
      accentHex: "#0f766e",
      secondaryAccentHex: "#f59e0b",
      pageBackgroundHex: "#ecfeff",
      textColorCustomHex: "#134e4a",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#99f6e4",
    },
  ],
  scrapbook: [
    {
      id: "terracotta-paper",
      name: "Terracotta Paper",
      accentHex: "#d08156",
      secondaryAccentHex: "#6f9187",
      pageBackgroundHex: "#8f756b",
      textColorCustomHex: "#241d19",
      cardBackgroundHex: "#fbf8f4",
      borderColorHex: "#c9b8ae",
    },
    {
      id: "sage-collage",
      name: "Sage Collage",
      accentHex: "#5f8478",
      secondaryAccentHex: "#d98c62",
      pageBackgroundHex: "#789187",
      textColorCustomHex: "#201a17",
      cardBackgroundHex: "#fffaf4",
      borderColorHex: "#bdaea5",
    },
  ],
  bandcard: [
    {
      id: "yellow-stage",
      name: "Yellow Stage",
      accentHex: "#f5df18",
      secondaryAccentHex: "#ffffff",
      pageBackgroundHex: "#090909",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#111111",
      borderColorHex: "#f5df18",
    },
    {
      id: "acid-lime",
      name: "Acid Lime",
      accentHex: "#b7ff32",
      secondaryAccentHex: "#ff4d7d",
      pageBackgroundHex: "#050505",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#121212",
      borderColorHex: "#b7ff32",
    },
  ],
  dossier: [
    {
      id: "copier-paper",
      name: "Copier Paper",
      accentHex: "#111111",
      secondaryAccentHex: "#6b7280",
      pageBackgroundHex: "#d7d4ce",
      textColorCustomHex: "#111111",
      cardBackgroundHex: "#f7f5f0",
      borderColorHex: "#1f1f1f",
    },
    {
      id: "red-marker",
      name: "Red Marker",
      accentHex: "#dc2626",
      secondaryAccentHex: "#111111",
      pageBackgroundHex: "#d9d5cf",
      textColorCustomHex: "#111111",
      cardBackgroundHex: "#fffdf7",
      borderColorHex: "#111111",
    },
  ],
  pressgrid: [
    {
      id: "press-white",
      name: "Press White",
      accentHex: "#f04b32",
      secondaryAccentHex: "#111111",
      pageBackgroundHex: "#f4f4f2",
      textColorCustomHex: "#111111",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#222222",
    },
    {
      id: "blue-proof",
      name: "Blue Proof",
      accentHex: "#2563eb",
      secondaryAccentHex: "#111111",
      pageBackgroundHex: "#f8fafc",
      textColorCustomHex: "#111827",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#64748b",
    },
  ],
  redcolumn: [
    {
      id: "signal-red",
      name: "Signal Red",
      accentHex: "#e11118",
      secondaryAccentHex: "#202020",
      pageBackgroundHex: "#eeeeec",
      textColorCustomHex: "#202020",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#e11118",
    },
    {
      id: "orange-column",
      name: "Orange Column",
      accentHex: "#f97316",
      secondaryAccentHex: "#111827",
      pageBackgroundHex: "#f3f4f6",
      textColorCustomHex: "#111827",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#f97316",
    },
  ],
  checkerboard: [
    {
      id: "purple-race",
      name: "Purple Race",
      accentHex: "#8b3dff",
      secondaryAccentHex: "#ef2d2d",
      pageBackgroundHex: "#050505",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#0d0d0d",
      borderColorHex: "#8b3dff",
    },
    {
      id: "electric-blue",
      name: "Electric Blue",
      accentHex: "#2563eb",
      secondaryAccentHex: "#f43f5e",
      pageBackgroundHex: "#030712",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#0b1020",
      borderColorHex: "#2563eb",
    },
  ],
  editorial: [
    {
      id: "red-editorial",
      name: "Red Editorial",
      accentHex: "#ff3542",
      secondaryAccentHex: "#7c3aed",
      pageBackgroundHex: "#171717",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#1d1d1d",
      borderColorHex: "#ff3542",
    },
    {
      id: "cyan-editorial",
      name: "Cyan Editorial",
      accentHex: "#22d3ee",
      secondaryAccentHex: "#a855f7",
      pageBackgroundHex: "#0b0b0c",
      textColorCustomHex: "#f8fafc",
      cardBackgroundHex: "#151518",
      borderColorHex: "#22d3ee",
    },
  ],
  whitespace: [
    {
      id: "museum-blue",
      name: "Museum Blue",
      accentHex: "#2aa9c8",
      secondaryAccentHex: "#111111",
      pageBackgroundHex: "#ffffff",
      textColorCustomHex: "#111111",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#d4d4d4",
    },
    {
      id: "soft-lilac",
      name: "Soft Lilac",
      accentHex: "#8b5cf6",
      secondaryAccentHex: "#0f172a",
      pageBackgroundHex: "#faf9ff",
      textColorCustomHex: "#18181b",
      cardBackgroundHex: "#ffffff",
      borderColorHex: "#ddd6fe",
    },
  ],
  colorblock: [
    {
      id: "lighthouse-red",
      name: "Lighthouse Red",
      accentHex: "#111111",
      secondaryAccentHex: "#ffffff",
      pageBackgroundHex: "#ef2d2d",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#ef2d2d",
      borderColorHex: "#ffffff",
    },
    {
      id: "electric-orange",
      name: "Electric Orange",
      accentHex: "#111111",
      secondaryAccentHex: "#fff7ed",
      pageBackgroundHex: "#f97316",
      textColorCustomHex: "#ffffff",
      cardBackgroundHex: "#f97316",
      borderColorHex: "#ffffff",
    },
  ],
  sunburst: [
    {
      id: "fenix-yellow",
      name: "Fenix Yellow",
      accentHex: "#d02d20",
      secondaryAccentHex: "#1f7a4d",
      pageBackgroundHex: "#f6c743",
      textColorCustomHex: "#d02d20",
      cardBackgroundHex: "#f6c743",
      borderColorHex: "#d02d20",
    },
    {
      id: "lime-poster",
      name: "Lime Poster",
      accentHex: "#7f1d1d",
      secondaryAccentHex: "#2563eb",
      pageBackgroundHex: "#d9f044",
      textColorCustomHex: "#7f1d1d",
      cardBackgroundHex: "#d9f044",
      borderColorHex: "#7f1d1d",
    },
  ],
}
