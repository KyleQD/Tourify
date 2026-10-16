"use client"

import { useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SpotlightCardProps {
  children: ReactNode
  className?: string
  color?: string
}

export function SpotlightCard({ children, className, color = "rgba(168,85,247,0.22)" }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-colors duration-300 hover:border-white/20",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), ${color}, transparent 60%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}
