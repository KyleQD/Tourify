import type { EPKData } from "@/lib/services/epk.service"

export type EpkFontId = "sans" | "serif" | "display" | "geometric" | "mono"

export const EPK_DEFAULT_SECTION_ORDER = [
  "hero",
  "one-liner",
  "bio",
  "stats",
  "music",
  "shows",
  "press",
  "media",
  "contact",
  "social",
  "booking",
] as const

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  hero: true,
  "one-liner": true,
  bio: true,
  stats: true,
  music: true,
  shows: true,
  press: true,
  media: true,
  contact: true,
  social: true,
  booking: true,
}

export function normalizeEpkLayout(layout: EPKData["layout"] | undefined): EPKData["layout"] {
  const base = layout ?? {
    preset: "booker" as const,
    sectionOrder: [...EPK_DEFAULT_SECTION_ORDER],
    sectionVisibility: { ...DEFAULT_VISIBILITY },
  }
  const mergedVis = { ...DEFAULT_VISIBILITY, ...base.sectionVisibility }
  const order =
    Array.isArray(base.sectionOrder) && base.sectionOrder.length > 0
      ? [...base.sectionOrder]
      : [...EPK_DEFAULT_SECTION_ORDER]
  for (const key of order) if (mergedVis[key] === undefined) mergedVis[key] = true
  return {
    preset: base.preset ?? "booker",
    sectionOrder: order,
    sectionVisibility: mergedVis,
  }
}

export function isSectionVisible(sectionId: string, layout: EPKData["layout"]): boolean {
  return layout.sectionVisibility[sectionId] !== false
}

export function displayOrPlaceholder(
  value: string | undefined,
  placeholder: string,
  showPlaceholder: boolean
): string {
  if (value && String(value).trim()) return String(value)
  return showPlaceholder ? placeholder : ""
}

export function placeholderTone(isEmpty: boolean): string {
  return isEmpty ? "opacity-55 italic text-white/70" : ""
}

export function placeholderToneLight(isEmpty: boolean): string {
  return isEmpty ? "opacity-55 italic text-gray-500" : ""
}

/** Stats render inside hero when both sections are on; otherwise standalone stats only if hero is off. */
export function shouldRenderStandaloneStats(layout: EPKData["layout"]): boolean {
  if (!isSectionVisible("stats", layout)) return false
  return !isSectionVisible("hero", layout)
}

export function statsBelongInHero(layout: EPKData["layout"]): boolean {
  return isSectionVisible("hero", layout) && isSectionVisible("stats", layout)
}

export function accentFromEditorTemplate(editorTemplate: string | undefined): "default" | "black" | "neon" | "sunset" {
  const t = String(editorTemplate || "").toLowerCase()
  if (t === "black") return "black"
  if (t === "neon") return "neon"
  if (t === "sunset") return "sunset"
  return "default"
}

export function formatEpkNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

export const EPK_SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  "one-liner": "One-Liner",
  bio: "Biography",
  stats: "Stats",
  music: "Music",
  shows: "Upcoming Shows",
  press: "Press",
  media: "Photos",
  contact: "Contact",
  social: "Social Links",
  booking: "Booking Assets",
}

export const EPK_SECTION_EDITOR_TAB: Record<string, string> = {
  hero: "overview",
  "one-liner": "settings",
  bio: "overview",
  stats: "overview",
  music: "music",
  shows: "shows",
  press: "press",
  media: "media",
  contact: "contact",
  social: "social",
  booking: "settings",
}
