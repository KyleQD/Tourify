/**
 * Logistics Workspace Navigation
 *
 * Compatibility navigation for the legacy Logistics client.
 * Comms and Maps are deliberately independent primary destinations.
 * Fixes: AUX-LOG-002
 */

import {
  Truck,
  Box,
  MessageSquare,
  MapPin,
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
 * Retains legacy tab ids while keeping Comms and Maps separate.
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
    id: "communications",
    label: "Comms",
    icon: MessageSquare,
    primaryTab: "communication",
    secondary: [],
  },
  {
    id: "maps",
    label: "Maps",
    icon: MapPin,
    primaryTab: "site-maps",
    secondary: [],
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
