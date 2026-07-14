"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock, MapPin, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { StaffPicker } from "@/components/admin/scheduling/scheduling-staff-picker"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { departmentAccent, formatDate, formatTime, type StaffMember } from "@/components/admin/scheduling/scheduling-data"

export function AssignStaffSheet() {
  const { assignStaff, assignTarget, closeAssign, data } = useScheduling()
  const [selected, setSelected] = useState<string[]>([])
  const [assigned, setAssigned] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (assignTarget) {
      setSelected([])
      setAssigned(false)
      setMessage(null)
    }
  }, [assignTarget])

  function toggle(staff: StaffMember) {
    setSelected((prev) =>
      prev.includes(staff.id) ? prev.filter((id) => id !== staff.id) : [...prev, staff.id],
    )
  }

  const accent = assignTarget ? departmentAccent[assignTarget.department as keyof typeof departmentAccent] : null

  async function saveAssignment() {
    if (!assignTarget) return
    setMessage(null)
    if (data.mode === "demo") {
      setMessage("Switch to Live to edit real shifts.")
      return
    }
    const result = await assignStaff(assignTarget.id, selected)
    if (!result.ok) {
      setMessage(result.error ?? "Unable to assign staff")
      return
    }
    setAssigned(true)
  }

  return (
    <Sheet open={!!assignTarget} onOpenChange={(o) => !o && closeAssign()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {assignTarget ? (
          <>
            <SheetHeader className="border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-neon-purple/15 text-neon-purple">
                  <UserPlus className="size-4" />
                </span>
                <div>
                  <SheetTitle>Assign Staff</SheetTitle>
                  <SheetDescription>Pick crew for this open shift.</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className={cn("rounded-lg border bg-background/40 p-3", accent?.border)}>
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", accent?.dot)} aria-hidden />
                  <span className={cn("text-sm font-semibold", accent?.text)}>{assignTarget.role}</span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-foreground">{assignTarget.title}</p>
                <div className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3" /> {formatDate(assignTarget.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3" /> {formatTime(assignTarget.startTime)} – {formatTime(assignTarget.endTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3" /> {assignTarget.venueName}
                  </span>
                </div>
                {assignTarget.requiredSkills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground">Required:</span>
                    {assignTarget.requiredSkills.map((skill) => (
                      <span key={skill} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {assigned ? (
                <div className="rounded-lg border border-neon-green/40 bg-neon-green/10 p-3 text-center text-xs text-neon-green">
                  {selected.length} staff assigned. Invite notifications were sent to the crew.
                </div>
              ) : null}
              {message ? (
                <div className="rounded-lg border border-neon-red/40 bg-neon-red/10 p-3 text-xs text-neon-red">
                  {message}
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Suggested staff</span>
                {selected.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {selected.length} selected
                  </Badge>
                ) : null}
              </div>

              <StaffPicker
                requiredSkills={assignTarget.requiredSkills}
                eventName={assignTarget.eventName}
                selectedIds={selected}
                onToggle={toggle}
                heightClassName="h-[320px]"
              />
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-border/60">
              <Button variant="ghost" onClick={closeAssign}>
                Cancel
              </Button>
              <Button
                disabled={selected.length === 0 || data.saving || data.mode === "demo"}
                onClick={() => void saveAssignment()}
                className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
              >
                {data.saving ? "Assigning..." : `Assign ${selected.length > 0 ? `(${selected.length})` : ""}`}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle className="sr-only">Assign staff</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
