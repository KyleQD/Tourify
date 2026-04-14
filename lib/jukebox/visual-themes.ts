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
]

export function getTheme(id: string): JukeboxVisualTheme {
  return JUKEBOX_THEMES.find((t) => t.id === id) || JUKEBOX_THEMES[0]
}
