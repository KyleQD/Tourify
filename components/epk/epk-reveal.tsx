"use client"

import React, { useEffect, useRef, useState } from "react"
import type { ResolvedEpkMotion } from "@/lib/epk/epk-appearance"

const HIDDEN_STYLE: Record<ResolvedEpkMotion["style"], React.CSSProperties> = {
  none: {},
  fade: { opacity: 0 },
  rise: { opacity: 0, transform: "translate3d(0, 28px, 0)" },
  zoom: { opacity: 0, transform: "scale(0.96)" },
  blur: { opacity: 0, filter: "blur(10px)", transform: "translate3d(0, 12px, 0)" },
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

interface EpkRevealProps {
  motion?: ResolvedEpkMotion
  index?: number
  className?: string
  children: React.ReactNode
}

/** Scroll-triggered entrance for EPK sections. Honors prefers-reduced-motion. */
export function EpkReveal({ motion, index = 0, className, children }: EpkRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const style = motion?.style ?? "none"
  const [visible, setVisible] = useState(style === "none")

  useEffect(() => {
    const el = ref.current
    if (
      style === "none" ||
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true)
      return
    }
    setVisible(false)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [style, motion?.durationMs])

  if (!motion || style === "none") {
    return <div className={className}>{children}</div>
  }

  const delay = index < 4 ? index * motion.staggerMs : 0
  const transition = ["opacity", "transform", "filter"]
    .map((prop) => `${prop} ${motion.durationMs}ms ${EASE} ${delay}ms`)
    .join(", ")

  return (
    <div
      ref={ref}
      className={className}
      style={visible ? { transition } : { ...HIDDEN_STYLE[style], transition }}
    >
      {children}
    </div>
  )
}
