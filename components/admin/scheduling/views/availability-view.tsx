"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Input } from "@/components/admin/scheduling/ui/input"
import { ScrollArea, ScrollBar } from "@/components/admin/scheduling/ui/scroll-area"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { FilterSelect } from "@/components/admin/scheduling/scheduling-filter-bar"
import {
  availabilityStatusMeta,
  DEPARTMENTS,
  departmentAccent,
  initials,
  type AvailabilitySlot,
} from "@/components/admin/scheduling/scheduling-data"

const CYCLE: AvailabilitySlot["status"][] = [
  "available",
  "preferred",
  "scheduled",
  "pending",
  "unavailable",
]

export function AvailabilityView() {
  const { data, openProfile } = useScheduling()
  const [department, setDepartment] = useState("all")
  const [search, setSearch] = useState("")
  // Local editable overrides so admins can "toggle" a cell in the prototype.
  const [overrides, setOverrides] = useState<Record<string, AvailabilitySlot["status"]>>({})

  const rows = useMemo(() => {
    return data.availability.map((a) => ({ availability: a, staff: data.staff.find((s) => s.id === a.staffId)! }))
      .filter(({ staff }) => {
        if (!staff) return false
        if (department !== "all" && staff.department !== department) return false
        if (search.trim() && !staff.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
  }, [data.availability, data.staff, department, search])

  const cellStatus = (staffId: string, day: string, base: AvailabilitySlot["status"]) =>
    overrides[`${staffId}-${day}`] ?? base

  const cycleCell = (staffId: string, day: string, current: AvailabilitySlot["status"]) => {
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
    setOverrides((prev) => ({ ...prev, [`${staffId}-${day}`]: next }))
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(availabilityStatusMeta).map(([key, meta]) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("size-3 rounded", meta.cell)} aria-hidden />
                {meta.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={department}
              onChange={setDepartment}
              placeholder="Department"
              allLabel="All Departments"
              options={DEPARTMENTS}
            />
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crew"
                className="h-8 w-44 pl-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 py-0 backdrop-blur">
        <CardHeader className="border-b border-border/60 p-4">
          <CardTitle className="text-sm">
            Weekly availability ·{" "}
            {data.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {new Date(data.weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/60 bg-background/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className="px-4 py-2">Crew member</span>
                {data.weekDays.map((d) => (
                  <span
                    key={d.key}
                    className={cn("px-2 py-2 text-center", d.isToday && "text-neon-purple")}
                  >
                    {d.short} {d.dayNumber}
                  </span>
                ))}
              </div>

              {rows.map(({ availability, staff }) => {
                const accent = departmentAccent[staff.department]
                return (
                  <div
                    key={staff.id}
                    className="grid grid-cols-[220px_repeat(7,1fr)] items-center border-b border-border/40"
                  >
                    <button
                      type="button"
                      onClick={() => openProfile(staff)}
                      className="flex items-center gap-2 px-4 py-2 text-left"
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className={cn("text-[9px] font-semibold", accent.text)}>
                          {initials(staff.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {staff.name}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {staff.role}
                        </span>
                      </span>
                    </button>

                    {data.weekDays.map((day) => {
                      const base = availability.slots.find((s) => s.day === day.key)?.status ?? "unavailable"
                      const status = cellStatus(staff.id, day.key, base)
                      const meta = availabilityStatusMeta[status]
                      return (
                        <div key={day.key} className="px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => cycleCell(staff.id, day.key, status)}
                            className={cn(
                              "flex h-9 w-full items-center justify-center rounded-md text-[10px] font-medium transition-colors",
                              meta.cell,
                            )}
                            title={`${staff.name} · ${day.label}: ${meta.label} (click to change)`}
                          >
                            {meta.label.slice(0, 4)}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
