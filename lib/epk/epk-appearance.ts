import type { CSSProperties } from "react"
import type { EpkSkinId, EpkSkinTokens } from "@/lib/epk/epk-skin-tokens"
import { EPK_SKIN_TOKENS } from "@/lib/epk/epk-skin-tokens"

export interface EpkAppearance {
  fontSizeScale: "xs" | "sm" | "md" | "lg" | "xl"
  textColorPreset: "inherit" | "high_contrast" | "muted"
  /** When set, applied via CSS variable on headings/body tokens */
  textColorCustomHex: string | null
  cardRadius: "sharp" | "rounded" | "pill"
  cardSurface: "default" | "elevated" | "minimal"
  accentHex: string | null
  /** Optional page background override */
  pageBackgroundHex: string | null
  headingScale: "sm" | "md" | "lg" | "xl"
  contentWidth: "narrow" | "default" | "wide"
  borderStrength: "subtle" | "default" | "strong"
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
  pageBackgroundHex: null,
  headingScale: "md",
  contentWidth: "default",
  borderStrength: "default",
  avatarShape: "circle",
  avatarSize: "lg",
  sectionSpacing: "default",
  coverHeight: "medium",
  coverOverlay: "medium",
}

const HEX_RE = /^#([0-9A-Fa-f]{6})$/

export function normalizeHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const v = raw.trim()
  if (!HEX_RE.test(v)) return null
  return v.toLowerCase()
}

export function getDefaultEpkAppearance(_templateId?: string): EpkAppearance {
  return { ...DEFAULT_EPK_APPEARANCE }
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
    pageBackgroundHex: normalizeHexColor(o.pageBackgroundHex),
    headingScale: pick(o.headingScale, ["sm", "md", "lg", "xl"], base.headingScale),
    contentWidth: pick(o.contentWidth, ["narrow", "default", "wide"], base.contentWidth),
    borderStrength: pick(
      o.borderStrength,
      ["subtle", "default", "strong"],
      base.borderStrength
    ),
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

  card = applyBorderStrength(card, appearance.borderStrength)
  cardMuted = applyBorderStrength(cardMuted, appearance.borderStrength)
  dashed = applyBorderStrength(dashed, appearance.borderStrength)
  statCell = applyBorderStrength(statCell, appearance.borderStrength)
  oneLinerWrap = applyBorderStrength(oneLinerWrap, appearance.borderStrength)

  let page = base.page
  if (appearance.pageBackgroundHex)
    page = `${page} !bg-[color:var(--epk-page-bg)]`

  let heading = base.heading
  let subheading = base.subheading
  let accentIcon = base.accentIcon
  let btnPrimary = base.btnPrimary

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
  }

  if (appearance.accentHex) {
    accentIcon = "text-[color:var(--epk-accent)]"
    btnPrimary = `${btnPrimary} !bg-[color:var(--epk-accent)] hover:opacity-90 border-transparent`
  }

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
    accentIcon,
    btnPrimary,
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

export interface ResolvedEpkAppearance {
  wrapperClassName: string
  rootStyle: CSSProperties
  mergedTokens: EpkSkinTokens
  sectionGapClass: string
  heroGapClass: string
  avatarClassName: string
  avatarShapeClass: string
  classicCoverHeightClass: string
  classicCoverOverlayFromClass: string
  contentMaxWidthClass: string
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

  const rootStyle: CSSProperties & Record<string, string> = {}
  if (appearance.accentHex) rootStyle["--epk-accent"] = appearance.accentHex
  if (appearance.textColorCustomHex)
    rootStyle["--epk-custom-text"] = appearance.textColorCustomHex
  if (appearance.pageBackgroundHex)
    rootStyle["--epk-page-bg"] = appearance.pageBackgroundHex

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
