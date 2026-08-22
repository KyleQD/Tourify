"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { MobileVenueNav } from "@/components/venue/mobile-venue-nav"
import { getVenuePublicProfilePath } from "@/lib/utils/public-profile-routes"
import {
  Activity,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Package,
  ScanLine,
  ExternalLink,
  Search,
  Settings,
  ShieldCheck,
  SquareKanban,
  Ticket,
  Users,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  getVenueRoutesByGroup,
  VENUE_NAV_GROUPS,
  type VenueRouteDefinition,
} from "@/lib/venue/route-registry"
import { VenueCommandMenu } from "./venue-command-menu"

/**
 * Icon resolution for the canonical route registry (VEN-005/VEN-298).
 * Registry stays pure data; only this client component maps keys to lucide icons.
 */
const ROUTE_ICONS: Record<string, LucideIcon> = {
  home: Home,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  activity: Activity,
  message: MessageSquare,
  ticket: Ticket,
  scan: ScanLine,
  dollar: DollarSign,
  chart: BarChart3,
  users: Users,
  briefcase: BriefcaseBusiness,
  kanban: SquareKanban,
  shield: ShieldCheck,
  building: Building2,
  book: BookOpen,
  file: FileText,
  package: Package,
  wrench: Wrench,
  settings: Settings,
}

function iconFor(route: VenueRouteDefinition): LucideIcon {
  return ROUTE_ICONS[route.iconKey] ?? Building2
}

interface VenueNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: "pendingRequests" | "upcomingEvents" | "teamMembers"
}

interface VenueNavGroup {
  label: string
  items: VenueNavItem[]
}

function resolveRouteHref(route: VenueRouteDefinition, venueId?: string | null): string {
  if (route.id === "roles") {
    return venueId
      ? `/venue/staff/roles-permissions?venueId=${encodeURIComponent(venueId)}`
      : route.href
  }
  if (route.id === "hiring-board") {
    return venueId
      ? `/venue/dashboard/hiring-kanban?venue_id=${encodeURIComponent(venueId)}`
      : route.href
  }
  return route.href
}

function buildNavGroups(venueId?: string | null): VenueNavGroup[] {
  return VENUE_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: getVenueRoutesByGroup(group.id).map((route) => ({
      label: route.label,
      href: resolveRouteHref(route, venueId),
      icon: iconFor(route),
      badgeKey: route.badgeKey,
    })),
  }))
}

function isActivePath(pathname: string, href: string) {
  const [path] = href.split("?")
  if (path === "/venue/dashboard") return pathname === path || pathname === "/venue"
  if (path === "/venue/messages") return pathname === path || pathname.startsWith(`${path}/`)
  if (path === "/venue/dashboard/jobs")
    return pathname === path || pathname.startsWith(`${path}/`)
  if (path === "/venue/dashboard/hiring-kanban") return pathname === path
  return pathname === path || pathname.startsWith(`${path}/`)
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .filter((part) => part !== "venue")

  if (parts.length === 0) return ["Dashboard"]
  return parts.map((part) =>
    part
      .split("-")
      .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
      .join(" "),
  )
}

function VenueSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { venue, stats } = useCurrentVenue()
  const venueName = venue?.name || "Venue Operations"
  const location = venue?.location || "Physical location"
  const navGroups = useMemo(() => buildNavGroups(venue?.id), [venue?.id])

  const badgeValue = (key?: VenueNavItem["badgeKey"]) => {
    if (!key || !stats) return null
    const value = stats[key]
    if (!value || value <= 0) return null
    return String(value)
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-4">
        <Link href="/venue/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{venueName}</p>
            <p className="truncate text-xs text-zinc-400">{location}</p>
          </div>
        </Link>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-2">
            <p className="font-semibold text-zinc-100">{stats?.pendingRequests ?? 0}</p>
            <p className="text-zinc-500">Requests</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-2">
            <p className="font-semibold text-zinc-100">{stats?.upcomingEvents ?? 0}</p>
            <p className="text-zinc-500">Events</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-2">
            <p className="font-semibold text-zinc-100">{stats?.teamMembers ?? 0}</p>
            <p className="text-zinc-500">Staff</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-5 px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  const Icon = item.icon
                  const badge = badgeValue(item.badgeKey)

                  return (
                    <Link
                      key={`${item.label}-${item.href}`}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-h-10 items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {badge ? (
                        <Badge variant="secondary" className="ml-2 bg-zinc-800 text-zinc-300">
                          {badge}
                        </Badge>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="space-y-2 border-t border-zinc-800 p-3">
        {venue?.id ? (
          <Button asChild variant="outline" className="w-full justify-start border-zinc-700 bg-zinc-900 text-zinc-200">
            <Link
              href={
                getVenuePublicProfilePath({
                  id: venue.id,
                  url_slug: venue.url_slug || venue.username || null,
                }) || "/venues"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View public page
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="w-full justify-start border-zinc-700 bg-zinc-900 text-zinc-200">
          <Link href="/venues">
            <Search className="mr-2 h-4 w-4" />
            Venue directory
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function VenueOperationsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-800 lg:block">
          <VenueSidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open Venue navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 border-zinc-800 bg-zinc-950 p-0">
                  <VenueSidebarContent onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 items-center gap-1 text-sm text-zinc-400">
                <Link href="/venue/dashboard" className="hidden hover:text-zinc-100 sm:inline">
                  Venue
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
                    <ChevronRight className="hidden h-4 w-4 sm:block" />
                    <span
                      className={cn(
                        "truncate",
                        index === breadcrumbs.length - 1 ? "font-medium text-zinc-100" : "hidden sm:inline",
                      )}
                    >
                      {crumb}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="hidden justify-start gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100 sm:inline-flex"
                aria-keyshortcuts="Meta+K Control+K"
              >
                <Search className="h-4 w-4" />
                Search…
                <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 font-mono text-[10px] font-medium text-zinc-400 md:flex">
                  ⌘K
                </kbd>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden text-zinc-300 hover:text-zinc-100 sm:inline-flex">
                <Link href="/venue/messages">Messages</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden text-zinc-300 hover:text-zinc-100 sm:inline-flex">
                <Link href="/venue/bookings">New Requests</Link>
              </Button>
              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/venue/dashboard/jobs">Hire Staff</Link>
              </Button>
            </div>
          </header>

          <main id="main-content" className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Separator className="bg-zinc-900" />
      <Suspense fallback={null}>
        <MobileVenueNav />
      </Suspense>
      <Suspense fallback={null}>
        <VenueCommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
      </Suspense>
    </div>
  )
}
