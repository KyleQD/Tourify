"use client"

import {
  AlertOctagon,
  AlertTriangle,
  BadgeAlert,
  CalendarX2,
  Clock4,
  Layers,
  MapPinOff,
  ShieldAlert,
  Users,
  UserX,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  priorityMeta,
  type ConflictType,
  type SchedulingConflict,
} from "@/components/admin/scheduling/scheduling-data"

const typeIcon: Record<ConflictType, LucideIcon> = {
  "double-booked": UserX,
  "missing-role": CalendarX2,
  "outside-availability": AlertOctagon,
  "missing-credential": BadgeAlert,
  understaffed: Users,
  "pending-late": Clock4,
  overlapping: Layers,
  "no-venue": MapPinOff,
  "wrong-department": ShieldAlert,
}

export function ConflictsPanel() {
  const { data, openResolve } = useScheduling()
  const critical = data.conflicts.filter((c) => c.severity === "critical").length

  return (
    <Card className="flex h-full flex-col border-neon-red/25 bg-card/70 py-0 backdrop-blur">
      <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 p-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="flex size-6 items-center justify-center rounded-md bg-neon-red/15 text-neon-red">
              <AlertTriangle className="size-3.5" />
            </span>
            Conflicts & Warnings
          </CardTitle>
          <CardDescription className="text-xs">Resolve before publishing.</CardDescription>
        </div>
        <Badge variant="outline" className="border-neon-red/40 bg-neon-red/10 text-neon-red">
          {critical} critical
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 p-4">
        {data.conflicts.map((conflict) => {
          const Icon = typeIcon[conflict.type]
          const priority = priorityMeta[conflict.severity]
          const isCritical = conflict.severity === "critical"
          return (
            <div
              key={conflict.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border bg-background/40 p-2.5",
                isCritical ? "border-neon-red/40" : "border-neon-amber/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                  isCritical ? "bg-neon-red/15 text-neon-red" : "bg-neon-amber/15 text-neon-amber",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{conflict.title}</p>
                  <Badge variant="outline" className={cn("text-[10px]", priority.className)}>
                    {priority.label}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {conflict.detail}
                </p>
              </div>
              <Button
                size="xs"
                variant="ghost"
                className="shrink-0 text-[11px]"
                onClick={() => openResolve(conflict)}
              >
                Resolve
              </Button>
            </div>
          )
        })}
        {data.conflicts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
            No conflicts detected for this schedule.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
