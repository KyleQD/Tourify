"use client"

import type { ReactNode } from "react"

interface StandardPostFallbackProps {
  children: ReactNode
  className?: string
}

/**
 * Fallback wrapper used when styled rendering fails or is unavailable.
 * Renders children with the standard post card presentation.
 */
export function StandardPostFallback({ children, className }: StandardPostFallbackProps) {
  return (
    <div className={className} data-post-appearance-fallback>
      {children}
    </div>
  )
}
