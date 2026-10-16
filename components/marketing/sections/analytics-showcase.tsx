"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { SampleBadge } from "@/components/marketing/charts/sample-badge"
import { RadialGauge } from "@/components/marketing/charts/radial-gauge"
import { CountUp } from "@/components/marketing/motion/count-up"
import { Reveal } from "@/components/marketing/motion/reveal"
import { StatusBadge } from "@/components/marketing/status-badge"
import { cn } from "@/lib/utils"

const ChartFallback = () => <div className="h-full w-full animate-pulse rounded-xl bg-white/[0.04]" aria-hidden />

const RevenueChart = dynamic(() => import("@/components/marketing/charts/sample-charts").then((m) => m.RevenueChart), {
  ssr: false,
  loading: ChartFallback,
})
const AudienceChart = dynamic(() => import("@/components/marketing/charts/sample-charts").then((m) => m.AudienceChart), {
  ssr: false,
  loading: ChartFallback,
})
const CapacityChart = dynamic(() => import("@/components/marketing/charts/sample-charts").then((m) => m.CapacityChart), {
  ssr: false,
  loading: ChartFallback,
})

const tabs = [
  { id: "revenue", label: "Revenue by city", Chart: RevenueChart, caption: "Ticket revenue per stop on a sample run." },
  { id: "audience", label: "Audience growth", Chart: AudienceChart, caption: "Weekly follower growth for a sample artist." },
  { id: "capacity", label: "Capacity sold", Chart: CapacityChart, caption: "Share of capacity sold per night, sample venue." },
] as const

export function AnalyticsShowcase() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("revenue")
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]
  const Chart = current.Chart

  return (
    <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Analytics"
          title={
            <>
              Know how every show is <GradientText>really performing</GradientText>
            </>
          }
          description="Track sales, audience and capacity in the same place you plan the show. The charts below use sample data to show what you will see."
        />

        <Reveal className="mt-14">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-2xl shadow-black/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
              <div role="tablist" aria-label="Sample analytics views" className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls="analytics-panel"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                      tab === t.id ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <SampleBadge />
            </div>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_280px]">
              <div role="tabpanel" id="analytics-panel" aria-labelledby={`tab-${tab}`}>
                <p className="mb-3 text-sm text-slate-400">{current.caption}</p>
                <div className="h-72 sm:h-80">
                  <Chart />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Total revenue, sample run</p>
                  <CountUp to={130300} prefix="$" className="mt-1 block text-3xl font-bold text-white" />
                </div>
                <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <RadialGauge value={92} label="Friday" size={104} />
                  <p className="text-sm leading-snug text-slate-400">Capacity sold for the opening night in this sample.</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <StatusBadge status="beta" />
                  <Link href="/features/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-white">
                    About analytics <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
