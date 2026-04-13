"use client"

import type React from "react"
import { GlobalNavigation } from "./global-navigation"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Global navigation is now a separate component */}
      <GlobalNavigation />

      {/* pt-16: clear root layout Nav (h-16). No md:pl-64: MainSidebar is hidden for /venue/* in GlobalNavigation, so extra inset was empty gutter. */}
      <main className="flex-1 pt-16 pb-16 md:pb-0">{children}</main>
    </div>
  )
}
