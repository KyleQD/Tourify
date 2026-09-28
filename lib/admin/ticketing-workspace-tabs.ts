/**
 * Ticketing Workspace Navigation
 *
 * Grouped primary + secondary navigation for Ticketing pages.
 * Reduces 12 flat tabs to 5 primary groups.
 * Fixes: AUX-TIX-001
 */

import {
  BarChart3,
  Settings,
  Download,
  DollarSign,
  Ticket,
  Tag,
  RotateCcw,
  Target,
  TrendingUp,
  Share2,
  type LucideIcon,
} from "lucide-react";

export type TicketingTabId =
  | "overview"
  | "setup"
  | "ticket-types"
  | "allocations"
  | "guests"
  | "admissions"
  | "promo-codes"
  | "refunds"
  | "campaigns"
  | "analytics"
  | "sharing"
  | "settings";

export interface TicketingWorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  primaryTab: TicketingTabId;
  secondary: Array<{ id: TicketingTabId; label: string }>;
}

/**
 * Grouped workspace navigation for Ticketing pages.
 * Reduces 12 flat tabs to 5 primary groups with secondary items.
 */
export const TICKETING_WORKSPACE_GROUPS: TicketingWorkspaceGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    primaryTab: "overview",
    secondary: [],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Settings,
    primaryTab: "setup",
    secondary: [
      { id: "setup", label: "Setup" },
      { id: "ticket-types", label: "Ticket Types" },
      { id: "allocations", label: "Allocations" },
    ],
  },
  {
    id: "sales",
    label: "Sales & Service",
    icon: DollarSign,
    primaryTab: "guests",
    secondary: [
      { id: "guests", label: "Guests / Comps" },
      { id: "refunds", label: "Refunds" },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    icon: Ticket,
    primaryTab: "admissions",
    secondary: [],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Target,
    primaryTab: "campaigns",
    secondary: [
      { id: "promo-codes", label: "Promo Codes" },
      { id: "campaigns", label: "Campaigns" },
      { id: "sharing", label: "Sharing" },
      { id: "analytics", label: "Analytics" },
      { id: "settings", label: "Settings" },
    ],
  },
];

/**
 * Resolve a flat tab to its workspace group.
 */
export function resolveTicketingWorkspaceGroup(
  tab: TicketingTabId
): TicketingWorkspaceGroup | undefined {
  for (const group of TICKETING_WORKSPACE_GROUPS) {
    if (group.primaryTab === tab) return group;
    if (group.secondary.some((s) => s.id === tab)) return group;
  }
  return undefined;
}

/**
 * Get the default tab for a workspace group.
 */
export function getDefaultTabForTicketingGroup(
  groupId: string
): TicketingTabId {
  const group = TICKETING_WORKSPACE_GROUPS.find((g) => g.id === groupId);
  return group?.primaryTab ?? "overview";
}
