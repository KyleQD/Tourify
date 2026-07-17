import {
  BarChart3,
  Briefcase,
  Clipboard,
  FileText,
  LayoutDashboard,
  ListTodo,
  MapPin,
  MessageSquare,
  Shield,
  Ticket,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export const EVENT_OPS_TAB_VALUES = [
  "overview",
  "people",
  "vendors",
  "tasks",
  "tickets",
  "money",
  "logistics",
  "advancing",
  "day-sheet",
  "travel",
  "communications",
  "analytics",
  "access",
] as const

export type EventOpsTab = (typeof EVENT_OPS_TAB_VALUES)[number]

export interface EventOpsTabDefinition {
  value: EventOpsTab
  label: string
  icon: LucideIcon
}

export const EVENT_OPS_TAB_ALIASES: Record<string, EventOpsTab> = {
  staff: "people",
  participants: "people",
  locations: "people",
  finances: "money",
  finance: "money",
  "site-map": "logistics",
  "site-maps": "logistics",
  incidents: "tasks",
  comms: "communications",
  communication: "communications",
  advance: "advancing",
  daysheet: "day-sheet",
  "day-sheet-preview": "day-sheet",
  audit: "access",
}

const EVENT_OPS_TAB_SET = new Set<string>(EVENT_OPS_TAB_VALUES)

export function normalizeEventOpsTab(value: string | null | undefined): EventOpsTab {
  if (!value) return "overview"
  const normalized = value.trim().toLowerCase()
  if (!normalized) return "overview"
  if (EVENT_OPS_TAB_SET.has(normalized)) return normalized as EventOpsTab
  return EVENT_OPS_TAB_ALIASES[normalized] || "overview"
}

export const EVENT_OPS_TABS: EventOpsTabDefinition[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "people", label: "People", icon: Users },
  { value: "vendors", label: "Vendors", icon: Briefcase },
  { value: "tasks", label: "Tasks", icon: ListTodo },
  { value: "tickets", label: "Tickets", icon: Ticket },
  { value: "money", label: "Money", icon: Wallet },
  { value: "logistics", label: "Logistics", icon: Truck },
  { value: "advancing", label: "Advance", icon: FileText },
  { value: "day-sheet", label: "Day Sheet", icon: Clipboard },
  { value: "travel", label: "Travel", icon: MapPin },
  { value: "communications", label: "Comms", icon: MessageSquare },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "access", label: "Access", icon: Shield },
]
