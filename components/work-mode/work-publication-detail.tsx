"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { WorkModeApiResponse, WorkModePublication } from "@/types/hiring-roster-work-mode"

interface WorkPublicationDetailPayload {
  publication: WorkModePublication
  generatedAt: string
}

function formatDateTime(value: string | null): string {
  if (!value) return "Time not published"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function text(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return null
}

function items(payload: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = payload[key]
    if (!Array.isArray(value)) continue
    return value.map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        return text(record, "title", "name", "label", "description", "time") || "Published item"
      }
      return String(item)
    })
  }
  return []
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 text-sm text-zinc-100">{value || "Not shared yet"}</dd></div>
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><h3 className="font-medium text-zinc-100">{title}</h3>{values.length ? <ul className="mt-2 space-y-1 text-sm text-zinc-300">{values.map((value, index) => <li key={`${value}:${index}`}>• {value}</li>)}</ul> : <p className="mt-2 text-sm text-zinc-500">Not shared yet</p>}</div>
}

function TypedPublicationContent({ publication }: { publication: WorkModePublication }) {
  const payload = publication.payload || {}
  switch (publication.publicationType) {
    case "advance":
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Venue contact" value={text(payload, "venue_contact_name", "venueContactName")} /><DetailField label="Access / load-in" value={text(payload, "access", "load_in", "loadIn")} /><DetailField label="Parking" value={text(payload, "parking")} /><DetailField label="Curfew" value={text(payload, "curfew")} /></dl><DetailList title="Advance notes" values={items(payload, "notes", "advance_items", "advanceItems")} /></>
    case "day_sheet":
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Date" value={text(payload, "date", "event_date")} /><DetailField label="Weather" value={text(payload, "weather")} /><DetailField label="First call" value={text(payload, "call_time", "callTime")} /><DetailField label="Venue" value={text(payload, "venue_name", "venueName")} /></dl><DetailList title="Schedule" values={items(payload, "schedule", "timeline", "run_of_show")} /><DetailList title="Contacts" values={items(payload, "contacts", "team_contacts")} /></>
    case "command_broadcast":
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Priority" value={text(payload, "priority", "severity")} /><DetailField label="Required action" value={text(payload, "required_action", "action")} /></dl><DetailList title="Broadcast" values={[text(payload, "message", "body", "content") || "Not shared yet"]} /></>
    case "site_map":
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Map" value={text(payload, "name", "map_name")} /><DetailField label="Revision" value={text(payload, "version", "revision")} /></dl><DetailList title="Zones and landmarks" values={items(payload, "zones", "pins", "landmarks")} /></>
    case "tour_publish":
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Tour" value={text(payload, "tour_name", "name")} /><DetailField label="Current leg" value={text(payload, "leg", "current_leg")} /><DetailField label="Travel" value={text(payload, "travel_summary", "travel")} /><DetailField label="Lodging" value={text(payload, "lodging_summary", "lodging")} /></dl><DetailList title="Stops" values={items(payload, "stops", "tour_stops")} /><DetailList title="Tour contacts" values={items(payload, "contacts", "tour_contacts")} /></>
    case "event_publish":
    default:
      return <><dl className="grid gap-3 sm:grid-cols-2"><DetailField label="Call time" value={text(payload, "call_time", "callTime")} /><DetailField label="End time" value={text(payload, "end_time", "endTime")} /><DetailField label="Timezone" value={text(payload, "timezone")} /><DetailField label="Reporting location" value={text(payload, "reporting_location", "location")} /><DetailField label="Directions" value={text(payload, "directions")} /><DetailField label="Supervisor" value={text(payload, "supervisor_contact", "supervisor")} /><DetailField label="Attire / PPE / credentials" value={text(payload, "attire_ppe_credentials", "attire", "ppe")} /><DetailField label="Breaks" value={text(payload, "breaks", "break_policy")} /><DetailField label="Hazards" value={text(payload, "hazards")} /><DetailField label="Emergency procedure" value={text(payload, "emergency_procedure")} /><DetailField label="Emergency contact" value={text(payload, "emergency_contact")} /><DetailField label="Notes" value={text(payload, "notes")} /></dl><DetailList title="Attachments" values={items(payload, "attachments", "files")} /></>
  }
}

export function WorkPublicationDetail({ publicationId }: { publicationId: string }) {
  const [data, setData] = useState<WorkPublicationDetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/work/publications/${publicationId}`, {
          credentials: "include",
          cache: "no-store",
        })
        const payload = (await response.json().catch(() => null)) as
          | WorkModeApiResponse<WorkPublicationDetailPayload>
          | null
        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error || "Work packet could not be loaded.")
        }
        if (!cancelled) setData(payload.data)
      } catch (requestError) {
        if (!cancelled) {
          setData(null)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Work packet could not be loaded.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [publicationId])

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 px-4 py-5 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
          <Link href="/work/packets">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Work packets
          </Link>
        </Button>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-zinc-400" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading work packet" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-900/50 bg-rose-950/30" role="alert">
            <CardContent className="flex gap-3 p-4 text-rose-100">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Packet unavailable</p>
                <p className="text-sm text-rose-200/80">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {data?.publication ? (
          <>
            <header className="border-b border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <FileText className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Work packet</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">{data.publication.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  {data.publication.publicationType.replaceAll("_", " ")}
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  Published {formatDateTime(data.publication.publishedAt)}
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  Version {data.publication.version}
                </Badge>
              </div>
            </header>

            <Card className="border-zinc-800 bg-zinc-900/80">
              <CardHeader>
                <CardTitle className="text-zinc-100">Summary</CardTitle>
                <CardDescription className="text-zinc-400">
                  Worker-visible details published by the organizer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <TypedPublicationContent publication={data.publication} />
                {data.publication.href && data.publication.href !== `/work/publications/${data.publication.id}` ? (
                  <Button asChild>
                    <Link href={data.publication.href}>
                      Open linked packet
                      <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

          </>
        ) : null}
      </div>
    </main>
  )
}
