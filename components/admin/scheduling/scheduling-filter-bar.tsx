"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/admin/scheduling/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/scheduling/ui/select"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  DEPARTMENTS,
  ROLES,
  statusMeta,
  type ShiftStatus,
} from "@/components/admin/scheduling/scheduling-data"

export interface ShiftFilters {
  department: string
  status: string
  event: string
  venue: string
  role: string
  search: string
}

export const EMPTY_FILTERS: ShiftFilters = {
  department: "all",
  status: "all",
  event: "all",
  venue: "all",
  role: "all",
  search: "",
}

const STATUSES: ShiftStatus[] = [
  "draft",
  "published",
  "confirmed",
  "pending",
  "declined",
  "conflict",
  "open",
  "cancelled",
]

export function matchesFilters(
  shift: {
    department: string
    status: string
    eventName: string
    venueName: string
    role: string
    title: string
    assignedStaff?: { name: string }
  },
  filters: ShiftFilters,
) {
  if (filters.department !== "all" && shift.department !== filters.department) return false
  if (filters.status !== "all" && shift.status !== filters.status) return false
  if (filters.event !== "all" && shift.eventName !== filters.event) return false
  if (filters.venue !== "all" && shift.venueName !== filters.venue) return false
  if (filters.role !== "all" && shift.role !== filters.role) return false
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase()
    const haystack = `${shift.title} ${shift.role} ${shift.assignedStaff?.name ?? ""}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

interface FilterBarProps {
  filters: ShiftFilters
  onChange: (next: Partial<ShiftFilters>) => void
  searchPlaceholder?: string
}

export function FilterBar({ filters, onChange, searchPlaceholder = "Search staff" }: FilterBarProps) {
  const { data } = useScheduling()
  const eventOptions = data.events.length > 0 ? data.events.map((event) => event.name) : [...new Set(data.shifts.map((shift) => shift.eventName))]
  const venueOptions = data.venues.length > 0 ? data.venues.map((venue) => venue.name) : [...new Set(data.shifts.map((shift) => shift.venueName))]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={filters.event}
        onChange={(v) => onChange({ event: v })}
        placeholder="Event"
        allLabel="All Events"
        options={eventOptions}
      />
      <FilterSelect
        value={filters.venue}
        onChange={(v) => onChange({ venue: v })}
        placeholder="Venue"
        allLabel="All Venues"
        options={venueOptions}
      />
      <FilterSelect
        value={filters.department}
        onChange={(v) => onChange({ department: v })}
        placeholder="Department"
        allLabel="All Departments"
        options={DEPARTMENTS}
      />
      <FilterSelect
        value={filters.role}
        onChange={(v) => onChange({ role: v })}
        placeholder="Role"
        allLabel="All Roles"
        options={[...ROLES]}
      />
      <FilterSelect
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
        placeholder="Status"
        allLabel="All Statuses"
        options={STATUSES}
        renderOption={(o) => statusMeta[o as ShiftStatus]?.label ?? o}
      />
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={searchPlaceholder}
          className="h-8 w-40 pl-8 text-sm"
        />
      </div>
    </div>
  )
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  allLabel: string
  options: string[]
  renderOption?: (option: string) => string
}

export function FilterSelect({
  value,
  onChange,
  placeholder,
  allLabel,
  options,
  renderOption,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger size="sm" className="min-w-28">
        <SelectValue placeholder={placeholder}>
          {(selected: string) =>
            selected === "all" ? allLabel : renderOption ? renderOption(selected) : selected
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {renderOption ? renderOption(option) : option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
