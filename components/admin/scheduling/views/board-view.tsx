"use client"

import { useMemo, useState } from "react"
import { CalendarRange } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent } from "@/components/admin/scheduling/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/scheduling/ui/tabs"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  EMPTY_FILTERS,
  FilterBar,
  matchesFilters,
  type ShiftFilters,
} from "@/components/admin/scheduling/scheduling-filter-bar"
import { OverviewCards } from "@/components/admin/scheduling/scheduling-overview-cards"
import { ShiftCard } from "@/components/admin/scheduling/scheduling-shift-card"
import { StaffPanel } from "@/components/admin/scheduling/scheduling-staff-panel"
import { WeekGrid } from "@/components/admin/scheduling/scheduling-week-grid"
import {
  formatTime,
  statusMeta,
  type Shift,
} from "@/components/admin/scheduling/scheduling-data"

type ViewMode = "week" | "day" | "list"

export function BoardView() {
  const { data, openDetails, goToCreate } = useScheduling()
  const [view, setView] = useState<ViewMode>("week")
  const [filters, setFilters] = useState<ShiftFilters>(EMPTY_FILTERS)

  const patch = (next: Partial<ShiftFilters>) => setFilters((prev) => ({ ...prev, ...next }))

  const filteredShifts = useMemo(() => data.shifts.filter((s) => matchesFilters(s, filters)), [data.shifts, filters])

  return (
    <div className="flex flex-col gap-5">
      <OverviewCards />

      <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <FilterBar filters={filters} onChange={patch} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 border-border/60 bg-card/40 py-0 backdrop-blur">
          <CardContent className="p-3">
            {view === "week" ? (
              <WeekGrid
                shifts={filteredShifts}
                weekDays={data.weekDays}
                onSelectShift={openDetails}
                onCreateShift={(date) => goToCreate({ date })}
              />
            ) : view === "day" ? (
              <DayView shifts={filteredShifts} weekDays={data.weekDays} onSelectShift={openDetails} />
            ) : (
              <ListView shifts={filteredShifts} onSelectShift={openDetails} />
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <StaffPanel />
        </div>
      </div>
    </div>
  )
}

function DayView({
  shifts,
  weekDays,
  onSelectShift,
}: {
  shifts: Shift[]
  weekDays: { label: string; date: string; dayNumber: number; isToday?: boolean }[]
  onSelectShift: (shift: Shift) => void
}) {
  const today = weekDays.find((d) => d.isToday) ?? weekDays[0]
  const dayShifts = shifts.filter((s) => s.date === today?.date)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {today?.label},{" "}
          {today
            ? new Date(`${today.date}T00:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Selected day"}
        </h2>
        <Badge variant="secondary">{dayShifts.length} shifts</Badge>
      </div>
      {dayShifts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dayShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} onSelect={onSelectShift} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListView({ shifts, onSelectShift }: { shifts: Shift[]; onSelectShift: (shift: Shift) => void }) {
  if (shifts.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-1.5">
      {shifts.map((shift) => (
        <button
          key={shift.id}
          type="button"
          onClick={() => onSelectShift(shift)}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-left transition-colors",
            "hover:border-border hover:bg-card",
          )}
        >
          <div className="w-24 shrink-0 text-xs text-muted-foreground">
            {new Date(`${shift.date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
            })}
            <div className="text-foreground">
              {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {shift.role} · {shift.venueName}
            </p>
          </div>
          <span className="hidden w-32 truncate text-xs text-muted-foreground sm:block">
            {shift.assignedStaff?.name ?? `${shift.neededStaffCount} needed`}
          </span>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusMeta[shift.status].className)}>
            {statusMeta[shift.status].label}
          </Badge>
        </button>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 py-12 text-center">
      <CalendarRange className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No shifts match your filters</p>
      <p className="text-xs text-muted-foreground">Try adjusting the filters or clear your search.</p>
    </div>
  )
}
