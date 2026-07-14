"use client"

import { AlertTriangle, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import {
  departmentAccent,
  formatTime,
  initials,
  statusMeta,
  type Shift,
} from "@/components/admin/scheduling/scheduling-data"

interface ShiftCardProps {
  shift: Shift
  onSelect: (shift: Shift) => void
}

export function ShiftCard({ shift, onSelect }: ShiftCardProps) {
  const accent = departmentAccent[shift.department]
  const status = statusMeta[shift.status]

  return (
    <button
      type="button"
      onClick={() => onSelect(shift)}
      className={cn(
        "group w-full rounded-lg border bg-card/60 p-2.5 text-left transition-all",
        "hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_0_0_1px_var(--color-ring),0_8px_24px_-12px_var(--color-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        shift.hasConflict ? "border-neon-red/50" : accent.border,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("size-2 shrink-0 rounded-full", accent.dot)} aria-hidden />
        <span className={cn("truncate text-xs font-semibold", accent.text)}>{shift.role}</span>
        {shift.hasConflict ? (
          <AlertTriangle className="ml-auto size-3.5 shrink-0 text-neon-red" aria-label="Has conflict" />
        ) : null}
      </div>

      <p className="mt-1 truncate text-sm font-medium text-foreground">{shift.title}</p>

      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        <span>
          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {shift.assignedStaff ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback className="bg-secondary text-[9px] font-semibold text-foreground">
                {initials(shift.assignedStaff.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] text-muted-foreground">
              {shift.assignedStaff.name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-medium text-neon-purple">
            {shift.neededStaffCount} needed
          </span>
        )}
        <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", status.className)}>
          {status.label}
        </Badge>
      </div>
    </button>
  )
}
