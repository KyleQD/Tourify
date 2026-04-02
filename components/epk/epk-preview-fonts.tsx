"use client"

import { Inter, Playfair_Display, Space_Grotesk, Bebas_Neue, JetBrains_Mono } from "next/font/google"
import type { EpkFontId } from "@/lib/epk/epk-preview-utils"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" })
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], display: "swap" })

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
    case "sans":
    default:
      return inter.className
  }
}
