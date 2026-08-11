"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, ClipboardList, Home, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { label: "Home", href: "/venue/dashboard", icon: Home },
  { label: "Bookings", href: "/venue/bookings", icon: ClipboardList },
  { label: "Today", href: "/venue/dashboard/calendar", icon: CalendarDays },
  { label: "Door", href: "/venue/dashboard/tickets?view=check-in", icon: ScanLine },
]

export function MobileVenueNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isCheckInView =
    pathname.startsWith("/venue/events/") && pathname.endsWith("/check-in")
  const isTicketsCheckIn =
    pathname === "/venue/dashboard/tickets" && searchParams.get("view") === "check-in"

  return (
    <nav
      aria-label="Venue primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const [path] = item.href.split("?")
          const isDoor = item.label === "Door"
          const active = isDoor
            ? isCheckInView || isTicketsCheckIn
            : path === "/venue/dashboard"
              ? pathname === path || pathname === "/venue"
              : pathname === path || pathname.startsWith(`${path}/`)

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition-colors",
                  active ? "bg-emerald-500/10 text-emerald-200" : "text-zinc-500 hover:text-zinc-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
