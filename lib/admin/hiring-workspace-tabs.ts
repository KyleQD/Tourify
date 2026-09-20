/**
 * Hiring Workspace Navigation
 *
 * Grouped primary + secondary navigation for Hiring pages.
 * Reduces 7 flat tabs to 4 primary groups.
 * Fixes: AUX-HIR-001
 */

import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type HiringTabId =
  | "overview"
  | "jobs"
  | "applications"
  | "onboarding"
  | "roster"
  | "templates"
  | "audit";

export interface HiringWorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  primaryTab: HiringTabId;
  secondary: Array<{ id: HiringTabId; label: string }>;
}

/**
 * Grouped workspace navigation for Hiring pages.
 * Reduces 7 flat tabs to 4 primary groups with secondary items.
 */
export const HIRING_WORKSPACE_GROUPS: HiringWorkspaceGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    primaryTab: "overview",
    secondary: [],
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: BriefcaseBusiness,
    primaryTab: "jobs",
    secondary: [
      { id: "jobs", label: "Jobs" },
      { id: "applications", label: "Applications" },
    ],
  },
  {
    id: "onboard",
    label: "Onboard & Roster",
    icon: Users,
    primaryTab: "onboarding",
    secondary: [
      { id: "onboarding", label: "Onboarding" },
      { id: "roster", label: "Roster" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: FileText,
    primaryTab: "templates",
    secondary: [
      { id: "templates", label: "Templates" },
      { id: "audit", label: "Audit" },
    ],
  },
];

/**
 * Resolve a flat tab to its workspace group.
 */
export function resolveHiringWorkspaceGroup(
  tab: HiringTabId
): HiringWorkspaceGroup | undefined {
  for (const group of HIRING_WORKSPACE_GROUPS) {
    if (group.primaryTab === tab) return group;
    if (group.secondary.some((s) => s.id === tab)) return group;
  }
  return undefined;
}

/**
 * Get the default tab for a workspace group.
 */
export function getDefaultTabForHiringGroup(groupId: string): HiringTabId {
  const group = HIRING_WORKSPACE_GROUPS.find((g) => g.id === groupId);
  return group?.primaryTab ?? "overview";
}
