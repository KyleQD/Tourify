import type { CSSProperties } from "react"
import type { EpkSkinId, EpkSkinTokens } from "@/lib/epk/epk-skin-tokens"
import { EPK_SKIN_TOKENS } from "@/lib/epk/epk-skin-tokens"

export interface EpkAppearance {
  fontSizeScale: "sm" | "md" | "lg"
  textColorPreset: "inherit" | "high_contrast" | "muted"
  /** When set, applied via CSS variable on headings/body tokens */
  textColorCustomHex: string | null
  cardRadius: "sharp" | "rounded" | "pill"
  cardSurface: "default" | "elevated" | "minimal"
  accentHex: string | null
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
  avatarShape: "circle",
  avatarSize: "lg",
  sectionSpacing: "default",
  coverHeight: "medium",
  coverOverlay: "medium",
}

export function getDefaultEpkAppearance(_templateId?: string): EpkAppearance {
  return { ...DEFAULT_EPK_APPEARANCE }
}

export function normalizeEpkAppearance(raw: unknown, template?: string): EpkAppearance {
  const base = getDefaultEpkAppearance(template)
  if (!raw || typeof raw !== "object") return base
  const o = raw as Record<string, unknown>
  return {
    fontSizeScale: pick(o.fontSizeScale, ["sm", "md", "lg"], base.fontSizeScale),
    textColorPreset: pick(o.textColorPreset, ["inherit", "high_contrast", "muted"], base.textColorPreset),
    textColorCustomHex: typeof o.textColorCustomHex === "string" && o.textColorCustomHex.trim()
      ? o.textColorCustomHex.trim()
      : null,
    cardRadius: pick(o.cardRadius, ["sharp", "rounded", "pill"], base.cardRadius),
    cardSurface: pick(o.cardSurface, ["default", "elevated", "minimal"], base.cardSurface),
    accentHex:
      typeof o.accentHex === "string" && o.accentHex.trim() ? o.accentHex.trim() : null,
    avatarShape: pick(o.avatarShape, ["circle", "rounded", "square"], base.avatarShape),
    avatarSize: pick(o.avatarSize, ["sm", "md", "lg", "xl"], base.avatarSize),
    sectionSpacing: pick(o.sectionSpacing, ["compact", "default", "relaxed"], base.sectionSpacing),
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

function mergeTokens(base: EpkSkinTokens, appearance: EpkAppearance): EpkSkinTokens {
  let card = applyCardRadiusClassString(base.card, appearance.cardRadius)
  let cardMuted = applyCardRadiusClassString(base.cardMuted, appearance.cardRadius)
  let dashed = applyCardRadiusClassString(base.dashed, appearance.cardRadius)
  let oneLinerWrap = applyCardRadiusClassString(base.oneLinerWrap, appearance.cardRadius)

  card = applySurface(card, appearance.cardSurface)
  cardMuted = applySurface(cardMuted, appearance.cardSurface)
  dashed = applySurface(dashed, appearance.cardSurface)

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
    card,
    cardMuted,
    dashed,
    oneLinerWrap,
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
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
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

  return {
    wrapperClassName: FONT_SCALE[appearance.fontSizeScale],
    rootStyle,
    mergedTokens,
    sectionGapClass: SECTION_GAP[appearance.sectionSpacing],
    heroGapClass: HERO_GAP[appearance.sectionSpacing],
    avatarClassName: AVATAR_SIZE[appearance.avatarSize],
    avatarShapeClass: AVATAR_SHAPE[appearance.avatarShape],
    classicCoverHeightClass: COVER_HEIGHT[appearance.coverHeight],
    classicCoverOverlayFromClass: COVER_OVERLAY[appearance.coverOverlay],
  }
}
