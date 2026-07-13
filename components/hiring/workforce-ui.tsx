import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkforcePageShellProps {
  children: React.ReactNode
  className?: string
}

interface WorkforceHeroProps {
  eyebrow?: string
  title: string
  description: string
  badge?: string
  actions?: React.ReactNode
}

interface WorkforcePanelProps {
  children: React.ReactNode
  className?: string
}

interface WorkforceMetricCardProps {
  label: string
  value: string | number
  description?: string
  icon: LucideIcon
  accent?: "purple" | "blue" | "cyan" | "green" | "amber"
  isLoading?: boolean
}

interface WorkforceEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

const ACCENT_CLASSES = {
  purple: "bg-purple-500/10 text-purple-300 shadow-purple-500/10",
  blue: "bg-blue-500/10 text-blue-300 shadow-blue-500/10",
  cyan: "bg-cyan-500/10 text-cyan-300 shadow-cyan-500/10",
  green: "bg-emerald-500/10 text-emerald-300 shadow-emerald-500/10",
  amber: "bg-amber-500/10 text-amber-300 shadow-amber-500/10",
}

export function WorkforcePageShell({ children, className }: WorkforcePageShellProps) {
  return (
    <main className={cn("relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))]" />
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </main>
  )
}

export function WorkforceHero({ eyebrow = "Workforce", title, description, badge, actions }: WorkforceHeroProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-purple-950/20 backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              {eyebrow}
            </span>
            {badge ? (
              <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-100">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export function WorkforcePanel({ children, className }: WorkforcePanelProps) {
  return (
    <div className={cn("rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 shadow-xl shadow-slate-950/30 backdrop-blur-xl", className)}>
      {children}
    </div>
  )
}

export function WorkforceMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent = "blue",
  isLoading = false,
}: WorkforceMetricCardProps) {
  return (
    <div className="rounded-[1.25rem] border border-slate-700/60 bg-slate-950/70 p-4 shadow-lg shadow-slate-950/30 transition-colors hover:border-slate-500/70">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white">{isLoading ? "..." : value}</p>
          {description ? <p className="truncate text-xs text-slate-400">{description}</p> : null}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg", ACCENT_CLASSES[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export function WorkforceEmptyState({ icon: Icon, title, description, action, className }: WorkforceEmptyStateProps) {
  return (
    <div className={cn("flex min-h-[260px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-700/70 bg-slate-900/35 p-8 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
