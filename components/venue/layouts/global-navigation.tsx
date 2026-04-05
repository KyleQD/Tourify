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

  const isVenueRoute = pathname.startsWith("/venue")

  return (
    <>
      {/* Desktop sidebar - stays visible and switches to venue mode on /venue routes */}
      <MainSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} mode={isVenueRoute ? "venue" : "default"} />

      {/* Top navigation - always present */}
      <TopNavigation onSidebarOpen={() => setSidebarOpen(true)} onCommandOpen={() => setCommandOpen(true)} />

      {/* Mobile navigation - always present */}
      <MobileNavigation />

      {/* Command menu - always present */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
