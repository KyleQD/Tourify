"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Input } from "@/components/admin/scheduling/ui/input"
import { ScrollArea } from "@/components/admin/scheduling/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/scheduling/ui/tabs"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  availabilityMeta,
  departmentAccent,
  initials,
  type AvailabilityStatus,
  type StaffMember,
} from "@/components/admin/scheduling/scheduling-data"

const CATEGORIES: { value: AvailabilityStatus | "all"; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pending", label: "Pending" },
  { value: "unavailable", label: "Off" },
]

export function StaffPanel() {
  const { data } = useScheduling()
  const [category, setCategory] = useState<AvailabilityStatus | "all">("available")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    return data.staff.filter((staff) => {
      const matchesCategory = category === "all" || staff.availabilityStatus === category
      const matchesQuery =
        query.trim() === "" ||
        staff.name.toLowerCase().includes(query.toLowerCase()) ||
        staff.role.toLowerCase().includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [category, data.staff, query])

  return (
    <Card className="flex h-full flex-col border-border/60 bg-card/70 py-0 backdrop-blur">
      <CardHeader className="gap-1 border-b border-border/60 p-4">
        <CardTitle className="text-sm">Staff & Crew</CardTitle>
        <CardDescription className="text-xs">
          Drag-ready pool for assigning to shifts.
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as AvailabilityStatus | "all")}
        >
          <TabsList className="w-full">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-[11px]">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ScrollArea className="-mr-2 h-[380px] pr-2">
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No staff in this category.
              </p>
            ) : (
              filtered.map((staff) => <StaffRow key={staff.id} staff={staff} />)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function StaffRow({ staff }: { staff: StaffMember }) {
  const { openProfile } = useScheduling()
  const accent = departmentAccent[staff.department]
  const availability = availabilityMeta[staff.availabilityStatus]

  return (
    <button
      type="button"
      onClick={() => openProfile(staff)}
      className="w-full rounded-lg border border-border/60 bg-background/40 p-2.5 text-left transition-colors hover:border-border hover:bg-card"
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8">
          <AvatarFallback className={cn("text-[11px] font-semibold", accent.bg, accent.text)}>
            {initials(staff.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{staff.name}</span>
            {staff.confirmationStatus === "confirmed" ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-neon-green" aria-label="Confirmed" />
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", accent.dot)} aria-hidden />
            <span className="truncate">{staff.role}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{staff.department}</span>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", availability.className)}>
          {availability.label}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {staff.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {skill}
          </span>
        ))}
      </div>
    </button>
  )
}
