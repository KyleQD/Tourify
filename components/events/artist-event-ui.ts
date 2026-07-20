import { cn } from "@/lib/utils"

export const artistEventUI = {
  page:
    "relative min-h-screen overflow-hidden bg-slate-950 text-white",
  pageGlow:
    "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,6,23,0.94))]",
  shell:
    "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8",
  headerPanel:
    "overflow-hidden rounded-[1.75rem] border border-slate-700/60 bg-slate-950/70 p-5 shadow-2xl shadow-purple-950/20 backdrop-blur-xl sm:p-6",
  panel:
    "rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 shadow-xl shadow-slate-950/30 backdrop-blur-xl",
  panelPadded:
    "rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl sm:p-5",
  inset:
    "rounded-xl border border-slate-800/80 bg-slate-950/55",
  interactive:
    "transition-all duration-200 hover:border-cyan-400/30 hover:bg-slate-900/70 hover:shadow-lg hover:shadow-cyan-950/20",
  iconWell:
    "flex shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  title:
    "text-2xl font-bold tracking-tight text-white sm:text-3xl",
  subtitle:
    "text-sm leading-6 text-slate-300",
  eyebrow:
    "rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200",
  muted:
    "text-sm text-slate-400",
  label:
    "text-xs font-medium uppercase tracking-[0.16em] text-slate-500",
  input:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25",
  textarea:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25",
  select:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus:ring-cyan-500/25",
  buttonPrimary:
    "rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-white shadow-lg shadow-cyan-950/20 hover:bg-cyan-400/20",
  buttonAccent:
    "rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/25 hover:from-cyan-400 hover:to-blue-500",
  buttonOutline:
    "rounded-xl border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-400/40 hover:bg-slate-900 hover:text-white",
  buttonGhost:
    "rounded-xl text-slate-400 hover:bg-white/10 hover:text-white",
  buttonDanger:
    "rounded-xl border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200",
  dialog:
    "rounded-2xl border border-slate-700/70 bg-slate-950/95 text-white shadow-2xl shadow-purple-950/20 backdrop-blur-xl",
  tabsList:
    "flex h-auto w-full gap-2 overflow-x-auto rounded-[1.25rem] border border-slate-700/60 bg-slate-950/65 p-2 shadow-xl shadow-slate-950/30 backdrop-blur-xl",
  tabsTrigger:
    "min-w-fit rounded-xl px-3 py-2 text-slate-400 transition data-[state=active]:border data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white",
  empty:
    "flex flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-slate-700/70 bg-slate-950/45 p-10 text-center",
} as const

export const artistEventStatusClass = (status?: string) => {
  switch (status) {
    case "published":
    case "ready":
    case "accepted":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    case "draft":
    case "invited":
    case "pending":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200"
    case "cancelled":
    case "declined":
    case "blocked":
      return "border-red-500/40 bg-red-500/10 text-red-200"
    case "in_progress":
    case "upcoming":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
    case "completed":
    case "settled":
      return "border-slate-500/40 bg-slate-500/10 text-slate-200"
    default:
      return "border-slate-600/60 bg-slate-800/50 text-slate-300"
  }
}

export const artistEventTone = (tone: "cyan" | "purple" | "emerald" | "amber" | "red" | "slate") =>
  cn(
    "border",
    tone === "cyan" && "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    tone === "purple" && "border-purple-400/30 bg-purple-400/10 text-purple-200",
    tone === "emerald" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    tone === "amber" && "border-amber-400/30 bg-amber-400/10 text-amber-200",
    tone === "red" && "border-red-400/30 bg-red-400/10 text-red-200",
    tone === "slate" && "border-slate-700/70 bg-slate-900/70 text-slate-300",
  )
