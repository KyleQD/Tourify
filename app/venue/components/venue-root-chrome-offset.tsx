"use client"

import { usePathname } from "next/navigation"

interface VenueRootChromeOffsetProps {
  children: React.ReactNode
}

/**
 * Root layout renders global `Nav` (h-16). `/venue/dashboard` uses `AppShell`, which already
 * offsets its own `main` with `pt-16` — avoid double padding there.
 */
export function VenueRootChromeOffset({ children }: VenueRootChromeOffsetProps) {
  const pathname = usePathname()
  const skipOffset = pathname.startsWith("/venue/dashboard")
  if (skipOffset) return <>{children}</>
  return <div className="min-w-0 pt-16">{children}</div>
}
