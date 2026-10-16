import { normalizeHexColor } from "@/lib/epk/epk-appearance"
import { EPK_SKIN_TOKENS, type EpkSkinId } from "@/lib/epk/epk-skin-tokens"

export const EPK_SECTION_BACKDROPS = ["none", "tint", "accent", "frame"] as const
export const EPK_SECTION_SPACINGS = ["tight", "default", "airy"] as const
export const EPK_SECTION_MOTIONS = ["inherit", "none", "fade", "rise", "zoom", "blur"] as const

/** Per-section overrides layered on top of the page-wide appearance. */
export interface EpkSectionStyle {
  /** Render this section with another template's element design. */
  skin?: EpkSkinId
  accentHex?: string
  backdrop?: (typeof EPK_SECTION_BACKDROPS)[number]
  spacing?: (typeof EPK_SECTION_SPACINGS)[number]
  motion?: (typeof EPK_SECTION_MOTIONS)[number]
}

export type EpkSectionStyles = Record<string, EpkSectionStyle>

function pick<T extends readonly string[]>(list: T, raw: unknown): T[number] | undefined {
  return typeof raw === "string" && (list as readonly string[]).includes(raw)
    ? (raw as T[number])
    : undefined
}

export function isEpkSectionStyleEmpty(style: EpkSectionStyle | undefined | null): boolean {
  if (!style) return true
  return (
    !style.skin &&
    !style.accentHex &&
    (!style.backdrop || style.backdrop === "none") &&
    (!style.spacing || style.spacing === "default") &&
    (!style.motion || style.motion === "inherit")
  )
}

export function normalizeEpkSectionStyle(raw: unknown): EpkSectionStyle | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const skin =
    typeof r.skin === "string" && r.skin in EPK_SKIN_TOKENS ? (r.skin as EpkSkinId) : undefined
  const style: EpkSectionStyle = {
    skin,
    accentHex: normalizeHexColor(r.accentHex) ?? undefined,
    backdrop: pick(EPK_SECTION_BACKDROPS, r.backdrop),
    spacing: pick(EPK_SECTION_SPACINGS, r.spacing),
    motion: pick(EPK_SECTION_MOTIONS, r.motion),
  }
  for (const key of Object.keys(style) as (keyof EpkSectionStyle)[]) {
    if (style[key] === undefined) delete style[key]
  }
  return isEpkSectionStyleEmpty(style) ? null : style
}

export function normalizeEpkSectionStyles(raw: unknown): EpkSectionStyles {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: EpkSectionStyles = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const style = normalizeEpkSectionStyle(value)
    if (style) out[id] = style
  }
  return out
}
