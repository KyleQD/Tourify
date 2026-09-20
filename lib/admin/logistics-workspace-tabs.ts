/**
 * Logistics Workspace Navigation
 *
 * Grouped primary + secondary navigation for Logistics pages.
 * Reduces 8 flat tabs to 4 primary groups.
 * Fixes: AUX-LOG-002
 */

import {
  Truck,
  Building,
  Box,
  MessageSquare,
  MapPin,
  Zap,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type LogisticsTabId =
  | "overview"
  | "transportation"
  | "accommodations"
  | "equipment"
  | "backline"
  | "catering"
  | "communication"
  | "site-maps";

export interface LogisticsWorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  primaryTab: LogisticsTabId;
  secondary: Array<{ id: LogisticsTabId; label: string }>;
}

/**
 * Grouped workspace navigation for Logistics pages.
 * Reduces 8 flat tabs to 4 primary groups with secondary items.
 */
export const LOGISTICS_WORKSPACE_GROUPS: LogisticsWorkspaceGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Truck,
    primaryTab: "overview",
    secondary: [],
  },
  {
    id: "movement",
    label: "Movement",
    icon: Truck,
    primaryTab: "transportation",
    secondary: [
      { id: "transportation", label: "Transport" },
      { id: "accommodations", label: "Hotels & Flights" },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    icon: Box,
    primaryTab: "equipment",
    secondary: [
      { id: "equipment", label: "Equipment" },
      { id: "backline", label: "Backline" },
      { id: "catering", label: "Catering" },
    ],
  },
  {
    id: "comms-maps",
    label: "Comms & Maps",
    icon: MessageSquare,
    primaryTab: "communication",
    secondary: [
      { id: "communication", label: "Comms" },
      { id: "site-maps", label: "Site Maps" },
    ],
  },
];

/**
 * Resolve a flat tab to its workspace group.
 */
export function resolveLogisticsWorkspaceGroup(
  tab: LogisticsTabId
): LogisticsWorkspaceGroup | undefined {
  for (const group of LOGISTICS_WORKSPACE_GROUPS) {
    if (group.primaryTab === tab) return group;
    if (group.secondary.some((s) => s.id === tab)) return group;
  }
  return undefined;
}

/**
 * Get the default tab for a workspace group.
 */
export function getDefaultTabForLogisticsGroup(
  groupId: string
): LogisticsTabId {
  const group = LOGISTICS_WORKSPACE_GROUPS.find((g) => g.id === groupId);
  return group?.primaryTab ?? "overview";
}
