import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Clipboard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Truck,
  Users,
  Wallet,
} from "lucide-react"

export const VENUE_EVENT_OPS_TAB_VALUES = [
  "overview",
  "tickets",
  "people",
  "logistics",
  "advancing",
  "day-sheet",
  "communications",
  "money",
] as const

export type VenueEventOpsTab = (typeof VENUE_EVENT_OPS_TAB_VALUES)[number]

export interface VenueEventOpsTabDefinition {
  value: VenueEventOpsTab
  label: string
  icon: LucideIcon
}

const TAB_SET = new Set<string>(VENUE_EVENT_OPS_TAB_VALUES)

export function normalizeVenueEventOpsTab(value: string | null | undefined): VenueEventOpsTab {
  if (!value) return "overview"
  const normalized = value.trim().toLowerCase()
  if (TAB_SET.has(normalized)) return normalized as VenueEventOpsTab
  if (normalized === "staff" || normalized === "participants") return "people"
  if (normalized === "finances" || normalized === "finance") return "money"
  if (normalized === "site-map" || normalized === "equipment") return "logistics"
  if (normalized === "comms" || normalized === "communication") return "communications"
  if (normalized === "daysheet") return "day-sheet"
  if (normalized === "advance") return "advancing"
  return "overview"
}

export const VENUE_EVENT_OPS_TABS: VenueEventOpsTabDefinition[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "tickets", label: "Tickets", icon: Ticket },
  { value: "people", label: "People", icon: Users },
  { value: "logistics", label: "Logistics", icon: Truck },
  { value: "advancing", label: "Advance", icon: FileText },
  { value: "day-sheet", label: "Day Sheet", icon: Clipboard },
  { value: "communications", label: "Comms", icon: MessageSquare },
  { value: "money", label: "Money", icon: Wallet },
]
