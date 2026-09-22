import type { EpkAppearance } from "@/lib/epk/epk-appearance"

const HEX = /^#[0-9a-f]{6}$/i

function channel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  if (!HEX.test(hex)) return 0
  const value = hex.slice(1)
  return (
    0.2126 * channel(Number.parseInt(value.slice(0, 2), 16)) +
    0.7152 * channel(Number.parseInt(value.slice(2, 4), 16)) +
    0.0722 * channel(Number.parseInt(value.slice(4, 6), 16))
  )
}

export function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (light + 0.05) / (dark + 0.05)
}

export function readableForeground(
  requested: string | null | undefined,
  background: string,
  minimum = 4.5,
): { color: string; corrected: boolean; ratio: number } {
  if (requested && HEX.test(requested)) {
    const ratio = contrastRatio(requested, background)
    if (ratio >= minimum) return { color: requested.toLowerCase(), corrected: false, ratio }
  }

  const blackRatio = contrastRatio("#111111", background)
  const whiteRatio = contrastRatio("#ffffff", background)
  const color = blackRatio >= whiteRatio ? "#111111" : "#ffffff"
  return {
    color,
    corrected: Boolean(requested),
    ratio: Math.max(blackRatio, whiteRatio),
  }
}

export function ensurePostContrast(
  appearance: EpkAppearance,
  fallbackBackground: string,
): { appearance: EpkAppearance; corrected: boolean; ratio: number } {
  const background = appearance.cardBackgroundHex ?? fallbackBackground
  const result = readableForeground(appearance.textColorCustomHex, background)
  return {
    appearance: {
      ...appearance,
      cardBackgroundHex: background,
      textColorCustomHex: result.color,
    },
    corrected: result.corrected,
    ratio: result.ratio,
  }
}
