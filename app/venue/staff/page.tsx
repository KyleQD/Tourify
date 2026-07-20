"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { AlertCircle, ArrowRight, BriefcaseBusiness, CalendarDays, ShieldCheck, Users } from "lucide-react"

interface TeamMember {
  id: string
  name?: string
  email?: string
  role?: string
  status?: string
  profiles?: {
    full_name?: string
    email?: string
  } | null
}

interface Shift {
  id: string
  shift_date?: string
  start_time?: string
  end_time?: string
  role_assignment?: string
  status?: string
}

export default function VenueStaffPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStaffData() {
      if (!venue?.id) return
      setIsLoading(true)
      setError(null)
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)
        const [teamRes, shiftsRes] = await Promise.all([
          fetch(`/api/venue/team?venue_id=${venue.id}`, { credentials: "include", cache: "no-store" }),
          fetch(
            `/api/venue/shifts?venue_id=${venue.id}&date_from=${today.toISOString().slice(0, 10)}&date_to=${nextWeek
              .toISOString()
              .slice(0, 10)}`,
            { credentials: "include", cache: "no-store" },
          ),
        ])
        const [teamPayload, shiftsPayload] = await Promise.all([teamRes.json(), shiftsRes.json()])
        if (!teamRes.ok || teamPayload.success === false) throw new Error(teamPayload.error || "Could not load team")
        setTeamMembers(Array.isArray(teamPayload.members) ? teamPayload.members : [])
        setShifts(Array.isArray(shiftsPayload.data) ? shiftsPayload.data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load staff data")
        setTeamMembers([])
        setShifts([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadStaffData()
  }, [venue?.id])

  const activeMembers = useMemo(
    () => teamMembers.filter((member) => (member.status || "active") === "active"),
    [teamMembers],
  )

  if (venueLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-md bg-zinc-900" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-28 rounded-md bg-zinc-900" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-900 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="mb-2 bg-sky-500/15 text-sky-200 hover:bg-sky-500/15">Venue Workforce</Badge>
          <h1 className="text-2xl font-semibold text-zinc-50">Staff Operations</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Manage venue-owned staff, hiring, roles, shifts, and Work Mode readiness for physical-location operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/venue/dashboard/jobs">Post Job</Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <Link href="/venue/dashboard/hiring-kanban">Hiring Board</Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <Link href="/venue/staff/scheduling">Open Schedule</Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <Link href="/venue/staff/roles-permissions">Roles</Link>
          </Button>
        </div>
      </section>

      {error ? (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-zinc-400">Active Staff</p>
              <p className="mt-1 text-2xl font-semibold">{activeMembers.length}</p>
            </div>
            <Users className="h-8 w-8 text-emerald-300" />
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-zinc-400">Next 7 Days</p>
              <p className="mt-1 text-2xl font-semibold">{shifts.length}</p>
            </div>
            <CalendarDays className="h-8 w-8 text-sky-300" />
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-zinc-400">Role Coverage</p>
              <p className="mt-1 text-2xl font-semibold">{new Set(activeMembers.map((member) => member.role)).size}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-amber-300" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="text-base">Team Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.length === 0 ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                No team members yet. Add staff manually or approve applicants through Venue hiring.
              </div>
            ) : (
              teamMembers.slice(0, 8).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border border-zinc-800 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.profiles?.full_name || member.name || "Team member"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{member.profiles?.email || member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-zinc-700 capitalize text-zinc-300">
                      {member.role || "member"}
                    </Badge>
                    <Badge className={(member.status || "active") === "active" ? "bg-emerald-600" : "bg-zinc-700"}>
                      {member.status || "active"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Button asChild variant="ghost" className="px-0 text-emerald-300 hover:text-emerald-200">
              <Link href="/venue/dashboard/jobs">
                Manage hiring and roster
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Shifts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shifts.length === 0 ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                No shifts are scheduled for the next week.
              </div>
            ) : (
              shifts.slice(0, 8).map((shift) => (
                <div key={shift.id} className="flex items-center justify-between rounded-md border border-zinc-800 p-3">
                  <div>
                    <p className="text-sm font-medium">{shift.role_assignment || "Shift"}</p>
                    <p className="text-xs text-zinc-500">
                      {shift.shift_date || "Date TBD"} {shift.start_time ? `• ${shift.start_time}` : ""}
                      {shift.end_time ? `-${shift.end_time}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-zinc-700 capitalize text-zinc-300">
                    {shift.status || "scheduled"}
                  </Badge>
                </div>
              ))
            )}
            <Button asChild variant="ghost" className="px-0 text-emerald-300 hover:text-emerald-200">
              <Link href="/venue/staff/scheduling">
                Open scheduling
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Need more venue staff?</p>
            <p className="text-sm text-zinc-400">
              Create public job posts and move applicants into onboarding before assigning them to shifts.
            </p>
          </div>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <Link href="/venue/dashboard/jobs">
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              Hiring Pipeline
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
