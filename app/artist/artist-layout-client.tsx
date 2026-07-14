"use client"

import { ReactNode, Suspense } from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileArtistNav } from "@/components/artist/mobile-artist-nav"
import { ArtistProvider } from "@/contexts/artist-context"
import { AccountRouteGuard } from "@/components/account/account-route-guard"
import { pathnameRequiresArtistAccount } from "@/lib/artist/protected-routes"
import { useMultiAccount } from "@/hooks/use-multi-account"

function ArtistDashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading Artist Dashboard</h2>
        <p className="text-gray-400">Setting up your music career hub...</p>
      </div>
    </div>
  )
}

function ArtistLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAccountsReady, accounts, isLoading: accountsLoading } = useMultiAccount()

  const isDashboardRoute = pathnameRequiresArtistAccount(pathname)
  const isPublicProfile = pathname.match(/^\/artist\/[^\/]+$/) && !isDashboardRoute

  if (isPublicProfile) {
    return <>{children}</>
  }

  if (isDashboardRoute && (!isAccountsReady || (accountsLoading && accounts.length === 0))) {
    return <ArtistDashboardLoading />
  }

  return (
    <SidebarProvider>
      <AccountRouteGuard />
      <div className="flex min-h-screen w-full bg-gradient-to-br from-black via-slate-950 to-black">
        <div className="hidden md:block"><AppSidebar /></div>
        <main className="relative flex-1 overflow-hidden pb-16 md:pb-0">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-purple-950/20" />
          <div className="pointer-events-none absolute right-1/4 top-0 h-[600px] w-[600px] rounded-full bg-purple-600/[0.04] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/[0.04] blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.03] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-30" />
          <div className="pointer-events-none absolute inset-0 noise-texture" />

          <div
            className="artist-content relative z-10 h-full touch-pan-y overflow-auto p-4 focus-within:pb-24 lg:p-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
          <MobileArtistNav />
        </main>
      </div>
    </SidebarProvider>
  )
}

export function ArtistLayoutClient({ children }: { children: ReactNode }) {
  return (
    <ArtistProvider>
      <Suspense fallback={<ArtistDashboardLoading />}>
        <ArtistLayoutContent>{children}</ArtistLayoutContent>
      </Suspense>
    </ArtistProvider>
  )
}
