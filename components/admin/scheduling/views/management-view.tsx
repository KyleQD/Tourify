"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, MoreHorizontal, Pencil, Send, Trash2, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Checkbox } from "@/components/admin/scheduling/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin/scheduling/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/admin/scheduling/ui/scroll-area"
import { toAssignTarget, useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  EMPTY_FILTERS,
  FilterBar,
  matchesFilters,
  type ShiftFilters,
} from "@/components/admin/scheduling/scheduling-filter-bar"
import {
  departmentAccent,
  formatDate,
  formatTime,
  initials,
  priorityMeta,
  statusMeta,
  type Shift,
} from "@/components/admin/scheduling/scheduling-data"

type SortKey = "date" | "priority" | "status" | "department"

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const

export function ManagementView() {
  const { data, openDetails, openEdit, openAssign, updateShiftStatus, deleteShift, publishShifts } =
    useScheduling()
  const [filters, setFilters] = useState<ShiftFilters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [selected, setSelected] = useState<string[]>([])
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  const patch = (next: Partial<ShiftFilters>) => setFilters((prev) => ({ ...prev, ...next }))

  const rows = useMemo(() => {
    const filtered = data.shifts.filter((s) => matchesFilters(s, filters))
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "priority":
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        case "status":
          return a.status.localeCompare(b.status)
        case "department":
          return a.department.localeCompare(b.department)
        default:
          return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      }
    })
  }, [data.shifts, filters, sortKey])

  const allSelected = rows.length > 0 && selected.length === rows.length
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id))
  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  async function handleBulkConfirm() {
    setBulkMessage(null)
    for (const id of selected) {
      const result = await updateShiftStatus(id, "confirmed", { notify: false })
      if (!result.ok) {
        setBulkMessage(result.error ?? "Failed to confirm some shifts")
        return
      }
    }
    setSelected([])
  }

  async function handleBulkDelete() {
    setBulkMessage(null)
    for (const id of selected) {
      const result = await deleteShift(id)
      if (!result.ok) {
        setBulkMessage(result.error ?? "Failed to delete some shifts")
        return
      }
    }
    setSelected([])
  }

  async function handleBulkPublish() {
    setBulkMessage(null)
    const result = await publishShifts(selected, { notify: true })
    if (!result.ok) {
      setBulkMessage(result.error ?? "Failed to publish shifts")
      return
    }
    setSelected([])
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterBar filters={filters} onChange={patch} searchPlaceholder="Search shifts" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/40 p-0.5">
              {(["date", "priority", "status", "department"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortKey(key)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                    sortKey === key
                      ? "bg-neon-purple/20 text-neon-purple"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 px-3 py-2">
          <span className="text-xs font-medium text-neon-purple">{selected.length} selected</span>
          {bulkMessage ? <span className="text-xs text-neon-red">{bulkMessage}</span> : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="xs" variant="secondary" disabled={data.saving} onClick={() => void handleBulkPublish()}>
              <Send data-icon="inline-start" />
              Publish
            </Button>
            <Button size="xs" variant="secondary" disabled={data.saving} onClick={() => void handleBulkConfirm()}>
              <CheckCircle2 data-icon="inline-start" />
              Confirm all
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="border-neon-red/40 text-neon-red hover:bg-neon-red/10"
              disabled={data.saving}
              onClick={() => void handleBulkDelete()}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-border/60 bg-card/40 py-0 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 p-4">
          <CardTitle className="text-sm">All shifts</CardTitle>
          <Badge variant="secondary">{rows.length} shifts</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[40px_1.4fr_1fr_1fr_0.9fr_0.9fr_44px] items-center gap-2 border-b border-border/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                <span>Shift</span>
                <span>Schedule</span>
                <span>Assigned</span>
                <span>Priority</span>
                <span>Status</span>
                <span className="sr-only">Actions</span>
              </div>

              {rows.map((shift) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  checked={selected.includes(shift.id)}
                  onToggle={() => toggleOne(shift.id)}
                  onOpen={() => openDetails(shift)}
                  onEdit={() => openEdit(shift)}
                  onAssign={() => openAssign(toAssignTarget(shift))}
                />
              ))}

              {rows.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No shifts match your filters.
                </div>
              ) : null}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface ShiftRowProps {
  shift: Shift
  checked: boolean
  onToggle: () => void
  onOpen: () => void
  onEdit: () => void
  onAssign: () => void
}

function ShiftRow({ shift, checked, onToggle, onOpen, onEdit, onAssign }: ShiftRowProps) {
  const accent = departmentAccent[shift.department]
  const status = statusMeta[shift.status]
  const priority = priorityMeta[shift.priority]

  return (
    <div
      className={cn(
        "grid grid-cols-[40px_1.4fr_1fr_1fr_0.9fr_0.9fr_44px] items-center gap-2 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-card/60",
        checked && "bg-neon-purple/5",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Select ${shift.title}`} />

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-col text-left">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-full", accent.dot)} aria-hidden />
          <span className="truncate text-sm font-medium text-foreground">{shift.title}</span>
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {shift.role} · {shift.eventName}
        </span>
      </button>

      <div className="min-w-0 text-xs text-muted-foreground">
        <div className="text-foreground">{formatDate(shift.date, { weekday: "short", day: "numeric", month: "short" })}</div>
        <div>
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
        </div>
      </div>

      <div className="min-w-0">
        {shift.assignedStaff ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback className="bg-secondary text-[9px] font-semibold text-foreground">
                {initials(shift.assignedStaff.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">{shift.assignedStaff.name}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAssign}
            className="flex items-center gap-1 text-[11px] font-medium text-neon-purple hover:underline"
          >
            <UserPlus className="size-3" />
            {shift.neededStaffCount} needed
          </button>
        )}
      </div>

      <Badge variant="outline" className={cn("w-fit text-[10px]", priority.className)}>
        {priority.label}
      </Badge>

      <Badge variant="outline" className={cn("w-fit text-[10px]", status.className)}>
        {status.label}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Shift actions">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onOpen}>View details</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil data-icon="inline-start" />
              Edit shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>
              <UserPlus data-icon="inline-start" />
              Assign staff
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              <Trash2 data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
