"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BedDouble, Briefcase, CalendarDays, Loader2, MapPin, MessageSquare, Plane } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface WorkerOpsDashboardData {
  staffMembers: Array<{ id: string; status: string | null; position: string | null }>
  assignments: Array<{ id: string; roleTitle: string | null; status: string | null; eventId: string | null; tourId: string | null }>
  shifts: Array<{
    id: string
    shiftDate: string | null
    startTime: string | null
    endTime: string | null
    role: string | null
    status: string | null
    zone: string | null
  }>
  tasks: Array<{ id: string; title: string; status: string | null; dueDate: string | null; priority: string | null }>
  lodging: Array<{ id: string; guestName: string | null; roomNumber: string | null; status: string | null }>
  travel: Array<{ id: string; groupName: string | null; status: string | null; role: string | null }>
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  return <Badge variant="outline">{status.replaceAll("_", " ")}</Badge>
}

export function WorkerOpsDashboard() {
  const [data, setData] = useState<WorkerOpsDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/staff/ops", { credentials: "include", cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "Failed to load staff ops")
        if (!cancelled) setData(payload.data)
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Failed to load staff ops")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your assignments…
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!data) return null

  const hasAnything =
    data.shifts.length > 0 ||
    data.tasks.length > 0 ||
    data.lodging.length > 0 ||
    data.travel.length > 0 ||
    data.assignments.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My staff ops</h1>
          <p className="text-sm text-muted-foreground">
            Shifts, tasks, lodging, and travel assigned after you were hired.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/messages?tab=work">
            <MessageSquare className="mr-2 h-4 w-4" />
            Work messages
          </Link>
        </Button>
      </div>

      {!hasAnything ? (
        <Card>
          <CardHeader>
            <CardTitle>No assignments yet</CardTitle>
            <CardDescription>
              Once your hiring admin approves you and assigns shifts or travel, they will show up here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Briefcase className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Roster status</CardTitle>
              <CardDescription>Your hire records</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.staffMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not on a roster yet.</p>
            ) : (
              data.staffMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{member.position || "Staff"}</span>
                  <StatusBadge status={member.status} />
                </div>
              ))
            )}
            {data.assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{assignment.roleTitle || "Assignment"}</span>
                <StatusBadge status={assignment.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <CalendarDays className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Shifts</CardTitle>
              <CardDescription>Upcoming schedule</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts assigned.</p>
            ) : (
              data.shifts.map((shift) => (
                <div key={shift.id} className="space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{shift.role || "Shift"}</span>
                    <StatusBadge status={shift.status} />
                  </div>
                  <p className="text-muted-foreground">
                    {[shift.shiftDate, shift.startTime && shift.endTime ? `${shift.startTime}–${shift.endTime}` : null, shift.zone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <MapPin className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Tasks</CardTitle>
              <CardDescription>Assigned work items</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned.</p>
            ) : (
              data.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.dueDate ? <p className="text-muted-foreground">Due {task.dueDate}</p> : null}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <BedDouble className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Lodging</CardTitle>
              <CardDescription>Hotel / room assignments</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lodging.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lodging assigned.</p>
            ) : (
              data.lodging.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {row.guestName || "Guest"}
                    {row.roomNumber ? ` · Room ${row.roomNumber}` : ""}
                  </span>
                  <StatusBadge status={row.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Plane className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Travel</CardTitle>
              <CardDescription>Travel group membership</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.travel.length === 0 ? (
              <p className="text-sm text-muted-foreground">No travel groups yet.</p>
            ) : (
              data.travel.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {row.groupName || "Travel group"}
                    {row.role ? ` · ${row.role}` : ""}
                  </span>
                  <StatusBadge status={row.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
