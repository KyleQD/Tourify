"use client"

import {
  Inter,
  Playfair_Display,
  Space_Grotesk,
  Bebas_Neue,
  JetBrains_Mono,
  Cormorant_Garamond,
  Oswald,
  Outfit,
  Roboto_Slab,
  Archivo,
} from "next/font/google"
import type { EpkFontId } from "@/lib/epk/epk-preview-utils"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" })
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], display: "swap" })
const cormorant = Cormorant_Garamond({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
})
const oswald = Oswald({ subsets: ["latin"], display: "swap" })
const outfit = Outfit({ subsets: ["latin"], display: "swap" })
const robotoSlab = Roboto_Slab({ subsets: ["latin"], display: "swap" })
const archivo = Archivo({ subsets: ["latin"], display: "swap" })

export function epkFontClass(id: EpkFontId | undefined): string {
  switch (id) {
    case "serif":
      return playfair.className
    case "display":
      return bebas.className
    case "geometric":
      return spaceGrotesk.className
    case "mono":
      return jetbrains.className
    case "editorial":
      return cormorant.className
    case "condensed":
      return oswald.className
    case "soft":
      return outfit.className
    case "slab":
      return robotoSlab.className
    case "wide":
      return archivo.className
    case "sans":
    default:
      return inter.className
  }
}

/** Map of font id → className for gallery previews without remounting loaders. */
export const EPK_FONT_CLASS_BY_ID: Record<EpkFontId, string> = {
  sans: inter.className,
  serif: playfair.className,
  display: bebas.className,
  geometric: spaceGrotesk.className,
  mono: jetbrains.className,
  editorial: cormorant.className,
  condensed: oswald.className,
  soft: outfit.className,
  slab: robotoSlab.className,
  wide: archivo.className,
}
