"use client"

import { CalendarDays, MapPin, Sparkles, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { toAssignTarget, useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  departmentAccent,
  formatDate,
  formatTime,
  priorityMeta,
} from "@/components/admin/scheduling/scheduling-data"

export function OpenShiftsSection() {
  const { data, openAssign } = useScheduling()
  return (
    <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
      <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 p-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="flex size-6 items-center justify-center rounded-md bg-neon-purple/15 text-neon-purple">
              <UserPlus className="size-3.5" />
            </span>
            Unassigned Shifts
          </CardTitle>
          <CardDescription className="text-xs">
            Open roles that still need crew coverage.
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-neon-purple/40 bg-neon-purple/10 text-neon-purple">
          {data.openShifts.length} open
        </Badge>
      </CardHeader>

      <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
        {data.openShifts.map((shift) => {
          const accent = departmentAccent[shift.department]
          const priority = priorityMeta[shift.priority]
          return (
            <div
              key={shift.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border bg-background/40 p-3 transition-colors hover:bg-card",
                accent.border,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", accent.dot)} aria-hidden />
                    <span className={cn("truncate text-sm font-semibold", accent.text)}>
                      {shift.role}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {shift.eventName}
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", priority.className)}>
                  {priority.label}
                </Badge>
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3" /> {shift.venueName}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3" /> {formatDate(shift.date)} ·{" "}
                  {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="size-3 shrink-0 text-neon-cyan" />
                  <span className="truncate">{shift.suggestedStaff.join(", ")}</span>
                </span>
                <Button
                  size="xs"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => openAssign(toAssignTarget(shift))}
                >
                  Assign
                </Button>
              </div>
            </div>
          )
        })}
        {data.openShifts.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
            No open shifts for this event and week.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
