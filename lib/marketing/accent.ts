export type AccentKey = "purple" | "blue" | "fuchsia" | "amber" | "emerald" | "rose" | "cyan"

export interface AccentStyle {
  text: string
  textSoft: string
  bg: string
  bgStrong: string
  border: string
  borderHover: string
  gradient: string
  gradientText: string
  glow: string
  solid: string
  ring: string
  hex: string
}

// Tailwind needs full static class names, so every accent is spelled out.
export const accents: Record<AccentKey, AccentStyle> = {
  purple: {
    text: "text-purple-300",
    textSoft: "text-purple-200/80",
    bg: "bg-purple-500/10",
    bgStrong: "bg-purple-500/20",
    border: "border-purple-400/25",
    borderHover: "hover:border-purple-400/50",
    gradient: "from-purple-500 to-fuchsia-500",
    gradientText: "from-purple-200 via-fuchsia-200 to-purple-300",
    glow: "bg-purple-600/30",
    solid: "bg-purple-500",
    ring: "focus-visible:ring-purple-300",
    hex: "#a855f7",
  },
  blue: {
    text: "text-blue-300",
    textSoft: "text-blue-200/80",
    bg: "bg-blue-500/10",
    bgStrong: "bg-blue-500/20",
    border: "border-blue-400/25",
    borderHover: "hover:border-blue-400/50",
    gradient: "from-blue-500 to-cyan-500",
    gradientText: "from-blue-200 via-cyan-200 to-blue-300",
    glow: "bg-blue-600/30",
    solid: "bg-blue-500",
    ring: "focus-visible:ring-blue-300",
    hex: "#3b82f6",
  },
  fuchsia: {
    text: "text-fuchsia-300",
    textSoft: "text-fuchsia-200/80",
    bg: "bg-fuchsia-500/10",
    bgStrong: "bg-fuchsia-500/20",
    border: "border-fuchsia-400/25",
    borderHover: "hover:border-fuchsia-400/50",
    gradient: "from-fuchsia-500 to-purple-500",
    gradientText: "from-fuchsia-200 via-pink-200 to-fuchsia-300",
    glow: "bg-fuchsia-600/30",
    solid: "bg-fuchsia-500",
    ring: "focus-visible:ring-fuchsia-300",
    hex: "#d946ef",
  },
  amber: {
    text: "text-amber-300",
    textSoft: "text-amber-200/80",
    bg: "bg-amber-500/10",
    bgStrong: "bg-amber-500/20",
    border: "border-amber-400/25",
    borderHover: "hover:border-amber-400/50",
    gradient: "from-amber-500 to-orange-500",
    gradientText: "from-amber-200 via-orange-200 to-amber-300",
    glow: "bg-amber-600/25",
    solid: "bg-amber-500",
    ring: "focus-visible:ring-amber-300",
    hex: "#f59e0b",
  },
  emerald: {
    text: "text-emerald-300",
    textSoft: "text-emerald-200/80",
    bg: "bg-emerald-500/10",
    bgStrong: "bg-emerald-500/20",
    border: "border-emerald-400/25",
    borderHover: "hover:border-emerald-400/50",
    gradient: "from-emerald-500 to-teal-500",
    gradientText: "from-emerald-200 via-teal-200 to-emerald-300",
    glow: "bg-emerald-600/25",
    solid: "bg-emerald-500",
    ring: "focus-visible:ring-emerald-300",
    hex: "#10b981",
  },
  rose: {
    text: "text-rose-300",
    textSoft: "text-rose-200/80",
    bg: "bg-rose-500/10",
    bgStrong: "bg-rose-500/20",
    border: "border-rose-400/25",
    borderHover: "hover:border-rose-400/50",
    gradient: "from-rose-500 to-orange-500",
    gradientText: "from-rose-200 via-orange-200 to-rose-300",
    glow: "bg-rose-600/25",
    solid: "bg-rose-500",
    ring: "focus-visible:ring-rose-300",
    hex: "#f43f5e",
  },
  cyan: {
    text: "text-cyan-300",
    textSoft: "text-cyan-200/80",
    bg: "bg-cyan-500/10",
    bgStrong: "bg-cyan-500/20",
    border: "border-cyan-400/25",
    borderHover: "hover:border-cyan-400/50",
    gradient: "from-cyan-500 to-blue-500",
    gradientText: "from-cyan-200 via-sky-200 to-cyan-300",
    glow: "bg-cyan-600/25",
    solid: "bg-cyan-500",
    ring: "focus-visible:ring-cyan-300",
    hex: "#06b6d4",
  },
}
