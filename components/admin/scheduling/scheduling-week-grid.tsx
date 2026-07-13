"use client"

import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/admin/scheduling/ui/scroll-area"
import { ShiftCard } from "@/components/admin/scheduling/scheduling-shift-card"
import type { Shift, WeekDay } from "@/components/admin/scheduling/scheduling-data"

interface WeekGridProps {
  shifts: Shift[]
  weekDays: WeekDay[]
  onSelectShift: (shift: Shift) => void
  onCreateShift: (date: string) => void
}

function coverageHealth(shifts: Shift[]) {
  if (shifts.length === 0) return { label: "No shifts", className: "bg-muted text-muted-foreground" }
  const conflicts = shifts.filter((s) => s.hasConflict).length
  const open = shifts.filter((s) => s.status === "open" || !s.assignedStaff).length
  if (conflicts > 0) return { label: "At risk", className: "bg-neon-red/15 text-neon-red" }
  if (open > 0) return { label: "Gaps", className: "bg-neon-amber/15 text-neon-amber" }
  return { label: "Healthy", className: "bg-neon-green/15 text-neon-green" }
}

export function WeekGrid({ shifts, weekDays, onSelectShift, onCreateShift }: WeekGridProps) {
  return (
    <ScrollArea className="w-full">
      <div className="grid min-w-[900px] grid-cols-7 gap-3 pb-3">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter((s) => s.date === day.date)
          const openCount = dayShifts.filter((s) => s.status === "open" || !s.assignedStaff).length
          const conflictCount = dayShifts.filter((s) => s.hasConflict).length
          const confirmedCount = dayShifts.filter((s) => s.status === "confirmed").length
          const health = coverageHealth(dayShifts)
          // Density bar segments cap at 5 for visual clarity.
          const density = Math.min(dayShifts.length, 5)

          return (
            <div key={day.key} className="flex min-h-[460px] flex-col">
              <div
                className={cn(
                  "mb-2 flex flex-col gap-1.5 rounded-lg border px-2.5 py-2",
                  day.isToday ? "border-neon-purple/50 bg-neon-purple/10" : "border-border/60 bg-card/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-wide",
                        day.isToday ? "text-neon-purple" : "text-muted-foreground",
                      )}
                    >
                      {day.short}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", health.className)}>
                    {health.label}
                  </span>
                </div>

                {/* Shift density indicator */}
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i < density ? (conflictCount > 0 ? "bg-neon-red/60" : "bg-neon-purple/60") : "bg-border",
                      )}
                    />
                  ))}
                </div>

                {/* Day summary counts */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span title="Total shifts">{dayShifts.length} shifts</span>
                  <span className="flex items-center gap-1.5">
                    {confirmedCount > 0 ? <span className="text-neon-green">{confirmedCount} conf</span> : null}
                    {openCount > 0 ? <span className="text-neon-amber">{openCount} open</span> : null}
                    {conflictCount > 0 ? <span className="text-neon-red">{conflictCount} conf!</span> : null}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border/40 bg-background/40 p-2">
                {dayShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} onSelect={onSelectShift} />
                ))}

                <button
                  type="button"
                  onClick={() => onCreateShift(day.date)}
                  className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 py-2 text-[11px] text-muted-foreground transition-colors hover:border-neon-purple/50 hover:text-neon-purple"
                >
                  <Plus className="size-3.5" />
                  Add shift
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
