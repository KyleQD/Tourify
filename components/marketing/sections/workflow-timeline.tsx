"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Reveal } from "@/components/marketing/motion/reveal"
import { accents } from "@/lib/marketing/accent"
import { getFeature } from "@/lib/marketing/features"
import { cn } from "@/lib/utils"

const steps = [
  { title: "Plan", body: "Build the event or the tour and set the dates, capacity and lineup.", slug: "events" },
  { title: "Book", body: "Send requests, track replies and lock in confirmed shows.", slug: "bookings" },
  { title: "Promote and sell", body: "Publish pages people can find and open ticket sales.", slug: "ticketing" },
  { title: "Run the show", body: "Share the day sheet, schedule staff and keep everyone in sync.", slug: "logistics" },
  { title: "Review", body: "See how the night went and carry what you learned into the next one.", slug: "analytics" },
]

export function WorkflowTimeline() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it fits together"
          title={
            <>
              From first idea to <GradientText>last encore</GradientText>
            </>
          }
          description="One flow, five stages. Details carry forward so nobody re-enters the same information twice."
        />

        <ol ref={ref} className="relative mt-16 space-y-10">
          <div className="absolute bottom-2 left-5 top-2 w-px bg-white/10 md:left-1/2" aria-hidden />
          <motion.div
            className="absolute bottom-2 left-5 top-2 w-px origin-top bg-gradient-to-b from-purple-400 to-cyan-400 md:left-1/2"
            style={{ scaleY }}
            aria-hidden
          />
          {steps.map((s, i) => {
            const f = getFeature(s.slug)
            const a = f ? accents[f.accent] : accents.purple
            const right = i % 2 === 1
            return (
              <Reveal as="li" key={s.title} className="relative pl-14 md:pl-0">
                <span
                  className={cn(
                    "absolute left-5 top-6 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border bg-slate-950 md:left-1/2",
                    a.border,
                  )}
                  aria-hidden
                >
                  {f && <f.icon className={cn("h-4 w-4", a.text)} />}
                </span>
                <div className={cn("md:grid md:grid-cols-2 md:gap-16", right && "md:[&>*]:col-start-2")}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", a.text)}>Step {i + 1}</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
                    {f && (
                      <Link href={`/features/${f.slug}`} className="mt-3 inline-block text-sm font-medium text-purple-300 hover:text-white">
                        {f.title} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
