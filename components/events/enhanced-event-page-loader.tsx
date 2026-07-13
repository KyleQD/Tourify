"use client"

import dynamic from "next/dynamic"
import { paCard, paHeroAspect, paHeroFrame, paShell, paStickyInner } from "@/components/public-artist/public-artist-ui"
import { cn } from "@/lib/utils"

function EventPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black pb-16 text-white">
      <div className={cn(paShell, "pt-6")}>
        <div className={paHeroFrame}>
          <div className={cn(paHeroAspect, "animate-pulse bg-gradient-to-br from-purple-950/80 via-slate-900 to-slate-950")}>
            <div className="absolute inset-x-0 bottom-0 space-y-4 p-6 sm:p-8">
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-white/10" />
                <div className="h-6 w-24 rounded-full bg-white/10" />
              </div>
              <div className="h-10 w-2/3 max-w-md rounded-xl bg-white/15" />
              <div className="h-4 w-1/2 max-w-sm rounded bg-white/10" />
              <div className="flex gap-2 pt-2">
                <div className="h-9 w-28 rounded-full bg-purple-500/30" />
                <div className="h-9 w-28 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(paShell, "space-y-6 py-8")}>
        <div className={cn(paStickyInner, "h-12 animate-pulse p-1")}>
          <div className="grid h-full grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={cn(paCard, "h-64 animate-pulse lg:col-span-2")} />
          <div className={cn(paCard, "h-64 animate-pulse")} />
        </div>
        <p className="text-center text-sm text-white/45">Loading event…</p>
      </div>
    </div>
  )
}

const EnhancedEventPage = dynamic(
  () =>
    import("@/components/events/enhanced-event-page").then((mod) => ({
      default: mod.EnhancedEventPage,
    })),
  {
    ssr: false,
    loading: () => <EventPageSkeleton />,
  }
)

interface EnhancedEventPageLoaderProps {
  eventId: string
  event: object
}

export function EnhancedEventPageLoader({ eventId, event }: EnhancedEventPageLoaderProps) {
  return <EnhancedEventPage eventId={eventId} event={event as never} />
}
