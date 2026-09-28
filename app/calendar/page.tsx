"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  RefreshCw,
  Ticket,
} from "lucide-react"

import type {
  PersonalCalendarItem,
  PersonalCalendarPayload,
  PersonalCalendarSource,
} from "@/lib/general/personal-calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SOURCE_LABELS: Record<PersonalCalendarSource, string> = {
  assignment: "Work",
  ticket: "Ticket",
  booking: "Booking",
}

const SOURCE_ICONS: Record<PersonalCalendarSource, typeof Ticket> = {
  assignment: BriefcaseBusiness,
  ticket: Ticket,
  booking: CalendarDays,
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default function CalendarPage() {
  const [payload, setPayload] = useState<PersonalCalendarPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/calendar/me", {
        credentials: "include",
        cache: "no-store",
      })
      const body = (await response.json().catch(() => null)) as
        | { data?: PersonalCalendarPayload; error?: string }
        | null
      if (!response.ok || !body?.data) {
        throw new Error(body?.error || "Your calendar could not be loaded.")
      }
      setPayload(body.data)
    } catch (requestError) {
      setPayload(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Your calendar could not be loaded.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sections = useMemo(() => {
    const now = Date.now()
    const items = payload?.items ?? []
    return {
      upcoming: items.filter((item) => new Date(item.startAt).getTime() >= now),
      past: items
        .filter((item) => new Date(item.startAt).getTime() < now)
        .reverse()
        .slice(0, 20),
    }
  }, [payload])

  function renderItems(items: PersonalCalendarItem[], empty: string) {
    if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>
    return (
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = SOURCE_ICONS[item.source]
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{item.title}</span>
                  <Badge variant="outline">{SOURCE_LABELS[item.source]}</Badge>
                  {item.conflictIds.length ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-300"
                    >
                      Time conflict
                    </Badge>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-slate-400">
                  {formatDateTime(item.startAt)}
                  {item.subtitle ? ` · ${item.subtitle}` : ""}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-7 w-7 text-cyan-300" aria-hidden="true" />
              <h1 className="text-2xl font-semibold">My calendar</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Your tickets, bookings, and Work Mode assignments in one agenda.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </header>

        {loading && !payload ? (
          <div className="py-16 text-center" aria-busy="true">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" aria-label="Loading calendar" />
          </div>
        ) : null}
        {error ? (
          <Card className="border-rose-900/50 bg-rose-950/30" role="alert">
            <CardContent className="flex gap-3 p-4 text-rose-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Calendar unavailable</p>
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {payload?.partial ? (
          <p className="text-sm text-amber-300" role="status">
            Some calendar sources are unavailable. Available commitments are still shown.
          </p>
        ) : null}
        {payload ? (
          <>
            <section aria-labelledby="upcoming-heading">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle id="upcoming-heading">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderItems(sections.upcoming, "No upcoming commitments.")}
                </CardContent>
              </Card>
            </section>
            <section aria-labelledby="past-heading">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle id="past-heading">Recent</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderItems(sections.past, "No recent commitments.")}
                </CardContent>
              </Card>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

