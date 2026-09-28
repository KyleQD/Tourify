"use client"

import type { EpkFontId } from "@/lib/epk/epk-preview-utils"

// Keep previews self-contained so production builds do not depend on a network
// request to Google Fonts. The CSS stacks preserve each style's intent and use
// locally available system fonts when the named face is installed.
const fontClassById: Record<EpkFontId, string> = {
  sans: "epk-font-sans",
  serif: "epk-font-serif",
  display: "epk-font-display",
  geometric: "epk-font-geometric",
  mono: "epk-font-mono",
  editorial: "epk-font-editorial",
  condensed: "epk-font-condensed",
  soft: "epk-font-soft",
  slab: "epk-font-slab",
  wide: "epk-font-wide",
}

export function epkFontClass(id: EpkFontId | undefined): string {
  return fontClassById[id ?? "sans"]
}

/** Map of font id → className for gallery previews without remounting loaders. */
export const EPK_FONT_CLASS_BY_ID = fontClassById
