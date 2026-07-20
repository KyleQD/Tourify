import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarRange, MapPin, Route } from "lucide-react"
import { fetchPublicTourBySlug } from "@/lib/discover/tours"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export const dynamic = "force-dynamic"

export default async function PublicTourPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tour, stops } = await fetchPublicTourBySlug(slug)

  if (!tour) notFound()

  const dateLabel = (() => {
    const start = formatSafeDate(tour.start_date || tour.next_event_date || null)
    const end = formatSafeDate(tour.end_date || null)
    if (start && end && start !== end) return `${start} – ${end}`
    return start || "Dates TBA"
  })()

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-slate-100">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 md:px-6">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm text-slate-400">
            <Route className="h-4 w-4" />
            Tour
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{tour.name}</h1>
          {tour.description ? (
            <p className="max-w-2xl text-sm text-slate-400 md:text-base">{tour.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4" />
              {dateLabel}
            </span>
            <span>
              {tour.event_count} {tour.event_count === 1 ? "stop" : "stops"}
            </span>
            {(tour.artist_names || []).length > 0 ? (
              <span>{tour.artist_names?.join(", ")}</span>
            ) : null}
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Stops</h2>
          {stops.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-8 text-sm text-slate-400">
              No public stops listed for this tour yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {stops.map((stop) => {
                const location = [stop.venue_name, stop.venue_city, stop.venue_state]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <li key={stop.id}>
                    <Link
                      href={`/events/${stop.slug || stop.id}`}
                      className="block rounded-2xl border border-white/10 bg-slate-900/50 p-4 transition hover:border-white/25"
                    >
                      <p className="font-medium text-slate-100">{stop.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatSafeDate(stop.event_date) || "Date TBA"}
                      </p>
                      {location ? (
                        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-500">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>{location}</span>
                        </p>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="text-sm text-slate-500">
          <Link href="/discover" className="text-slate-300 underline-offset-4 hover:underline">
            Back to Discover
          </Link>
        </p>
      </div>
    </div>
  )
}
