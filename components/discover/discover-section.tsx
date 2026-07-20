"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackDashboardUxEvent } from "@/lib/analytics/ux-event-client"

export function DiscoverSection({
  id,
  title,
  href,
  children,
  isLoading,
  isEmpty,
  emptyMessage,
  emptyActionHref,
  emptyActionLabel,
}: {
  id: string
  title: string
  href?: string
  children: ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage: string
  emptyActionHref?: string
  emptyActionLabel?: string
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackedRef = useRef(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node || trackedRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || trackedRef.current) return
        trackedRef.current = true
        void trackDashboardUxEvent({
          eventName: "discover_section_viewed",
          surface: "discover",
          metadata: { section: id },
        })
      },
      { threshold: 0.35 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [id])

  return (
    <section ref={sectionRef} id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {href ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/20 text-slate-200 hover:bg-white/10"
          >
            <Link href={href}>
              See all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-8 text-center">
          <p className="text-sm text-slate-300">{emptyMessage}</p>
          {emptyActionHref && emptyActionLabel ? (
            <Button asChild variant="outline" size="sm" className="mt-4 border-white/20">
              <Link href={emptyActionHref}>{emptyActionLabel}</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        children
      )}
    </section>
  )
}

export function DiscoverHorizontalRail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-thin scrollbar-thumb-white/10">
      {children}
    </div>
  )
}
