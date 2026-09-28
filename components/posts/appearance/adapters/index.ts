import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"

/**
 * Per-template layout config for post cards.
 *
 * All 19 EPK skins currently use UniversalPostAdapter with a layout hint.
 * This registry is the extension point for full per-template customization.
 *
 * Layout variants:
 *   standard   — balanced padding, neutral chrome
 *   editorial  — accent border-left on author row, wider content padding
 *   minimal    — tight padding, no ring shadow
 *   bold       — ring highlight, stronger author area
 */
export interface TemplateAdapterConfig {
  skinId: EpkSkinId | string
  layout: "standard" | "editorial" | "minimal" | "bold"
}

export const TEMPLATE_ADAPTER_CONFIGS: Record<string, TemplateAdapterConfig> = {
  // ── Premiere post-native styles ──────────────────────────────────
  "16-bit-sprite": { skinId: "bold", layout: "bold" },
  terminal:         { skinId: "minimal", layout: "minimal" },
  risograph:        { skinId: "classic", layout: "editorial" },
  "cmyk-dots":     { skinId: "gallery", layout: "minimal" },
  "halftone-print": { skinId: "poster", layout: "bold" },
  "dithered-1-bit": { skinId: "minimal", layout: "minimal" },
  "punk-collage":  { skinId: "poster", layout: "bold" },
  "bootleg-pixel": { skinId: "modern", layout: "bold" },
  // ── Base templates ────────────────────────────────────────────────
  modern:       { skinId: "modern",       layout: "standard" },
  classic:      { skinId: "classic",      layout: "editorial" },
  minimal:      { skinId: "minimal",      layout: "minimal" },
  bold:         { skinId: "bold",         layout: "bold" },
  cinema:       { skinId: "cinema",       layout: "editorial" },
  gallery:      { skinId: "gallery",      layout: "minimal" },
  luxe:         { skinId: "luxe",         layout: "editorial" },
  poster:       { skinId: "poster",       layout: "bold" },
  coastal:      { skinId: "coastal",      layout: "standard" },
  // ── Reference templates ───────────────────────────────────────────
  scrapbook:    { skinId: "scrapbook",    layout: "editorial" },
  bandcard:     { skinId: "bandcard",     layout: "bold" },
  dossier:      { skinId: "dossier",      layout: "editorial" },
  pressgrid:    { skinId: "pressgrid",    layout: "minimal" },
  redcolumn:    { skinId: "redcolumn",    layout: "editorial" },
  checkerboard: { skinId: "checkerboard", layout: "bold" },
  editorial:    { skinId: "editorial",    layout: "editorial" },
  whitespace:   { skinId: "whitespace",   layout: "minimal" },
  colorblock:   { skinId: "colorblock",   layout: "bold" },
  sunburst:     { skinId: "sunburst",     layout: "standard" },
  // ── Page Appearance templates ────────────────────────────────────
  "cinematic-marquee": { skinId: "cinema", layout: "editorial" },
  "editorial-cover":   { skinId: "classic", layout: "editorial" },
  "analog-rave":       { skinId: "poster", layout: "bold" },
  "swiss-signal":      { skinId: "minimal", layout: "minimal" },
  "backstage-pass":    { skinId: "luxe", layout: "bold" },
  "audio-console":     { skinId: "bold", layout: "standard" },
}

export function getAdapterConfig(templateId: string): TemplateAdapterConfig | undefined {
  return TEMPLATE_ADAPTER_CONFIGS[templateId]
}
