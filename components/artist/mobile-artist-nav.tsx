"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { usePathname } from "next/navigation"
import {
  Home,
  Music2,
  Calendar,
  Video,
  Settings,
  LayoutDashboard,
  Users,
  ShoppingBag,
  TrendingUp,
  Tag,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function MobileArtistNav() {
  const pathname = usePathname()

  const primaryItems: MobileNavItem[] = [
    { label: "Dashboard", href: "/artist", icon: LayoutDashboard },
    { label: "Feed", href: "/artist/feed", icon: Home },
    { label: "Music", href: "/artist/music", icon: Music2 },
    { label: "Events", href: "/artist/events", icon: Calendar }
  ]

  const overflowItems: MobileNavItem[] = [
    { label: "Content", href: "/artist/content", icon: Video },
    { label: "Store", href: "/artist/store", icon: ShoppingBag },
    { label: "Community", href: "/artist/community", icon: Users },
    { label: "Business", href: "/artist/business", icon: ShoppingBag },
    { label: "Features", href: "/artist/features", icon: TrendingUp },
    { label: "EPK", href: "/artist/epk", icon: Tag },
    { label: "Messages", href: "/artist/messages", icon: MessageSquare },
    { label: "Profile", href: "/artist/profile", icon: Settings }
  ]

  return (
    <nav
      role="navigation"
      aria-label="Artist primary navigation"
      className={
        cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "backdrop-blur supports-[backdrop-filter]:bg-black/60",
          "border-t border-slate-800/60",
          "bg-gradient-to-t from-black/80 to-slate-950/40",
          // Prevent accidental scroll chaining and provide stable touch behavior
          "select-none"
        )
      }
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 items-center">
        {primaryItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <li key={item.href} className="text-center">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center py-2 gap-1",
                  "text-xs font-medium",
                  "transition-colors",
                  isActive ? "text-white" : "text-slate-300 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-purple-400" : "text-slate-400")} />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          )
        })}
        <li className="text-center">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="More"
                className={cn(
                  "w-full flex flex-col items-center justify-center py-2 gap-1",
                  "text-xs font-medium text-slate-300 hover:text-white"
                )}
              >
                <Settings className="h-5 w-5 text-slate-400" />
                <span className="leading-none">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-4" data-state>
              <SheetHeader>
                <SheetTitle>Artist navigation</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {overflowItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                        "border-slate-800 bg-slate-900/40 hover:bg-slate-900/70",
                        isActive ? "text-white" : "text-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  )
}

interface MobileNavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}


