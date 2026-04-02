import { cn } from "@/lib/utils"

export const dashboardCreatePattern = {
  modalContent:
    "max-w-5xl rounded-2xl sm:rounded-2xl border-slate-700/60 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl",
  shell: "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4 md:p-6",
  headerIcon:
    "rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2 text-purple-300",
  stepRail: "grid grid-cols-2 gap-2 md:grid-cols-5",
  stepPill:
    "rounded-xl border px-3 py-2 text-xs font-medium transition-colors md:text-sm",
  panel:
    "rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 md:p-5",
  fieldGroup: "space-y-2",
  subtleText: "text-sm text-slate-400",
  footer:
    "sticky bottom-0 z-10 mt-6 flex items-center justify-between gap-3 border-t border-slate-700/60 bg-slate-950/90 px-1 py-4 backdrop-blur",
  input:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50",
  selectTrigger:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus:ring-purple-500/50",
  tag:
    "cursor-pointer border border-purple-400/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20",
  btnPrimary:
    "rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500",
  btnOutline:
    "rounded-xl border-slate-600 bg-slate-900 text-white hover:bg-slate-800",
} as const

interface GetStepPillClassesArgs {
  isActive: boolean
  isComplete: boolean
}

export function getStepPillClasses({ isActive, isComplete }: GetStepPillClassesArgs) {
  return cn(
    dashboardCreatePattern.stepPill,
    "border-slate-700/70 text-slate-400",
    isComplete && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    isActive && "border-purple-500/50 bg-purple-500/15 text-white"
  )
}
