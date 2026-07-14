"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CandidateKanbanFilters, HiringCandidate } from "@/types/hiring-candidate-workflow"
import { getUniqueCandidateValues } from "@/lib/hiring/candidate-workflow-utils"

interface OnboardingKanbanFiltersProps {
  candidates: HiringCandidate[]
  filters: CandidateKanbanFilters
  onFiltersChange: (filters: CandidateKanbanFilters) => void
}

export function OnboardingKanbanFilters({ candidates, filters, onFiltersChange }: OnboardingKanbanFiltersProps) {
  const departments = getUniqueCandidateValues(candidates, "department")
  const positions = getUniqueCandidateValues(candidates, "position")

  function updateFilter(key: keyof CandidateKanbanFilters, value: string) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="candidate-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="candidate-search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Name, email, role, department..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select value={filters.department} onValueChange={(value) => updateFilter("department", value)}>
          <SelectTrigger>
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

      <div className="space-y-2">
        <Label>Position</Label>
        <Select value={filters.position} onValueChange={(value) => updateFilter("position", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {positions.map((position) => (
              <SelectItem key={position} value={position}>
                {position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Compliance</Label>
        <Select value={filters.complianceStatus} onValueChange={(value) => updateFilter("complianceStatus", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
