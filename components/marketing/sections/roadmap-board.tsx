"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { StatusBadge } from "@/components/marketing/status-badge"
import { featureStatusMeta, featureStatusOrder, type FeatureStatus } from "@/lib/marketing/feature-status"
import { cn } from "@/lib/utils"

interface Item {
  title: string
  body: string
  status: FeatureStatus
  href: string | null
}

const progress: Record<FeatureStatus, number> = {
  available: 100,
  beta: 75,
  "in-development": 40,
  planned: 10,
}

const bar: Record<FeatureStatus, string> = {
  available: "bg-emerald-400",
  beta: "bg-cyan-400",
  "in-development": "bg-amber-400",
  planned: "bg-slate-500",
}

export function RoadmapBoard({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<FeatureStatus | "all">("all")
  const sorted = [...items].sort((a, b) => featureStatusOrder.indexOf(a.status) - featureStatusOrder.indexOf(b.status))
  const shown = filter === "all" ? sorted : sorted.filter((i) => i.status === filter)
  const count = (s: FeatureStatus) => items.filter((i) => i.status === s).length

  return (
    <div className="mt-14">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label="Share of roadmap items by status">
          {featureStatusOrder.map((s) => (
            <motion.div
              key={s}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", bar[s])}
              initial={{ width: 0 }}
              whileInView={{ width: `${(count(s) / items.length) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter roadmap">
          {(["all", ...featureStatusOrder] as const).map((s) => {
            const on = filter === s
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(s)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                  on ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-slate-400 hover:text-white",
                )}
              >
                {s !== "all" && <span className={cn("h-1.5 w-1.5 rounded-full", featureStatusMeta[s].dot)} aria-hidden />}
                {s === "all" ? "Everything" : featureStatusMeta[s].label}
                <span className="text-slate-500">{s === "all" ? items.length : count(s)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <motion.ul layout className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((item) => {
            const inner = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={item.status} />
                  {item.href && (
                    <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-white" aria-hidden />
                  )}
                </div>
                <p className="mt-4 font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.body}</p>
                <div className="mt-auto pt-5">
                  <div className="h-1 overflow-hidden rounded-full bg-white/5">
                    <div className={cn("h-full rounded-full", bar[item.status])} style={{ width: `${progress[item.status]}%` }} />
                  </div>
                </div>
              </>
            )
            const cls =
              "group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-slate-950/60 p-5 transition hover:border-white/20"
            return (
              <motion.li
                key={item.title}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                {item.href ? (
                  <Link href={item.href} className={cn(cls, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300")}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}
