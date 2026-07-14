import {
  AlertTriangle,
  CalendarClock,
  CircleDashed,
  Hourglass,
  UserCheck,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/admin/scheduling/ui/card"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"

interface Metric {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  accent: string
  glow: string
}

export function OverviewCards() {
  const { data } = useScheduling()
  const assigned = data.shifts.filter((shift) => shift.assignedStaff).length
  const confirmed = data.shifts.filter((shift) => shift.status === "confirmed").length
  const eventCount = new Set(data.shifts.map((shift) => shift.eventName)).size
  const pending = data.shifts.filter((shift) => shift.status === "pending" || shift.status === "published").length
  const critical = data.conflicts.filter((conflict) => conflict.severity === "critical").length
  const metrics: Metric[] = [
    {
      label: "Shifts This Week",
      value: String(data.shifts.length),
      hint: `across ${eventCount || data.events.length || 0} events`,
      icon: CalendarClock,
      accent: "text-neon-purple",
      glow: "shadow-[inset_0_0_0_1px_var(--color-neon-purple)]",
    },
    {
      label: "Confirmed Staff",
      value: String(confirmed),
      hint: `of ${assigned} assigned`,
      icon: UserCheck,
      accent: "text-neon-green",
      glow: "shadow-[inset_0_0_0_1px_var(--color-neon-green)]",
    },
    {
      label: "Open Shifts",
      value: String(data.openShifts.length),
      hint: "need coverage",
      icon: CircleDashed,
      accent: "text-neon-cyan",
      glow: "shadow-[inset_0_0_0_1px_var(--color-neon-cyan)]",
    },
    {
      label: "Conflicts",
      value: String(critical),
      hint: data.conflicts.length > critical ? `${data.conflicts.length} total` : "require attention",
      icon: AlertTriangle,
      accent: "text-neon-red",
      glow: "shadow-[inset_0_0_0_1px_var(--color-neon-red)]",
    },
    {
      label: "Pending Responses",
      value: String(pending),
      hint: "awaiting confirm",
      icon: Hourglass,
      accent: "text-neon-amber",
      glow: "shadow-[inset_0_0_0_1px_var(--color-neon-amber)]",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="relative overflow-hidden border-border/60 bg-card/70 py-0 backdrop-blur transition-colors hover:border-border"
        >
          <span
            className={cn("pointer-events-none absolute inset-0 opacity-[0.06]", metric.glow)}
            aria-hidden
          />
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
              <metric.icon className={cn("size-4", metric.accent)} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {metric.value}
              </span>
              <span className="text-[11px] text-muted-foreground">{metric.hint}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
