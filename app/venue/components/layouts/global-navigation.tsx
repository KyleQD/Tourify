"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { MainSidebar } from "../navigation/main-sidebar"
import { TopNavigation } from "../navigation/top-navigation"
import { MobileNavigation } from "../navigation/mobile-navigation"
import { CommandMenu } from "../navigation/command-menu"

export function GlobalNavigation() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // ⌘/Ctrl+K opens command palette (TopNavigation hides on /venue/* so this keeps the shortcut)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return
      e.preventDefault()
      setCommandOpen(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Check if we're in a venue route
  const isVenueRoute = pathname.startsWith("/(venue)") || pathname.startsWith("/venue")

  return (
    <>
      {/* Desktop sidebar - hidden on venue routes (root layout Nav is primary chrome) */}
      <MainSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} className={isVenueRoute ? "hidden" : ""} />

      {/* Top bar: skip on /venue/* — root `Nav` is already fixed/sticky; a second header stacked at top-0 was redundant and sat under it (z-30 vs z-50). */}
      {!isVenueRoute ? (
        <TopNavigation onSidebarOpen={() => setSidebarOpen(true)} onCommandOpen={() => setCommandOpen(true)} />
      ) : null}

      {/* Mobile navigation - always present */}
      <MobileNavigation />

      {/* Command menu - always present */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
