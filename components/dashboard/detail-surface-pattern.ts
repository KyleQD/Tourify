import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import { cn } from "@/lib/utils"

/**
 * Shared glass styling for detail sheets, management dialogs, and section panels.
 * Presentation-only — apply via className; do not change component APIs.
 */
export const detailSurfacePattern = {
  sheetContent:
    "border-l border-white/10 bg-slate-950/95 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl",
  dialogContent:
    "rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-2xl",
  topAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent",
  panel:
    "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  panelMuted:
    "rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl",
  headerIcon:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-purple-500/20 to-fuchsia-400/20 ring-1 ring-white/10",
  sectionLabel: "mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400",
  title: "text-white",
  description: "text-slate-400",
  subtleText: "text-sm text-slate-400",
  btnPrimary: dashboardCreatePattern.btnPrimary,
  btnOutline:
    "rounded-xl border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white",
  btnDestructive:
    "rounded-xl border border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/25 hover:text-red-100",
  badge:
    "rounded-full border-transparent bg-purple-500/20 text-purple-200 hover:bg-purple-500/30",
  badgeOutline:
    "rounded-full border-white/15 bg-transparent text-slate-300",
  badgeSoft:
    "rounded-full border border-white/10 bg-white/5 text-slate-200",
  badgeSuccess:
    "rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  badgeWarning:
    "rounded-full border border-amber-400/30 bg-amber-500/15 text-amber-200",
  input: dashboardCreatePattern.input,
  selectTrigger: dashboardCreatePattern.selectTrigger,
  textarea:
    "rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50",
  avatarRing: "ring-2 ring-white/10 ring-offset-2 ring-offset-slate-950",
  avatarFallback:
    "bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-white",
  listRow:
    "rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]",
  tabsList:
    "h-auto w-full justify-start gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1",
  tabsTrigger:
    "rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white",
  footer:
    "flex items-center justify-end gap-2 border-t border-white/10 bg-slate-950/80 pt-4 backdrop-blur",
  label: "text-slate-300",
} as const

interface GetStatusBadgeClassesArgs {
  status?: string | null
}

export function getStatusBadgeClasses({ status }: GetStatusBadgeClassesArgs) {
  const normalized = (status ?? "").toLowerCase()

  if (["active", "approved", "completed", "hired"].includes(normalized))
    return cn(detailSurfacePattern.badgeSuccess)

  if (["inactive", "pending", "invited", "submitted", "draft"].includes(normalized))
    return cn(detailSurfacePattern.badgeOutline)

  if (["offboarded", "rejected", "cancelled", "failed"].includes(normalized))
    return cn(detailSurfacePattern.btnDestructive, "px-2.5 py-0.5 text-xs font-semibold")

  return cn(detailSurfacePattern.badge)
}
