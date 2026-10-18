export type ArtVariant = "static" | "spin" | "pulse" | "float" | "glitch" | "bounce"

export interface JukeboxVisualTheme {
  id: string
  name: string
  description: string
  artVariant: ArtVariant
  progressGradient: string
  barBorderClass: string
  barBgClass: string
  previewGradient: string
  /** Optional surface treatment for the dashboard jukebox skin. */
  widgetSurfaceClass?: string
}

export const JUKEBOX_THEMES: JukeboxVisualTheme[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean and minimal",
    artVariant: "static",
    progressGradient: "from-purple-500 to-pink-500",
    barBorderClass: "border-white/10",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-purple-600 to-pink-600",
  },
  {
    id: "neon",
    name: "Neon Glow",
    description: "Electric neon pulses",
    artVariant: "pulse",
    progressGradient: "from-cyan-400 to-purple-500",
    barBorderClass: "border-cyan-500/30",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-cyan-400 to-purple-600",
  },
  {
    id: "vinyl",
    name: "Vinyl",
    description: "Classic spinning record",
    artVariant: "spin",
    progressGradient: "from-orange-400 to-amber-500",
    barBorderClass: "border-amber-500/20",
    barBgClass: "bg-stone-950/95",
    previewGradient: "from-orange-500 to-amber-600",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Northern lights flow",
    artVariant: "float",
    progressGradient: "from-emerald-400 to-teal-500",
    barBorderClass: "border-emerald-500/20",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-emerald-400 to-teal-600",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Retro grid horizon",
    artVariant: "glitch",
    progressGradient: "from-pink-500 to-yellow-400",
    barBorderClass: "border-pink-500/25",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-pink-500 to-yellow-500",
  },
  {
    id: "particles",
    name: "Particles",
    description: "Floating light motes",
    artVariant: "pulse",
    progressGradient: "from-violet-500 to-indigo-500",
    barBorderClass: "border-violet-500/20",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-violet-500 to-indigo-600",
  },
  {
    id: "retrojukebox",
    name: "Retro Jukebox",
    description: "Old school neon, sound reactive",
    artVariant: "bounce",
    progressGradient: "from-red-500 via-amber-400 to-cyan-400",
    barBorderClass: "border-red-500/25",
    barBgClass: "bg-[#0a0810]/95",
    previewGradient: "from-red-500 via-amber-400 to-cyan-400",
  },
  {
    id: "cassette",
    name: "Cassette Deck",
    description: "Tape-deck nostalgia and warm amber LEDs",
    artVariant: "bounce",
    progressGradient: "from-orange-500 to-amber-300",
    barBorderClass: "border-orange-400/30",
    barBgClass: "bg-stone-950/95",
    previewGradient: "from-stone-700 via-orange-600 to-amber-400",
    widgetSurfaceClass: "bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950",
  },
  {
    id: "disco",
    name: "Disco Fever",
    description: "Mirrorball sparkle and magenta dancefloor",
    artVariant: "spin",
    progressGradient: "from-fuchsia-400 via-pink-400 to-yellow-300",
    barBorderClass: "border-fuchsia-400/30",
    barBgClass: "bg-violet-950/95",
    previewGradient: "from-violet-600 via-fuchsia-500 to-amber-300",
    widgetSurfaceClass: "bg-gradient-to-br from-violet-950 via-fuchsia-950 to-slate-950",
  },
  {
    id: "sunset",
    name: "Coastal Sunset",
    description: "Golden-hour warmth and West Coast color",
    artVariant: "float",
    progressGradient: "from-amber-300 via-orange-400 to-rose-500",
    barBorderClass: "border-orange-400/25",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-amber-400 via-orange-500 to-rose-600",
    widgetSurfaceClass: "bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950",
  },
  {
    id: "djdeck",
    name: "DJ Deck",
    description: "Club mixer with electric signal lights",
    artVariant: "spin",
    progressGradient: "from-lime-400 to-cyan-400",
    barBorderClass: "border-lime-400/25",
    barBgClass: "bg-zinc-950/95",
    previewGradient: "from-zinc-700 via-lime-500 to-cyan-500",
    widgetSurfaceClass: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-teal-950",
  },
  {
    id: "y2k",
    name: "Y2K Chrome",
    description: "Holographic highlights and digital nostalgia",
    artVariant: "glitch",
    progressGradient: "from-sky-300 via-violet-400 to-pink-400",
    barBorderClass: "border-sky-300/30",
    barBgClass: "bg-slate-950/95",
    previewGradient: "from-sky-300 via-violet-500 to-pink-400",
    widgetSurfaceClass: "bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Understated charcoal and focused listening",
    artVariant: "static",
    progressGradient: "from-slate-200 to-slate-400",
    barBorderClass: "border-white/10",
    barBgClass: "bg-zinc-950/95",
    previewGradient: "from-zinc-700 to-zinc-900",
    widgetSurfaceClass: "bg-gradient-to-br from-zinc-950 to-zinc-900",
  },
]

export function getTheme(id: string): JukeboxVisualTheme {
  return JUKEBOX_THEMES.find((t) => t.id === id) || JUKEBOX_THEMES[0]
}
