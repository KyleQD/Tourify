"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, Info, LayoutTemplate, MapPin, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Separator } from "@/components/admin/scheduling/ui/separator"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  emptyShiftForm,
  ShiftFormFields,
  type ShiftFormState,
} from "@/components/admin/scheduling/scheduling-shift-form"
import { StaffPicker } from "@/components/admin/scheduling/scheduling-staff-picker"
import {
  formatTime,
  priorityMeta,
  type Priority,
} from "@/components/admin/scheduling/scheduling-data"

export function CreateView() {
  const { createPrefill, createShift, data, setView } = useScheduling()
  const [state, setState] = useState<ShiftFormState>(emptyShiftForm)
  const [assigned, setAssigned] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  // Apply prefill (from a day cell or template) once on mount / when it changes.
  useEffect(() => {
    if (!createPrefill) return
    setState((prev) => {
      const next = { ...prev }
      if (createPrefill.date) next.date = createPrefill.date
      const tpl = createPrefill.template
      if (tpl) {
        next.title = tpl.name
        next.department = tpl.department
        next.role = tpl.role
        next.startTime = tpl.startTime
        next.endTime = tpl.endTime
        next.neededStaff = String(tpl.neededStaffCount)
        next.requiredSkills = tpl.requiredSkills.join(", ")
        next.staffInstructions = tpl.instructions
        next.internalNotes = tpl.defaultNotes
        next.shiftType = tpl.shiftType
      }
      return next
    })
  }, [createPrefill])

  const needed = Number.parseInt(state.neededStaff, 10) || 0
  const skills = useMemo(
    () => state.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
    [state.requiredSkills],
  )
  const priority = priorityMeta[state.priority as Priority]

  async function saveShift(notify: boolean) {
    setMessage(null)
    if (data.mode === "demo") {
      setMessage("Switch to Live to edit real shifts.")
      return
    }
    const result = await createShift({
      title: state.title,
      eventName: state.event,
      venueName: state.venue,
      department: state.department,
      role: state.role,
      shiftType: state.shiftType,
      priority: state.priority,
      date: state.date,
      startTime: state.startTime,
      endTime: state.endTime,
      breakMinutes: Number.parseInt(state.breakMinutes, 10) || 0,
      neededStaffCount: Number.parseInt(state.neededStaff, 10) || 1,
      requiredSkills: skills,
      notes: state.internalNotes,
      staffInstructions: state.staffInstructions,
      assignedStaffIds: assigned,
      notify,
    })
    if (!result.ok) {
      setMessage(result.error ?? "Unable to save shift")
      return
    }
    setMessage(notify ? "Shift saved and crew notified." : "Draft shift saved.")
    setView("board")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Form column */}
        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Shift details</CardTitle>
              <CardDescription>
                Define coverage requirements. Fields marked as staff-facing are shared with assigned crew.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftFormFields state={state} setState={setState} />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-neon-cyan" />
                  Assign crew
                </CardTitle>
                <CardDescription>
                  {assigned.length} of {needed || "—"} positions filled.
                </CardDescription>
              </div>
              <Badge variant="outline" className={cn(priority.className)}>
                {priority.label} priority
              </Badge>
            </CardHeader>
            <CardContent>
              <StaffPicker
                selectedIds={assigned}
                onToggle={(staff) =>
                  setAssigned((prev) =>
                    prev.includes(staff.id) ? prev.filter((s) => s !== staff.id) : [...prev, staff.id],
                  )
                }
                requiredSkills={skills}
                eventName={state.event}
                heightClassName="h-72"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sticky summary column */}
        <div className="flex flex-col gap-4">
          <Card className="border-neon-purple/25 bg-card/70 backdrop-blur xl:sticky xl:top-4">
            <CardHeader>
              <CardTitle className="text-sm">Live preview</CardTitle>
              <CardDescription>How this shift will appear on the board.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-lg border border-neon-purple/40 bg-background/40 p-3">
                <p className="text-xs font-medium text-neon-purple">{state.role || "Role"}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {state.title || "Untitled shift"}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3" />
                    {formatTime(state.startTime)} – {formatTime(state.endTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3" />
                    {state.venue || "No venue set"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3" />
                    {needed} needed · {assigned.length} assigned
                  </span>
                </div>
                {skills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {skills.map((s) => (
                      <span key={s} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-2.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-neon-cyan" />
                <span>
                  Draft shifts stay hidden from staff until you publish the schedule.
                </span>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => void saveShift(true)}
                  disabled={data.saving || data.mode === "demo"}
                  className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
                >
                  Save &amp; publish
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void saveShift(false)}
                  disabled={data.saving || data.mode === "demo"}
                >
                  Save as draft
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <LayoutTemplate data-icon="inline-start" />
                    Save template
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setView("board")}>
                    Cancel
                  </Button>
                </div>
                {message ? <p className="text-[11px] text-neon-amber">{message}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <LayoutTemplate className="size-4 text-neon-amber" />
                Start from template
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {data.templates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {data.mode === "live"
                    ? "No organization templates in live mode. Demo presets stay in Demo preview."
                    : "No templates available."}
                </p>
              ) : null}
              {data.templates.slice(0, 4).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      title: tpl.name,
                      department: tpl.department,
                      role: tpl.role,
                      startTime: tpl.startTime,
                      endTime: tpl.endTime,
                      neededStaff: String(tpl.neededStaffCount),
                      requiredSkills: tpl.requiredSkills.join(", "),
                      staffInstructions: tpl.instructions,
                      internalNotes: tpl.defaultNotes,
                      shiftType: tpl.shiftType,
                    }))
                  }
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-left text-xs transition-colors hover:border-neon-amber/40 hover:bg-card"
                >
                  <span className="truncate font-medium text-foreground">
                    {tpl.isDemoFixture ? `[Demo] ${tpl.name}` : tpl.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {tpl.neededStaffCount} crew
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
