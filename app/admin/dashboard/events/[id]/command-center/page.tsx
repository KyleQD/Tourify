"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, LayoutDashboard, Megaphone, Briefcase, Users, ArrowLeft } from "lucide-react"
function buildNoStoreInit(input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(input?.headers || {}),
    },
  }
}

interface HqSummary {
  event?: { id?: string; title?: string; venue_id?: string | null }
  userRole?: string | null
}

export default function EventCommandCenterPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [loading, setLoading] = useState(true)
  const [hq, setHq] = useState<HqSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/events/${eventId}/hq`, buildNoStoreInit())
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || res.statusText)
        if (!cancelled) setHq(json as HqSummary)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load event")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-red-300">
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const venueId = hq?.event?.venue_id

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/dashboard/events/${eventId}/hq`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Event HQ
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <LayoutDashboard className="h-7 w-7 text-cyan-400" />
          Command center
        </h1>
      </div>
      <p className="text-slate-400">
        {hq?.event?.title ? `Event: ${hq.event.title}` : `Event id: ${eventId}`}
        {hq?.userRole ? ` · Your role: ${hq.userRole}` : null}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Megaphone className="h-5 w-5 text-cyan-400" />
              Communications
            </CardTitle>
            <CardDescription>Bulletins and group chats for this event.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=bulletin`}>Open HQ bulletins</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Briefcase className="h-5 w-5 text-amber-400" />
              Jobs (facade)
            </CardTitle>
            <CardDescription>Unified read API across artist gigs and venue postings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href={venueId ? `/api/jobs?venue_id=${venueId}` : "/api/jobs"} target="_blank" rel="noreferrer">
                GET /api/jobs{venueId ? `?venue_id=…` : ""}
              </Link>
            </Button>
            <p className="mt-2 text-xs text-slate-500">Opens JSON in a new tab (for admins with a session on this origin).</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Users className="h-5 w-5 text-violet-400" />
              Staff & venue
            </CardTitle>
            <CardDescription>Deep links into existing dashboards (no duplicate roster UI here yet).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/venue/staff">Venue staff</Link>
            </Button>
            {venueId ? (
              <Button asChild variant="outline">
                <Link href={`/venue/dashboard/jobs`}>Venue jobs</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/jobs">Public jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
