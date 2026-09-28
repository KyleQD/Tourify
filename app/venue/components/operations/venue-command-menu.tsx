"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  MessageSquare,
  Package,
  ScanLine,
  Settings,
  ShieldCheck,
  SquareKanban,
  Ticket,
  Users,
  Wrench,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  getVenueRoutesByGroup,
  VENUE_NAV_GROUPS,
  type VenueRouteDefinition,
} from "@/lib/venue/route-registry"

/**
 * Canonical Venue command search (VEN-298).
 *
 * Navigation entries are derived exclusively from lib/venue/route-registry.ts.
 * No fabricated results, no hardcoded "recent" items: only real, registered routes.
 */

const ICONS: Record<string, LucideIcon> = {
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

interface VenueCommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VenueCommandMenu({ open, onOpenChange }: VenueCommandMenuProps) {
  const router = useRouter()

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const runCommand = (route: VenueRouteDefinition) => {
    onOpenChange(false)
    router.push(route.href)
  }

  const groups = VENUE_NAV_GROUPS.map((group) => ({
    ...group,
    routes: getVenueRoutesByGroup(group.id).filter((route) => route.commandNav),
  })).filter((group) => group.routes.length > 0)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Go to a Venue tab…" />
      <CommandList>
        <CommandEmpty>No matching Venue tab.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup
            key={group.id}
            heading={group.id === "command" ? "Venue Navigation" : group.label}
          >
            {group.routes.map((route) => {
              const Icon = ICONS[route.iconKey] ?? Building2
              return (
                <CommandItem key={route.id} onSelect={() => runCommand(route)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{route.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
