"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileArtistNav } from "@/components/artist/mobile-artist-nav"
import { ArtistProvider } from "@/contexts/artist-context"
import { useRouteAccountSync } from "@/hooks/use-route-account-sync"
import { pathnameRequiresArtistAccount } from "@/lib/artist/protected-routes"

function ArtistLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Automatically sync account with route
  const { isCorrectAccount } = useRouteAccountSync()
  
  // Check if this is a public artist profile (e.g., /artist/felix)
  // Exclude known dashboard routes
  const isDashboardRoute = pathnameRequiresArtistAccount(pathname)
  const isPublicProfile = pathname.match(/^\/artist\/[^\/]+$/) && !isDashboardRoute
  
  // For public profiles, don't show sidebar
  if (isPublicProfile) {
    return <>{children}</>
  }
  
  // For dashboard pages, show full layout with sidebar
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-black via-slate-950 to-black">
        {/* Hide the sidebar on small screens; keep desktop unchanged */}
        <div className="hidden md:block"><AppSidebar /></div>
        <main className="flex-1 overflow-hidden relative pb-16 md:pb-0">
          {/* Background Effects */}
          <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
          <div className="absolute inset-0 noise-texture pointer-events-none" />
          
          <div
            className="h-full overflow-auto p-4 lg:p-8 artist-content relative z-10 touch-pan-y focus-within:pb-24"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Show warning if not in correct account mode */}
            {!isCorrectAccount && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 text-sm">
                  ⚠️ You're viewing artist pages but not in artist mode. Switch to your artist account for the full experience.
                </p>
              </div>
            )}
            {children}
          </div>
          {/* Mobile bottom navigation for artist pages */}
          <MobileArtistNav />
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function ArtistLayout({ children }: { children: ReactNode }) {
  return (
    <ArtistProvider>
      <ArtistLayoutContent>{children}</ArtistLayoutContent>
    </ArtistProvider>
  )
} 