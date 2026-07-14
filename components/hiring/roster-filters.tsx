"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ComplianceStatus, RosterMemberStatus } from "@/types/hiring-roster-work-mode"

interface RosterFiltersProps {
  search: string
  status: RosterMemberStatus | "all"
  complianceStatus: ComplianceStatus | "all"
  department: string
  departments: string[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: RosterMemberStatus | "all") => void
  onComplianceStatusChange: (value: ComplianceStatus | "all") => void
  onDepartmentChange: (value: string) => void
}

export function RosterFilters({
  search,
  status,
  complianceStatus,
  department,
  departments,
  onSearchChange,
  onStatusChange,
  onComplianceStatusChange,
  onDepartmentChange,
}: RosterFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_180px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by role, department, or staff member"
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={(value) => onStatusChange(value as RosterMemberStatus | "all")}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="offboarded">Offboarded</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={complianceStatus}
        onValueChange={(value) => onComplianceStatusChange(value as ComplianceStatus | "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder="Compliance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All compliance</SelectItem>
          <SelectItem value="not_started">Not started</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="needs_review">Needs review</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="compliant">Compliant</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
        </SelectContent>
      </Select>

      <Select value={department} onValueChange={onDepartmentChange}>
        <SelectTrigger>
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
