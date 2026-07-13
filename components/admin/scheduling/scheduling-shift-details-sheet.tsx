"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  MapPin,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Separator } from "@/components/admin/scheduling/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { toAssignTarget, useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  departmentAccent,
  formatDate,
  formatTime,
  initials,
  priorityMeta,
  shiftTypeMeta,
  statusMeta,
} from "@/components/admin/scheduling/scheduling-data"

export function ShiftDetailsSheet() {
  const {
    detailsShift: shift,
    closeDetails,
    openEdit,
    openAssign,
    openProfile,
    updateShiftStatus,
    data,
  } = useScheduling()
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function handleStatus(status: "confirmed" | "cancelled") {
    if (!shift) return
    setActionMessage(null)
    if (data.mode === "demo") {
      setActionMessage("Switch to Live to edit real shifts.")
      return
    }
    const result = await updateShiftStatus(shift.id, status)
    if (!result.ok) {
      setActionMessage(result.error ?? "Unable to update shift")
      return
    }
    closeDetails()
  }

  return (
    <Sheet open={!!shift} onOpenChange={(o) => !o && closeDetails()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {shift ? (
          <>
            <SheetHeader className="border-b border-border/60">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px]", statusMeta[shift.status].className)}>
                  {statusMeta[shift.status].label}
                </Badge>
                <Badge variant="outline" className={cn("gap-1 text-[10px]", priorityMeta[shift.priority].className)}>
                  <Flag className="size-2.5" /> {priorityMeta[shift.priority].label}
                </Badge>
                {shift.hasConflict ? (
                  <Badge variant="outline" className="gap-1 border-neon-red/40 bg-neon-red/10 text-[10px] text-neon-red">
                    <AlertTriangle className="size-3" /> Conflict
                  </Badge>
                ) : null}
              </div>
              <SheetTitle className="text-lg">{shift.title}</SheetTitle>
              <SheetDescription>
                {shift.eventName} · {shiftTypeMeta[shift.shiftType]}
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3">
                <DetailRow icon={CalendarDays} label="Date" value={formatDate(shift.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} />
                <DetailRow
                  icon={Clock}
                  label="Time"
                  value={`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`}
                />
                <DetailRow icon={MapPin} label="Venue" value={shift.venueName} />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Department &amp; Role</span>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5",
                      departmentAccent[shift.department].border,
                      departmentAccent[shift.department].bg,
                      departmentAccent[shift.department].text,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", departmentAccent[shift.department].dot)} aria-hidden />
                    {shift.department}
                  </Badge>
                  <Badge variant="secondary">{shift.role}</Badge>
                </div>
              </div>

              {shift.requiredSkills.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Required skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {shift.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Assigned staff</span>
                {shift.assignedStaff ? (
                  <button
                    type="button"
                    onClick={() => shift.assignedStaff && openProfile(shift.assignedStaff)}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 p-2.5 text-left transition-colors hover:border-border hover:bg-card"
                  >
                    <Avatar className="size-9">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          departmentAccent[shift.assignedStaff.department].bg,
                          departmentAccent[shift.assignedStaff.department].text,
                        )}
                      >
                        {initials(shift.assignedStaff.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{shift.assignedStaff.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{shift.assignedStaff.role}</p>
                    </div>
                    {shift.assignedStaff.confirmationStatus === "confirmed" ? (
                      <span className="flex items-center gap-1 text-[11px] text-neon-green">
                        <CheckCircle2 className="size-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] text-neon-amber capitalize">
                        {shift.assignedStaff.confirmationStatus}
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAssign(toAssignTarget(shift))}
                    className="rounded-lg border border-dashed border-neon-purple/40 bg-neon-purple/5 p-3 text-center text-xs text-neon-purple transition-colors hover:bg-neon-purple/10"
                  >
                    Unassigned · {shift.neededStaffCount} staff needed — tap to assign
                  </button>
                )}
              </div>

              {shift.notes ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Notes</span>
                    <p className="rounded-lg border border-border/50 bg-background/40 p-3 text-xs leading-relaxed text-foreground/90">
                      {shift.notes}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <SheetFooter className="gap-2 border-t border-border/60">
              {actionMessage ? (
                <p className="text-xs text-neon-red">{actionMessage}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    openEdit(shift)
                    closeDetails()
                  }}
                >
                  <Pencil data-icon="inline-start" /> Edit Shift
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    openAssign(toAssignTarget(shift))
                    closeDetails()
                  }}
                >
                  <Repeat data-icon="inline-start" /> Reassign
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-neon-red/40 text-neon-red hover:bg-neon-red/10"
                  disabled={data.saving || data.mode === "demo" || shift.status === "cancelled"}
                  onClick={() => void handleStatus("cancelled")}
                >
                  <Trash2 data-icon="inline-start" /> Cancel Shift
                </Button>
                <Button
                  className="bg-neon-green/90 text-primary-foreground hover:bg-neon-green"
                  disabled={data.saving || data.mode === "demo" || shift.status === "confirmed"}
                  onClick={() => void handleStatus("confirmed")}
                >
                  <CheckCircle2 data-icon="inline-start" /> Confirm
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle className="sr-only">Shift details</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

interface DetailRowProps {
  icon: typeof CalendarDays
  label: string
  value: string
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  )
}
