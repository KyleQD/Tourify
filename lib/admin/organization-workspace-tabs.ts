/**
 * Organization Workspace Navigation
 *
 * Grouped primary + secondary navigation for Organization pages.
 * Reduces 16 flat tabs to 6 primary groups.
 * Fixes: AUX-ORG-001
 */

import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  Globe,
  MessageSquare,
  DollarSign,
  Briefcase,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type OrganizationTabId =
  | "overview"
  | "team"
  | "settings"
  | "security"
  | "audit"
  | "capabilities"
  | "retention"
  | "tours"
  | "publishing"
  | "communications"
  | "workforce"
  | "finance"
  | "vendors"
  | "ticketing"
  | "observability"
  | "reporting";

export interface OrganizationWorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  primaryTab: OrganizationTabId;
  secondary: Array<{ id: OrganizationTabId; label: string }>;
}

/**
 * Grouped workspace navigation for Organization pages.
 * Reduces 16 flat tabs to 6 primary groups with secondary items.
 */
export const ORGANIZATION_WORKSPACE_GROUPS: OrganizationWorkspaceGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    primaryTab: "overview",
    secondary: [],
  },
  {
    id: "governance",
    label: "Governance",
    icon: Shield,
    primaryTab: "team",
    secondary: [
      { id: "team", label: "Team" },
      { id: "settings", label: "Settings" },
      { id: "security", label: "Security" },
      { id: "audit", label: "Audit" },
      { id: "capabilities", label: "Capabilities" },
      { id: "retention", label: "Retention" },
    ],
  },
  {
    id: "tours",
    label: "Tours & Publishing",
    icon: Globe,
    primaryTab: "tours",
    secondary: [
      { id: "tours", label: "Tours" },
      { id: "publishing", label: "Publishing" },
    ],
  },
  {
    id: "workforce",
    label: "Workforce",
    icon: Users,
    primaryTab: "workforce",
    secondary: [
      { id: "workforce", label: "Workforce" },
      { id: "communications", label: "Comms" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    primaryTab: "finance",
    secondary: [
      { id: "finance", label: "Finance" },
      { id: "vendors", label: "Vendors" },
      { id: "ticketing", label: "Ticketing" },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    icon: Activity,
    primaryTab: "observability",
    secondary: [
      { id: "observability", label: "Observability" },
      { id: "reporting", label: "Reporting" },
    ],
  },
];

/**
 * Resolve a flat tab to its workspace group.
 */
export function resolveOrganizationWorkspaceGroup(
  tab: OrganizationTabId
): OrganizationWorkspaceGroup | undefined {
  for (const group of ORGANIZATION_WORKSPACE_GROUPS) {
    if (group.primaryTab === tab) return group;
    if (group.secondary.some((s) => s.id === tab)) return group;
  }
  return undefined;
}

/**
 * Get the default tab for a workspace group.
 */
export function getDefaultTabForOrganizationGroup(
  groupId: string
): OrganizationTabId {
  const group = ORGANIZATION_WORKSPACE_GROUPS.find((g) => g.id === groupId);
  return group?.primaryTab ?? "overview";
}
