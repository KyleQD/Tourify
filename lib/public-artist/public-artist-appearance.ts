import {
  getDefaultEpkAppearanceForTemplate,
  normalizeEpkAppearance,
  resolveEpkAppearanceForRender,
  type EpkAppearance,
  type ResolvedEpkAppearance,
} from "@/lib/epk/epk-appearance"
import {
  resolveEpkPreviewTemplateId,
  type EpkSkinId,
} from "@/lib/epk/epk-skin-tokens"
import {
  normalizeEpkFontId,
  type EpkFontId,
} from "@/lib/epk/epk-preview-utils"

export interface PublicArtistAppearance {
  template: EpkSkinId
  epkFont: EpkFontId
  epkAppearance: EpkAppearance
}

export const DEFAULT_PUBLIC_ARTIST_APPEARANCE: PublicArtistAppearance = {
  template: "modern",
  epkFont: "sans",
  epkAppearance: getDefaultEpkAppearanceForTemplate("modern"),
}

export function normalizePublicArtistAppearance(raw: unknown): PublicArtistAppearance {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { ...DEFAULT_PUBLIC_ARTIST_APPEARANCE, epkAppearance: { ...DEFAULT_PUBLIC_ARTIST_APPEARANCE.epkAppearance } }

  const o = raw as Record<string, unknown>
  const template = resolveEpkPreviewTemplateId(
    typeof o.template === "string" ? o.template : undefined
  )
  return {
    template,
    epkFont: normalizeEpkFontId(o.epkFont),
    epkAppearance: normalizeEpkAppearance(o.epkAppearance, template),
  }
}

/** Returns null when settings have never stored a public_appearance object. */
export function readPublicArtistAppearanceFromSettings(
  settings: unknown
): PublicArtistAppearance | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null
  const publicAppearance = (settings as Record<string, unknown>).public_appearance
  if (publicAppearance === undefined || publicAppearance === null) return null
  return normalizePublicArtistAppearance(publicAppearance)
}

export function mergePublicArtistAppearanceIntoSettings(
  settings: unknown,
  appearance: PublicArtistAppearance
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {}
  return {
    ...base,
    public_appearance: {
      template: appearance.template,
      epkFont: appearance.epkFont,
      epkAppearance: appearance.epkAppearance,
    },
  }
}

export function resolvePublicArtistAppearanceForRender(
  appearance: PublicArtistAppearance
): ResolvedEpkAppearance {
  return resolveEpkAppearanceForRender({
    skin: appearance.template,
    appearance: appearance.epkAppearance,
  })
}

export function publicArtistAppearanceToJson(appearance: PublicArtistAppearance) {
  return {
    template: appearance.template,
    epkFont: appearance.epkFont,
    epkAppearance: appearance.epkAppearance,
  }
}
