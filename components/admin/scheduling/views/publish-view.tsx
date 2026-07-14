"use client"

import { useMemo, useState } from "react"
import { Bell, CheckCircle2, Circle, Send, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Separator } from "@/components/admin/scheduling/ui/separator"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { formatDate, formatTime, statusMeta } from "@/components/admin/scheduling/scheduling-data"

export function PublishView() {
  const { data, openPublish } = useScheduling()
  const [checklist, setChecklist] = useState([
    { id: "c1", label: "All critical conflicts resolved", done: false },
    { id: "c2", label: "Open shifts reviewed", done: false },
    { id: "c3", label: "Crew notified of pending invites", done: false },
  ])

  const pendingShifts = useMemo(
    () => data.shifts.filter((s) => s.status === "pending" || s.status === "published" || s.status === "draft"),
    [data.shifts],
  )

  const stats = useMemo(() => {
    const pending = pendingShifts.length
    const criticalConflicts = data.conflicts.filter((c) => c.severity === "critical").length
    const open = data.openShifts.length
    return { pending, criticalConflicts, open, changes: pending }
  }, [data.conflicts, data.openShifts.length, pendingShifts.length])

  const ready = stats.criticalConflicts === 0
  const toggle = (id: string) =>
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          "border bg-card/70 backdrop-blur",
          ready ? "border-neon-green/40" : "border-neon-red/40",
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                ready ? "bg-neon-green/15 text-neon-green" : "bg-neon-red/15 text-neon-red",
              )}
            >
              {ready ? <CheckCircle2 className="size-5" /> : <TriangleAlert className="size-5" />}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {ready ? "Schedule ready to publish" : "Resolve critical conflicts first"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {stats.changes} pending invites · {stats.open} open shifts · {stats.criticalConflicts} critical
                conflicts
              </p>
            </div>
          </div>
          <Button
            onClick={openPublish}
            disabled={!ready || pendingShifts.length === 0}
            className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
          >
            <Send data-icon="inline-start" />
            Publish schedule
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
          <CardHeader className="border-b border-border/60 p-4">
            <CardTitle className="text-sm">Pending changes</CardTitle>
            <CardDescription className="text-xs">
              Shifts awaiting worker confirmation or publish notification.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4">
            {pendingShifts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending shift invites in this week.</p>
            ) : (
              pendingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {shift.title || shift.role} · {shift.assignedStaff?.name ?? "Unassigned"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(shift.date)} · {formatTime(shift.startTime)}–{formatTime(shift.endTime)} ·{" "}
                      {shift.eventName}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusMeta[shift.status].className)}>
                    {statusMeta[shift.status].label}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
            <CardHeader className="border-b border-border/60 p-4">
              <CardTitle className="text-sm">Pre-flight checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-3">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-card"
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-neon-green" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-neon-cyan/25 bg-card/70 backdrop-blur">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="size-4 text-neon-cyan" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0 text-xs text-muted-foreground">
              <p>Publishing notifies assigned crew in-app so they can accept or decline in Work Mode.</p>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Crew on roster</span>
                <span className="font-medium text-foreground">{data.staff.length} people</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Confirmations requested</span>
                <span className="font-medium text-foreground">{pendingShifts.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
