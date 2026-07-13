"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Check, Search, Sparkles, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Input } from "@/components/admin/scheduling/ui/input"
import { ScrollArea } from "@/components/admin/scheduling/ui/scroll-area"
import {
  availabilityMeta,
  departmentAccent,
  initials,
  type StaffMember,
} from "@/components/admin/scheduling/scheduling-data"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"

export interface StaffMatch {
  staff: StaffMember
  score: number
  reasons: string[]
  conflict?: string
}

interface StaffPickerProps {
  requiredSkills?: string[]
  eventName?: string
  selectedIds: string[]
  onToggle: (staff: StaffMember) => void
  heightClassName?: string
  staffMembers?: StaffMember[]
}

// Ranks the roster against a shift so admins see the best match first.
export function rankStaff(staff: StaffMember[], requiredSkills: string[] = [], eventName?: string): StaffMatch[] {
  return staff
    .map((member) => {
      const reasons: string[] = []
      let score = 0
      if (member.availabilityStatus === "available") {
        score += 40
        reasons.push("Available")
      } else if (member.availabilityStatus === "pending") {
        score += 15
        reasons.push("Pending response")
      }
      const skillHits = requiredSkills.filter((s) => member.skills.includes(s)).length
      if (skillHits > 0) {
        score += skillHits * 20
        reasons.push("Has required skills")
      }
      if (eventName && member.workedEvents.includes(eventName)) {
        score += 15
        reasons.push("Worked this event")
      }
      if (member.lastAssignedDaysAgo <= 2) {
        score -= 5
        reasons.push("Recently assigned")
      }
      let conflict: string | undefined
      if (member.availabilityStatus === "unavailable") {
        conflict = "Marked unavailable"
        score -= 50
      } else if (member.conflictCount > 0) {
        conflict = "Potential double-booking"
        score -= 20
      }
      return { staff: member, score, reasons, conflict }
    })
    .sort((a, b) => b.score - a.score)
}

export function StaffPicker({
  requiredSkills = [],
  eventName,
  selectedIds,
  onToggle,
  heightClassName = "h-[360px]",
  staffMembers,
}: StaffPickerProps) {
  const { data } = useScheduling()
  const roster = staffMembers ?? data.staff
  const [query, setQuery] = useState("")
  const [dept, setDept] = useState("all")

  const ranked = useMemo(() => {
    const filtered = roster.filter((s) => {
      if (dept !== "all" && s.department !== dept) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
      }
      return true
    })
    return rankStaff(filtered, requiredSkills, eventName)
  }, [query, dept, requiredSkills, eventName, roster])

  const departments = useMemo(() => ["all", ...new Set(roster.map((s) => s.department))], [roster])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff by name or role"
          className="h-9 pl-8 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {departments.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDept(d)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
              dept === d
                ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {d === "all" ? "All" : d}
          </button>
        ))}
      </div>

      <ScrollArea className={cn("-mr-2 pr-2", heightClassName)}>
        <div className="flex flex-col gap-2">
          {ranked.map(({ staff, reasons, conflict }, index) => {
            const accent = departmentAccent[staff.department]
            const availability = availabilityMeta[staff.availabilityStatus]
            const selected = selectedIds.includes(staff.id)
            const isBest = index === 0 && !conflict
            return (
              <div
                key={staff.id}
                className={cn(
                  "rounded-lg border bg-background/40 p-2.5 transition-colors",
                  selected ? "border-neon-purple/60 bg-neon-purple/10" : "border-border/60 hover:border-border",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="size-9">
                    <AvatarFallback className={cn("text-[11px] font-semibold", accent.bg, accent.text)}>
                      {initials(staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">{staff.name}</span>
                      {isBest ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-neon-green/40 bg-neon-green/10 px-1.5 py-0 text-[9px] text-neon-green"
                        >
                          <Sparkles className="size-2.5" /> Best match
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {staff.role} · {staff.department}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px]", availability.className)}>
                    {availability.label}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {reasons.slice(0, 3).map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))}
                </div>

                {conflict ? (
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-neon-red">
                    <AlertTriangle className="size-3" /> {conflict}
                  </p>
                ) : null}

                <Button
                  size="xs"
                  variant={selected ? "default" : "secondary"}
                  className={cn("mt-2 w-full", selected && "bg-neon-purple text-primary-foreground hover:bg-neon-purple/85")}
                  onClick={() => onToggle(staff)}
                >
                  {selected ? (
                    <>
                      <Check data-icon="inline-start" /> Selected
                    </>
                  ) : (
                    <>
                      <UserPlus data-icon="inline-start" /> Assign
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
