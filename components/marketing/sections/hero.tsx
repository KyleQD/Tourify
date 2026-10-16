"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, ExternalLink, Play, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LandingHeroWithAuth } from "@/components/marketing/landing-hero-auth"
import { AuroraBg } from "@/components/marketing/motion/aurora-bg"
import { FeaturePreview } from "@/components/marketing/feature-previews"
import { accents } from "@/lib/marketing/accent"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

const BETA_URL = "https://demo.tourify.live"
const rotating = ["live events", "world tours", "venues", "crews", "fan nights"]

function RotatingWord() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI((v) => (v + 1) % rotating.length), 2600)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <span className="relative inline-flex min-w-[2ch] align-bottom">
      <span className="sr-only">live events</span>
      <span aria-hidden className="relative inline-block overflow-hidden pb-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={rotating[i]}
            initial={reduce ? false : { y: "70%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-70%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent"
          >
            {rotating[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}

function RouteBackdrop() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
    >
      <defs>
        <linearGradient id="hero-route" x1="0" x2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
          <stop offset="40%" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d="M-20 520 C 160 380, 260 600, 430 450 S 700 220, 860 340 S 1100 520, 1240 260"
        fill="none"
        stroke="url(#hero-route)"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        className="mkt-dash-flow"
      />
      {[
        [430, 450],
        [860, 340],
        [1100, 430],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <circle r="5" fill="#e9d5ff" />
          <circle r="10" fill="none" stroke="#c084fc" strokeOpacity="0.6" className="mkt-pulse-ring" style={{ transformOrigin: "center" }} />
        </g>
      ))}
    </svg>
  )
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <AuroraBg />
      <RouteBackdrop />
      <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_440px] lg:gap-14 lg:px-8 lg:pt-20 xl:grid-cols-[1fr_470px]">
        <div className="flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-400/30 bg-purple-950/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-100/95"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Open beta &middot; Free early access
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-[4.1rem]"
          >
            One platform for the future of <RotatingWord />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-xl text-pretty text-lg leading-relaxed text-slate-300"
          >
            Tourify brings artists, venues, crews, promoters and fans together. Route tours, sell tickets, schedule
            staff and keep every conversation in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Button
              asChild
              size="lg"
              className="gap-2 bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100"
            >
              <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                <Play className="h-4 w-4" aria-hidden />
                Try the Beta
                <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href="#platform">
                See how it works
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Find your side of the stage</p>
            <ul className="flex flex-wrap gap-2">
              {personas.map((p) => {
                const a = accents[p.accent]
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/solutions/${p.slug}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2",
                        a.border,
                        a.borderHover,
                        a.ring,
                      )}
                    >
                      <p.icon className={cn("h-4 w-4", a.text)} aria-hidden />
                      {p.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </motion.div>

          <div className="relative mt-2 hidden h-44 max-w-xl lg:block" aria-hidden>
            {(["tours", "ticketing", "bookings"] as const).map((slug, idx) => (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.55 + idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="absolute w-52 rounded-2xl border border-white/10 bg-slate-900/70 p-1 shadow-2xl shadow-black/40 backdrop-blur"
                style={{ left: `${idx * 34}%`, top: idx === 1 ? 0 : 18, rotate: idx === 1 ? "0deg" : idx === 0 ? "-3deg" : "3deg" }}
              >
                <FeaturePreview slug={slug} />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          id="get-started"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full scroll-mt-24"
        >
          <div className="relative rounded-3xl p-px">
            <div className="mkt-border-spin overflow-hidden rounded-3xl opacity-70" aria-hidden />
            <div className="relative rounded-3xl bg-slate-950/40 backdrop-blur-sm">
              <LandingHeroWithAuth />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
