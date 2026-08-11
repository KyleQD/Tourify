"use client"

import { useMemo } from "react"
import Link from "next/link"
import { AlertTriangle, Clock, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/admin/scheduling/ui/card"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { OpenShiftsSection } from "@/components/admin/scheduling/scheduling-open-shifts"

export function OpenShiftsView() {
  const { data } = useScheduling()
  const stats = useMemo(() => {
    const total = data.openShifts.length
    const high = data.openShifts.filter((s) => s.priority === "high").length
    const soonest = data.openShifts.map((s) => s.date).sort()[0]
    return { total, high, soonest }
  }, [data.openShifts])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={UserPlus} label="Open shifts" value={stats.total} accent="text-neon-purple" tint="bg-neon-purple/15" />
        <StatCard icon={AlertTriangle} label="High priority" value={stats.high} accent="text-neon-red" tint="bg-neon-red/15" />
        <StatCard
          icon={Clock}
          label="Earliest gap"
          value={stats.soonest ? new Date(`${stats.soonest}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "None"}
          accent="text-neon-amber"
          tint="bg-neon-amber/15"
        />
      </div>

      {stats.total === 0 ? (
        <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              No open shifts right now. Check the roster for assignable staff, then publish gaps from the week grid.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/dashboard/roster">Open roster</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <OpenShiftsSection />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  tint,
}: {
  icon: typeof UserPlus
  label: string
  value: string | number
  accent: string
  tint: string
}) {
  return (
    <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
      <CardContent className="flex items-center gap-3 p-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", tint, accent)}>
          <Icon className="size-4" />
        </span>
        <div className="flex flex-col">
          <span className={cn("text-lg font-semibold", accent)}>{value}</span>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
