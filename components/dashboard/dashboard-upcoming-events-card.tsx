"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, ArrowRight, Loader2, Compass } from "lucide-react"
import { format } from "date-fns"

interface AttendingEventItem {
  id: string
  title: string
  slug: string | null
  event_date: string
  start_time: string | null
  start_time_label?: string | null
  venue_name: string | null
  venue_city: string | null
  poster_url: string | null
  href: string
}

export function DashboardUpcomingEventsCard() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AttendingEventItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/events/me/attending", { credentials: "include" })
        const json = await res.json().catch(() => ({ data: [] }))
        if (!cancelled) setItems(Array.isArray(json?.data) ? json.data : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-purple-500/30">
            <Calendar className="h-4 w-4 text-purple-200" />
          </div>
          <div>
            <CardTitle className="text-white text-base">Upcoming Events</CardTitle>
            <CardDescription className="text-white/50 text-xs">
              Events you&apos;re attending
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <Button
              asChild
              className="w-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            >
              <Link href="/discover">
                <Compass className="h-4 w-4 mr-2" />
                Events near you
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {items.map((event) => {
              let dateLabel = event.event_date
              try {
                dateLabel = format(new Date(event.event_date), "MMM d, yyyy")
              } catch {
                // keep raw
              }
              const timeLabel = event.start_time_label || null
              const location = [event.venue_name, event.venue_city].filter(Boolean).join(" · ")

              return (
                <Link
                  key={`${event.id}`}
                  href={event.href}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-purple-300" />
                          {dateLabel}
                          {timeLabel ? ` · ${timeLabel}` : null}
                        </span>
                      </div>
                      {location ? (
                        <div className="flex items-center gap-1 text-xs text-white/50 truncate">
                          <MapPin className="h-3 w-3 text-red-300 shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-green-500/30 bg-green-500/10 text-green-300 text-[10px]"
                    >
                      Going
                    </Badge>
                  </div>
                </Link>
              )
            })}
            <Button
              asChild
              variant="ghost"
              className="w-full text-purple-200 hover:text-white hover:bg-white/10 rounded-full"
            >
              <Link href="/discover">
                Find more events
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
