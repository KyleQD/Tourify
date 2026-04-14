/**
 * Storefront theme system.
 *
 * Sellers pick a preset (or go custom) in their dashboard;
 * the public profile storefront section renders using these tokens.
 */

export interface StorefrontThemeConfig {
  preset: string
  accentColor: string
  cardStyle: "glass" | "solid" | "outline" | "neon"
  layout: "grid" | "masonry" | "list" | "carousel"
  effects: {
    animateCards: boolean
    glowBorder: boolean
    hoverLift: boolean
    shimmerImages: boolean
    floatingOrbs: boolean
    gradientText: boolean
    staggerEntrance: boolean
  }
  bannerGradient: string
  bannerStyle: "gradient" | "solid" | "image" | "none"
  fontStyle: "default" | "elegant" | "bold" | "mono"
}

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeConfig = {
  preset: "midnight",
  accentColor: "#a855f7",
  cardStyle: "glass",
  layout: "grid",
  effects: {
    animateCards: true,
    glowBorder: false,
    hoverLift: true,
    shimmerImages: false,
    floatingOrbs: false,
    gradientText: false,
    staggerEntrance: true,
    },
  bannerGradient: "from-purple-950 via-slate-950 to-black",
  bannerStyle: "gradient",
  fontStyle: "default",
}

export interface StorefrontThemePreset {
  id: string
  name: string
  description: string
  theme: StorefrontThemeConfig
}

export const STOREFRONT_THEME_PRESETS: StorefrontThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep purples and dark glass",
    theme: { ...DEFAULT_STOREFRONT_THEME },
  },
  {
    id: "neon-glow",
    name: "Neon Glow",
    description: "Electric borders and glowing accents",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "neon-glow",
      accentColor: "#06b6d4",
      cardStyle: "neon",
      effects: {
        ...DEFAULT_STOREFRONT_THEME.effects,
        glowBorder: true,
        shimmerImages: true,
        floatingOrbs: true,
        gradientText: true,
      },
      bannerGradient: "from-cyan-950 via-slate-950 to-black",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges and pinks",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "sunset",
      accentColor: "#f97316",
      cardStyle: "glass",
      effects: {
        ...DEFAULT_STOREFRONT_THEME.effects,
        hoverLift: true,
        floatingOrbs: true,
        gradientText: true,
      },
      bannerGradient: "from-orange-950 via-rose-950 to-black",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Rich greens and deep shadows",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "emerald",
      accentColor: "#10b981",
      cardStyle: "solid",
      effects: {
        ...DEFAULT_STOREFRONT_THEME.effects,
        hoverLift: true,
        staggerEntrance: true,
      },
      bannerGradient: "from-emerald-950 via-slate-950 to-black",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    description: "Elegant pinks with warm metallic tones",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "rose-gold",
      accentColor: "#f43f5e",
      cardStyle: "glass",
      fontStyle: "elegant",
      effects: {
        ...DEFAULT_STOREFRONT_THEME.effects,
        glowBorder: true,
        hoverLift: true,
        gradientText: true,
      },
      bannerGradient: "from-rose-950 via-pink-950 to-black",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Clean black and white, no distractions",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "monochrome",
      accentColor: "#ffffff",
      cardStyle: "outline",
      fontStyle: "mono",
      effects: {
        animateCards: false,
        glowBorder: false,
        hoverLift: true,
        shimmerImages: false,
        floatingOrbs: false,
        gradientText: false,
        staggerEntrance: false,
      },
      bannerGradient: "from-neutral-950 via-neutral-900 to-black",
      bannerStyle: "solid",
    },
  },
  {
    id: "galaxy",
    name: "Galaxy",
    description: "Cosmic gradients and floating particles",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "galaxy",
      accentColor: "#8b5cf6",
      cardStyle: "glass",
      effects: {
        animateCards: true,
        glowBorder: true,
        hoverLift: true,
        shimmerImages: true,
        floatingOrbs: true,
        gradientText: true,
        staggerEntrance: true,
      },
      bannerGradient: "from-violet-950 via-indigo-950 to-black",
    },
  },
  {
    id: "fire",
    name: "Fire",
    description: "Bold reds and amber energy",
    theme: {
      ...DEFAULT_STOREFRONT_THEME,
      preset: "fire",
      accentColor: "#ef4444",
      cardStyle: "neon",
      fontStyle: "bold",
      effects: {
        ...DEFAULT_STOREFRONT_THEME.effects,
        glowBorder: true,
        floatingOrbs: true,
        gradientText: true,
      },
      bannerGradient: "from-red-950 via-amber-950 to-black",
    },
  },
]

export function getStorefrontTheme(config: Partial<StorefrontThemeConfig> | null | undefined): StorefrontThemeConfig {
  if (!config) return DEFAULT_STOREFRONT_THEME
  const preset = STOREFRONT_THEME_PRESETS.find(p => p.id === config.preset)
  const base = preset?.theme ?? DEFAULT_STOREFRONT_THEME
  return {
    ...base,
    ...config,
    effects: { ...base.effects, ...(config.effects || {}) },
  }
}

export function getCardStyleClasses(style: StorefrontThemeConfig["cardStyle"], accentColor: string): string {
  const base = "overflow-hidden rounded-2xl transition-all duration-300"
  switch (style) {
    case "glass":
      return `${base} border border-white/10 bg-white/[0.04] backdrop-blur-sm`
    case "solid":
      return `${base} border border-white/10 bg-slate-900/80`
    case "outline":
      return `${base} border-2 border-white/20 bg-transparent`
    case "neon":
      return `${base} border border-white/10 bg-black/40 backdrop-blur-sm`
    default:
      return `${base} border border-white/10 bg-white/[0.04] backdrop-blur-sm`
  }
}

export function getFontStyleClasses(fontStyle: StorefrontThemeConfig["fontStyle"]): string {
  switch (fontStyle) {
    case "elegant":
      return "tracking-wide"
    case "bold":
      return "font-black tracking-tight"
    case "mono":
      return "font-mono"
    default:
      return ""
  }
}

export function getLayoutClasses(layout: StorefrontThemeConfig["layout"]): string {
  switch (layout) {
    case "grid":
      return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    case "masonry":
      return "columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid"
    case "list":
      return "flex flex-col gap-3"
    case "carousel":
      return "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
    default:
      return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
  }
}
