"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { HiringApplicationReviewFilters } from "@/types/hiring-application-review"

interface ApplicationReviewFiltersProps {
  filters: HiringApplicationReviewFilters
  departments: string[]
  onFiltersChange: (filters: HiringApplicationReviewFilters) => void
  className?: string
}

const applicationStatuses = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
]

export function ApplicationReviewFilters({
  filters,
  departments,
  onFiltersChange,
  className,
}: ApplicationReviewFiltersProps) {
  function updateFilters(updates: Partial<HiringApplicationReviewFilters>) {
    onFiltersChange({ ...filters, ...updates })
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-[1fr_180px_180px]", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={filters.search || ""}
          onChange={(event) => updateFilters({ search: event.target.value })}
          placeholder="Search applicant, email, or position"
          className="border-slate-700 bg-slate-950 pl-9 text-white placeholder:text-slate-500"
        />
      </div>

      <Select
        value={filters.status || "all"}
        onValueChange={(status) => updateFilters({ status: status as HiringApplicationReviewFilters["status"] })}
      >
        <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {applicationStatuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.department || "all"}
        onValueChange={(department) => updateFilters({ department })}
      >
        <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department} value={department}>
              {department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
