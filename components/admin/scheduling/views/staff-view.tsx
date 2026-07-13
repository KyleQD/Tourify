"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Mail, Phone, Search, ShieldCheck, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { Input } from "@/components/admin/scheduling/ui/input"
import { Progress } from "@/components/admin/scheduling/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/scheduling/ui/tabs"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { FilterSelect } from "@/components/admin/scheduling/scheduling-filter-bar"
import {
  availabilityMeta,
  DEPARTMENTS,
  departmentAccent,
  initials,
  type AvailabilityStatus,
  type StaffMember,
} from "@/components/admin/scheduling/scheduling-data"

const AVAIL_TABS: { value: AvailabilityStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pending", label: "Pending" },
  { value: "unavailable", label: "Off" },
]

export function StaffView() {
  const { data, openProfile } = useScheduling()
  const [tab, setTab] = useState<AvailabilityStatus | "all">("all")
  const [department, setDepartment] = useState("all")
  const [search, setSearch] = useState("")

  const roster = useMemo(() => {
    return data.staff.filter((s) => {
      if (tab !== "all" && s.availabilityStatus !== tab) return false
      if (department !== "all" && s.department !== department) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!`${s.name} ${s.role} ${s.skills.join(" ")}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tab, data.staff, department, search])

  const stats = useMemo(() => {
    const total = data.staff.length
    const available = data.staff.filter((s) => s.availabilityStatus === "available").length
    const scheduled = data.staff.filter((s) => s.availabilityStatus === "scheduled").length
    const avgConfirm = total > 0 ? Math.round(data.staff.reduce((a, s) => a + s.confirmationRate, 0) / total) : 0
    return { total, available, scheduled, avgConfirm }
  }, [data.staff])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Total crew" value={stats.total} accent="text-neon-purple" />
        <MiniStat label="Available now" value={stats.available} accent="text-neon-green" />
        <MiniStat label="Scheduled" value={stats.scheduled} accent="text-neon-cyan" />
        <MiniStat label="Avg confirm rate" value={`${stats.avgConfirm}%`} accent="text-neon-amber" />
      </div>

      <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as AvailabilityStatus | "all")}>
            <TabsList>
              {AVAIL_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roster.map((staff) => (
          <StaffCard key={staff.id} staff={staff} onOpen={() => openProfile(staff)} />
        ))}
        {roster.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
            No crew match your filters.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
      <CardContent className="flex flex-col gap-0.5 p-3">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={cn("text-xl font-semibold", accent)}>{value}</span>
      </CardContent>
    </Card>
  )
}

function StaffCard({ staff, onOpen }: { staff: StaffMember; onOpen: () => void }) {
  const accent = departmentAccent[staff.department]
  const availability = availabilityMeta[staff.availabilityStatus]

  return (
    <Card className="group border-border/60 bg-card/70 py-0 backdrop-blur transition-colors hover:border-border">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarFallback className={cn("text-xs font-semibold", accent.text)}>
              {initials(staff.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onOpen} className="truncate text-sm font-semibold text-foreground hover:underline">
              {staff.name}
            </button>
            <p className="truncate text-xs text-muted-foreground">{staff.role}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", accent.dot)} aria-hidden />
              <span className="text-[11px] text-muted-foreground">{staff.department}</span>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", availability.className)}>
            {availability.label}
          </Badge>
        </div>

        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <Mail className="size-3 shrink-0" /> {staff.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="size-3 shrink-0" /> {staff.phone}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {staff.credentials.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1 rounded-md bg-neon-green/10 px-1.5 py-0.5 text-[10px] text-neon-green"
            >
              <ShieldCheck className="size-2.5" />
              {c}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/50 pt-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="size-3" /> Confirmation rate
            </span>
            <span className="font-medium text-foreground">{staff.confirmationRate}%</span>
          </div>
          <Progress value={staff.confirmationRate} className="h-1.5" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" /> {staff.upcomingShifts} upcoming
            </span>
            <span>{staff.weeklyHours}h / week</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
