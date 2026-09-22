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

/**
 * Grouped workspace navigation for Event detail pages.
 * Reduces 13 flat tabs to 5 primary groups with secondary items.
 * Fixes: AUX-EVT-009
 */
export interface EventWorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Primary tab when clicking this group */
  primaryTab: EventOpsTab;
  /** Secondary tabs within this group */
  secondary: Array<{
    id: EventOpsTab;
    label: string;
  }>;
}

export const EVENT_WORKSPACE_GROUPS: EventWorkspaceGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    primaryTab: "overview",
    secondary: [],
  },
  {
    id: "production",
    label: "Production",
    icon: Clipboard,
    primaryTab: "tasks",
    secondary: [
      { id: "tasks", label: "Tasks" },
      { id: "logistics", label: "Logistics" },
      { id: "advancing", label: "Advance" },
      { id: "day-sheet", label: "Day Sheet" },
      { id: "travel", label: "Travel" },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: Users,
    primaryTab: "people",
    secondary: [
      { id: "people", label: "Crew / Staff" },
      { id: "vendors", label: "Vendors" },
      { id: "access", label: "Access / Credentials" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: Wallet,
    primaryTab: "tickets",
    secondary: [
      { id: "tickets", label: "Ticketing" },
      { id: "money", label: "Finance" },
    ],
  },
  {
    id: "comms-insights",
    label: "Comms & Insights",
    icon: MessageSquare,
    primaryTab: "communications",
    secondary: [
      { id: "communications", label: "Communications" },
      { id: "analytics", label: "Analytics" },
    ],
  },
]

/**
 * Resolve a flat tab to its workspace group.
 */
export function resolveEventWorkspaceGroup(
  tab: EventOpsTab
): EventWorkspaceGroup | undefined {
  for (const group of EVENT_WORKSPACE_GROUPS) {
    if (group.primaryTab === tab) return group;
    if (group.secondary.some((s) => s.id === tab)) return group;
  }
  return undefined;
}

/**
 * Get the default tab for a workspace group.
 */
export function getDefaultTabForGroup(
  groupId: string
): EventOpsTab {
  const group = EVENT_WORKSPACE_GROUPS.find((g) => g.id === groupId);
  return group?.primaryTab ?? "overview";
}
