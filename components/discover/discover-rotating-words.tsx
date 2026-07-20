"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

const ROTATING_PHRASES = [
  "New artists",
  "Top Music",
  "New Albums",
  "Upcoming Shows",
] as const

const CYCLE_MS = 2500

export function DiscoverRotatingWords() {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_PHRASES.length)
    }, CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [prefersReducedMotion])

  const phrase = ROTATING_PHRASES[index]

  if (prefersReducedMotion) {
    return (
      <span className="text-slate-300" aria-live="polite">
        {ROTATING_PHRASES[0]}
      </span>
    )
  }

  return (
    <span
      className="relative inline-flex h-[1.15em] min-w-[12ch] items-center overflow-hidden md:min-w-[14ch]"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={phrase}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 flex items-center whitespace-nowrap text-slate-300"
        >
          {phrase}
        </motion.span>
      </AnimatePresence>
      {/* Reserve width so layout doesn't jump between phrases */}
      <span className="invisible whitespace-nowrap" aria-hidden>
        Upcoming Shows
      </span>
    </span>
  )
}
