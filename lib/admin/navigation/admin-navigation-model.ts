/**
 * Admin Navigation Model
 *
 * Task-oriented Admin IA replacing feature-inventory navigation.
 * Fixes: AUX-IA-001, AUX-IA-002, AUX-IA-008, AUX-IA-009, AUX-FLOW-005
 *
 * Canonical first-level groups organized by work type, not subsystem taxonomy.
 */

import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Truck,
  Users,
  UserPlus,
  DollarSign,
  Ticket,
  Building2,
  Palette,
  Mic2,
  BarChart3,
  Settings,
  MessageSquare,
  Store,
  Package,
  Link2,
  Globe,
  Music,
  BookOpen,
  Send,
  Bell,
  type LucideIcon,
} from "lucide-react";

// ─── Navigation Item ─────────────────────────────────────────────────

export interface AdminNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  /** If set, this is a secondary item within a group */
  group?: string;
  /** Capability required to see this item */
  capability?: string;
  /** Whether this is a high-frequency operational item */
  operational?: boolean;
  /** Legacy aliases that should redirect to this item */
  legacyAliases?: string[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
  /** Capability required to see this entire group */
  capability?: string;
}

// ─── Canonical Navigation Model ──────────────────────────────────────

export const ADMIN_NAVIGATION: AdminNavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: LayoutDashboard,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        operational: true,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: MapPin,
    items: [
      {
        id: "tours",
        label: "Tours",
        href: "/admin/dashboard/tours",
        icon: MapPin,
        operational: true,
      },
      {
        id: "events",
        label: "Events",
        href: "/admin/dashboard/events",
        icon: Calendar,
        operational: true,
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/admin/dashboard/calendar",
        icon: Calendar,
        operational: true,
      },
      {
        id: "logistics",
        label: "Logistics",
        href: "/admin/dashboard/logistics",
        icon: Truck,
        operational: true,
      },
    ],
  },
  {
    id: "workforce",
    label: "Workforce",
    icon: Users,
    items: [
      {
        id: "staff",
        label: "Staff",
        href: "/admin/dashboard/staff",
        icon: Users,
        operational: true,
      },
      {
        id: "hiring",
        label: "Hiring",
        href: "/admin/dashboard/hiring",
        icon: UserPlus,
        operational: true,
      },
      {
        id: "payroll",
        label: "Payroll",
        href: "/admin/dashboard/payroll",
        icon: DollarSign,
      },
      {
        id: "rbac",
        label: "Roles & Permissions",
        href: "/admin/dashboard/rbac",
        icon: Settings,
        capability: "manage_team",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: DollarSign,
    items: [
      {
        id: "ticketing",
        label: "Ticketing",
        href: "/admin/dashboard/ticketing",
        icon: Ticket,
        operational: true,
      },
      {
        id: "finances",
        label: "Finances",
        href: "/admin/dashboard/finances",
        icon: DollarSign,
        operational: true,
      },
      {
        id: "marketplace",
        label: "Marketplace",
        href: "/admin/dashboard/marketplace",
        icon: Store,
      },
      {
        id: "store",
        label: "Store",
        href: "/admin/dashboard/store",
        icon: Store,
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/admin/dashboard/inventory",
        icon: Package,
      },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: Link2,
    items: [
      {
        id: "artists",
        label: "Artists",
        href: "/admin/dashboard/artists",
        icon: Palette,
      },
      {
        id: "venues",
        label: "Venues",
        href: "/admin/dashboard/venues",
        icon: Building2,
      },
      {
        id: "agencies",
        label: "Agencies",
        href: "/admin/dashboard/agencies",
        icon: Building2,
      },
      {
        id: "connections",
        label: "Connections",
        href: "/admin/dashboard/network",
        icon: Link2,
      },
      {
        id: "communications",
        label: "Communications",
        href: "/admin/dashboard/communications",
        icon: MessageSquare,
        operational: true,
      },
      {
        id: "publications",
        label: "Publication Deliveries",
        href: "/admin/dashboard/publications/deliveries",
        icon: Send,
      },
    ],
  },
  {
    id: "system",
    label: "Organization & System",
    icon: Settings,
    items: [
      {
        id: "organization",
        label: "Organization",
        href: "/admin/dashboard/organization",
        icon: Building2,
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/admin/dashboard/analytics",
        icon: BarChart3,
      },
      {
        id: "content",
        label: "Content Hub",
        href: "/admin/dashboard/content",
        icon: Globe,
      },
      {
        id: "music",
        label: "Music",
        href: "/admin/dashboard/music",
        icon: Music,
      },
      {
        id: "epk",
        label: "EPK",
        href: "/admin/dashboard/epk",
        icon: BookOpen,
      },
      {
        id: "website",
        label: "Website",
        href: "/admin/dashboard/website",
        icon: Globe,
      },
      {
        id: "feed",
        label: "Feed",
        href: "/admin/dashboard/feed",
        icon: Globe,
      },
      {
        id: "connect",
        label: "Connect Telemetry",
        href: "/admin/dashboard/connect",
        icon: Link2,
        capability: "manage_system",
      },
      {
        id: "features",
        label: "Feature Flags",
        href: "/admin/dashboard/features",
        icon: Settings,
        capability: "manage_system",
      },
      {
        id: "audit",
        label: "Audit Log",
        href: "/admin/dashboard/settings/audit",
        icon: Settings,
        capability: "manage_system",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/admin/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

// ─── Header Utilities (not requiring sidebar traversal) ───────────────

export interface AdminHeaderUtility {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
}

export const ADMIN_HEADER_UTILITIES: AdminHeaderUtility[] = [
  { id: "org-switch", label: "Organization", icon: Building2 },
  { id: "search", label: "Search", icon: Settings },
  { id: "communications", label: "Messages", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "create", label: "Create", icon: Settings },
];

// ─── Workspace Navigation Configs ────────────────────────────────────

export interface WorkspaceNavItem {
  id: string;
  label: string;
  href: string;
  /** Secondary items within this tab */
  secondary?: WorkspaceNavItem[];
  /** Legacy tab ID that maps to this */
  legacyTabId?: string;
}

/**
 * Event Operations workspace navigation
 * Current 13 tabs → 5 primary groups with secondary
 * Fixes: AUX-EVT-009, AUX-CMP-008
 */
export const EVENT_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "production",
    label: "Production",
    href: "production",
    legacyTabId: "tasks",
    secondary: [
      { id: "tasks", label: "Tasks", href: "tasks", legacyTabId: "tasks" },
      { id: "logistics", label: "Logistics", href: "logistics", legacyTabId: "logistics" },
      { id: "advance", label: "Advance", href: "advance", legacyTabId: "advance" },
      { id: "day-sheet", label: "Day Sheet", href: "day-sheet", legacyTabId: "daySheet" },
      { id: "travel", label: "Travel", href: "travel", legacyTabId: "travel" },
    ],
  },
  {
    id: "people",
    label: "People",
    href: "people",
    legacyTabId: "people",
    secondary: [
      { id: "staff", label: "Crew / Staff", href: "staff", legacyTabId: "staff" },
      { id: "participants", label: "Participants", href: "participants", legacyTabId: "participants" },
      { id: "vendors", label: "Vendors", href: "vendors", legacyTabId: "vendors" },
      { id: "access", label: "Access / Credentials", href: "access", legacyTabId: "access" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "commerce",
    legacyTabId: "tickets",
    secondary: [
      { id: "tickets", label: "Ticketing", href: "tickets", legacyTabId: "tickets" },
      { id: "finance", label: "Finance", href: "finance", legacyTabId: "finance" },
    ],
  },
  {
    id: "insights",
    label: "Comms & Insights",
    href: "insights",
    legacyTabId: "communications",
    secondary: [
      { id: "communications", label: "Communications", href: "communications", legacyTabId: "communications" },
      { id: "analytics", label: "Analytics", href: "analytics", legacyTabId: "analytics" },
    ],
  },
];

/**
 * Tour Command Center workspace navigation
 * Current 9 tabs → 5 primary groups with secondary
 * Fixes: AUX-TOUR-012
 */
export const TOUR_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "route-shows",
    label: "Route & Shows",
    href: "route-shows",
    legacyTabId: "shows",
    secondary: [
      { id: "shows", label: "Shows", href: "shows", legacyTabId: "shows" },
      { id: "calendar", label: "Calendar", href: "calendar", legacyTabId: "calendar" },
    ],
  },
  {
    id: "people-partners",
    label: "People & Partners",
    href: "people-partners",
    legacyTabId: "people",
    secondary: [
      { id: "people", label: "People", href: "people", legacyTabId: "people" },
      { id: "jobs", label: "Jobs", href: "jobs", legacyTabId: "jobs" },
      { id: "vendors", label: "Vendors", href: "vendors", legacyTabId: "vendors" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "commerce",
    legacyTabId: "ticketing",
    secondary: [
      { id: "ticketing", label: "Ticketing", href: "ticketing", legacyTabId: "ticketing" },
      { id: "finances", label: "Finances", href: "finances", legacyTabId: "finances" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    href: "operations",
    legacyTabId: "logistics",
    secondary: [
      { id: "logistics", label: "Logistics", href: "logistics", legacyTabId: "logistics" },
    ],
  },
];

/**
 * Organization Governance workspace navigation
 * Current 16 tabs → 5 groups with secondary
 * Fixes: AUX-ORG-001
 */
export const ORG_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "people-access",
    label: "People & Access",
    href: "people-access",
    legacyTabId: "team",
    secondary: [
      { id: "team", label: "Team", href: "team", legacyTabId: "team" },
      { id: "security", label: "Security", href: "security", legacyTabId: "security" },
      { id: "capabilities", label: "Capabilities", href: "capabilities", legacyTabId: "capabilities" },
      { id: "audit", label: "Audit", href: "audit", legacyTabId: "audit" },
    ],
  },
  {
    id: "operations-defaults",
    label: "Operations Defaults",
    href: "operations-defaults",
    legacyTabId: "tours",
    secondary: [
      { id: "tours", label: "Tours", href: "tours", legacyTabId: "tours" },
      { id: "publishing", label: "Publishing", href: "publishing", legacyTabId: "publishing" },
      { id: "communications", label: "Communications", href: "communications", legacyTabId: "communications" },
      { id: "workforce", label: "Workforce", href: "workforce", legacyTabId: "workforce" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "commerce",
    legacyTabId: "finance",
    secondary: [
      { id: "finance", label: "Finance", href: "finance", legacyTabId: "finance" },
      { id: "vendors", label: "Vendors", href: "vendors", legacyTabId: "vendors" },
      { id: "ticketing", label: "Ticketing", href: "ticketing", legacyTabId: "ticketing" },
    ],
  },
  {
    id: "data-system",
    label: "Data & System",
    href: "data-system",
    legacyTabId: "settings",
    secondary: [
      { id: "settings", label: "Settings", href: "settings", legacyTabId: "settings" },
      { id: "retention", label: "Retention", href: "retention", legacyTabId: "retention" },
      { id: "observability", label: "Observability", href: "observability", legacyTabId: "observability" },
      { id: "reporting", label: "Reporting", href: "reporting", legacyTabId: "reporting" },
    ],
  },
];

/**
 * Ticketing workspace navigation
 * Current 12 tabs → 5 groups with secondary
 * Fixes: AUX-TIX-001
 */
export const TICKETING_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "inventory",
    legacyTabId: "setup",
    secondary: [
      { id: "setup", label: "Setup", href: "setup", legacyTabId: "setup" },
      { id: "ticket-types", label: "Ticket Types", href: "ticket-types", legacyTabId: "ticketTypes" },
      { id: "allocations", label: "Allocations", href: "allocations", legacyTabId: "allocations" },
    ],
  },
  {
    id: "sales",
    label: "Sales & Service",
    href: "sales",
    legacyTabId: "orders",
    secondary: [
      { id: "orders", label: "Orders", href: "orders", legacyTabId: "orders" },
      { id: "refunds", label: "Refunds", href: "refunds", legacyTabId: "refunds" },
      { id: "guests", label: "Guests / Comps", href: "guests", legacyTabId: "guests" },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    href: "admissions",
    legacyTabId: "admissions",
    secondary: [
      { id: "devices", label: "Devices", href: "devices", legacyTabId: "scanners" },
      { id: "door", label: "Door Operations", href: "door", legacyTabId: "admissions" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "marketing",
    legacyTabId: "promoCodes",
    secondary: [
      { id: "promo-codes", label: "Promo Codes", href: "promo-codes", legacyTabId: "promoCodes" },
      { id: "campaigns", label: "Campaigns", href: "campaigns", legacyTabId: "campaigns" },
      { id: "sharing", label: "Sharing", href: "sharing", legacyTabId: "sharing" },
    ],
  },
];

/**
 * Hiring workspace navigation
 * Current 7 tabs → prioritized funnel + secondary admin
 * Fixes: AUX-HIRE-003
 */
export const HIRING_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "jobs",
    label: "Jobs",
    href: "jobs",
    legacyTabId: "jobs",
  },
  {
    id: "applications",
    label: "Applications",
    href: "applications",
    legacyTabId: "applications",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "onboarding",
    legacyTabId: "onboarding",
  },
  {
    id: "roster",
    label: "Roster",
    href: "roster",
    legacyTabId: "roster",
  },
  // Secondary: Templates and Audit
  {
    id: "templates",
    label: "Templates",
    href: "templates",
    legacyTabId: "templates",
  },
  {
    id: "audit",
    label: "Audit",
    href: "audit",
    legacyTabId: "audit",
  },
];

/**
 * Logistics workspace navigation
 * Current 8 tabs → grouped hierarchy
 * Fixes: AUX-LOG-001
 */
export const LOGISTICS_WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "overview",
    legacyTabId: "overview",
  },
  {
    id: "movement",
    label: "Movement",
    href: "movement",
    legacyTabId: "transportation",
    secondary: [
      { id: "transport", label: "Ground Transport", href: "transport", legacyTabId: "transportation" },
      { id: "flights", label: "Flights / Travel", href: "flights", legacyTabId: "accommodations" },
    ],
  },
  {
    id: "stay-support",
    label: "Stay & Support",
    href: "stay-support",
    legacyTabId: "lodging",
    secondary: [
      { id: "lodging", label: "Lodging", href: "lodging", legacyTabId: "lodging" },
      { id: "catering", label: "Catering", href: "catering", legacyTabId: "catering" },
    ],
  },
  {
    id: "gear",
    label: "Gear",
    href: "gear",
    legacyTabId: "equipment",
    secondary: [
      { id: "equipment", label: "Equipment", href: "equipment", legacyTabId: "equipment" },
      { id: "backline", label: "Backline", href: "backline", legacyTabId: "backline" },
    ],
  },
  {
    id: "site",
    label: "Site",
    href: "site",
    legacyTabId: "siteMaps",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Find a navigation item by its legacy tab ID.
 * Used for deep-link compatibility during migration.
 */
export function findNavItemByLegacyTab(
  workspace: WorkspaceNavItem[],
  legacyTabId: string
): WorkspaceNavItem | undefined {
  for (const item of workspace) {
    if (item.legacyTabId === legacyTabId) return item;
    if (item.secondary) {
      const found = item.secondary.find((s) => s.legacyTabId === legacyTabId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Resolve a URL tab parameter to the canonical workspace tab.
 * Falls back to "overview" if the legacy ID is not found.
 */
export function resolveWorkspaceTab(
  workspace: WorkspaceNavItem[],
  tabParam: string | null
): string {
  if (!tabParam) return "overview";
  const found = findNavItemByLegacyTab(workspace, tabParam);
  return found ? found.id : "overview";
}

/**
 * Get the primary group for a given secondary tab.
 */
export function getPrimaryGroupForTab(
  workspace: WorkspaceNavItem[],
  tabId: string
): WorkspaceNavItem | undefined {
  return workspace.find(
    (item) =>
      item.id === tabId ||
      item.secondary?.some((s) => s.id === tabId)
  );
}

/**
 * Flatten all navigation items for search.
 */
export function flattenNavigation(groups: AdminNavGroup[]): AdminNavItem[] {
  return groups.flatMap((group) => group.items);
}

/**
 * Search navigation items by query.
 * Returns direct matches, not entire categories.
 * Fixes: AUX-IA-002
 */
export function searchNavigation(
  groups: AdminNavGroup[],
  query: string
): AdminNavItem[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return flattenNavigation(groups).filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      item.id.toLowerCase().includes(lower) ||
      item.href.toLowerCase().includes(lower)
  );
}

export interface SearchableNavigationItem {
  label: string;
  href: string;
  description?: string;
  children?: SearchableNavigationItem[];
}

/**
 * Filter a rendered navigation tree while preserving category context. Child
 * matches remain direct destinations, and a category-label match reveals all
 * of that category's destinations.
 */
export function filterNavigationTreeForSearch<
  T extends SearchableNavigationItem,
>(items: readonly T[], query: string): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...items];

  const matches = (item: SearchableNavigationItem) =>
    item.label.toLowerCase().includes(normalizedQuery) ||
    item.href.toLowerCase().includes(normalizedQuery) ||
    item.description?.toLowerCase().includes(normalizedQuery);

  return items.flatMap((item) => {
    if (!item.children?.length) return matches(item) ? [item] : [];

    const children = matches(item)
      ? item.children
      : item.children.filter((child) => matches(child));

    return children.length ? [{ ...item, children } as T] : [];
  });
}
