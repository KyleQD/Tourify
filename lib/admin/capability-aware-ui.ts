/**
 * SEC-205 — Capability-aware UI helpers.
 *
 * Navigation/controls reflect capabilities for UX only.
 * Server authorization remains the security boundary.
 * Denial copy never reveals protected field values or record existence details.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

export interface NavCapabilityRule {
  /** Path prefix or exact href (query stripped for matching). */
  pathPrefix: string
  exact?: boolean
  /** Any of these capabilities unlocks the nav item. */
  anyOf: readonly AdminCapability[]
  /** Friendly label used in denial copy. */
  surfaceLabel: string
}

/** Primary admin dashboard surfaces → minimum capabilities. */
export const ADMIN_NAV_CAPABILITY_RULES: readonly NavCapabilityRule[] = [
  {
    pathPrefix: "/admin/dashboard/settings/audit",
    anyOf: ["audit.view"],
    surfaceLabel: "Audit log",
  },
  {
    pathPrefix: "/admin/dashboard/publications/deliveries",
    anyOf: ["tour.publish", "communications.send", "audit.view"],
    surfaceLabel: "Publication deliveries",
  },
  {
    pathPrefix: "/admin/dashboard/network",
    anyOf: ["tour.view", "vendor.view"],
    surfaceLabel: "Connections",
  },
  {
    pathPrefix: "/admin/dashboard/epk",
    anyOf: ["content.view"],
    surfaceLabel: "EPK",
  },
  {
    pathPrefix: "/admin/dashboard/website",
    anyOf: ["content.view"],
    surfaceLabel: "Website",
  },
  {
    pathPrefix: "/admin/dashboard/feed",
    anyOf: ["content.view"],
    surfaceLabel: "Feed",
  },
  {
    pathPrefix: "/admin/dashboard/connect",
    anyOf: ["audit.view", "org.settings.manage"],
    surfaceLabel: "Connect telemetry",
  },
  {
    pathPrefix: "/admin/dashboard/features",
    anyOf: ["org.settings.manage"],
    surfaceLabel: "Feature flags",
  },
  { pathPrefix: "/admin/dashboard/tours", anyOf: ["tour.view"], surfaceLabel: "Tours" },
  { pathPrefix: "/admin/dashboard/events", anyOf: ["event.view"], surfaceLabel: "Events" },
  { pathPrefix: "/admin/dashboard/calendar", anyOf: ["tour.view", "event.view", "logistics.view"], surfaceLabel: "Calendar" },
  { pathPrefix: "/admin/dashboard/logistics", anyOf: ["logistics.view"], surfaceLabel: "Logistics" },
  {
    pathPrefix: "/admin/dashboard/hiring",
    anyOf: ["workforce.view", "hiring.manage"],
    surfaceLabel: "Hiring",
  },
  {
    pathPrefix: "/admin/dashboard/staff",
    anyOf: ["workforce.view", "hiring.manage"],
    surfaceLabel: "Staff operations",
  },
  {
    pathPrefix: "/admin/dashboard/payroll",
    anyOf: ["workforce.view", "workforce.manage"],
    surfaceLabel: "Payroll workspace",
  },
  {
    pathPrefix: "/admin/dashboard/applications",
    anyOf: ["workforce.view", "hiring.manage"],
    surfaceLabel: "Applications",
  },
  {
    pathPrefix: "/admin/dashboard/candidates",
    anyOf: ["workforce.view", "hiring.manage"],
    surfaceLabel: "Candidates",
  },
  {
    pathPrefix: "/admin/dashboard/roster",
    anyOf: ["workforce.view"],
    surfaceLabel: "Roster",
  },
  {
    pathPrefix: "/admin/dashboard/organization",
    anyOf: ["org.roles.manage", "tour.view"],
    surfaceLabel: "Organization team",
  },
  {
    pathPrefix: "/admin/dashboard/rbac",
    anyOf: ["org.roles.manage"],
    surfaceLabel: "Roles & permissions",
  },
  {
    pathPrefix: "/admin/dashboard/ticketing",
    anyOf: ["ticketing.view"],
    surfaceLabel: "Ticketing",
  },
  {
    pathPrefix: "/admin/dashboard/finances",
    anyOf: ["finance.view"],
    surfaceLabel: "Finances",
  },
  {
    pathPrefix: "/admin/dashboard/marketplace",
    anyOf: ["finance.view", "content.view"],
    surfaceLabel: "Marketplace",
  },
  {
    pathPrefix: "/admin/dashboard/store",
    anyOf: ["content.manage", "finance.view"],
    surfaceLabel: "Store",
  },
  {
    pathPrefix: "/admin/dashboard/inventory",
    anyOf: ["logistics.view"],
    surfaceLabel: "Inventory",
  },
  {
    pathPrefix: "/admin/dashboard/artists",
    anyOf: ["tour.view", "event.view"],
    surfaceLabel: "Artists",
  },
  {
    pathPrefix: "/admin/dashboard/venues",
    anyOf: ["event.view", "vendor.view"],
    surfaceLabel: "Venues",
  },
  {
    pathPrefix: "/admin/dashboard/agencies",
    anyOf: ["vendor.view", "workforce.view"],
    surfaceLabel: "Agencies",
  },
  {
    pathPrefix: "/admin/dashboard/communications",
    anyOf: ["communications.send", "tour.view"],
    surfaceLabel: "Communications",
  },
  {
    pathPrefix: "/admin/dashboard/content",
    anyOf: ["content.view"],
    surfaceLabel: "Content hub",
  },
  {
    pathPrefix: "/admin/dashboard/music",
    anyOf: ["content.view"],
    surfaceLabel: "Music",
  },
  {
    pathPrefix: "/admin/dashboard/analytics",
    anyOf: ["tour.view", "finance.view", "event.view"],
    surfaceLabel: "Analytics",
  },
  {
    pathPrefix: "/admin/dashboard/settings",
    anyOf: ["org.settings.manage", "org.roles.manage"],
    surfaceLabel: "Settings",
  },
  {
    pathPrefix: "/admin/dashboard",
    exact: true,
    anyOf: [
      "tour.view",
      "event.view",
      "logistics.view",
      "workforce.view",
      "vendor.view",
      "contract.view",
      "finance.view",
      "ticketing.view",
      "site_map.view",
      "content.view",
      "audit.view",
    ],
    surfaceLabel: "Dashboard",
  },
] as const

export interface CapabilityDenial {
  allowed: false
  code: "capability_denied"
  /** Safe for UI — no protected data / existence leakage. */
  message: string
  /** Capability names the user may request (not proof of data). */
  requestCapabilities: readonly AdminCapability[]
  surfaceLabel: string
}

export interface CapabilityAllowance {
  allowed: true
}

export type CapabilityAccessResult = CapabilityAllowance | CapabilityDenial

export function pathWithoutQuery(href: string): string {
  const q = href.indexOf("?")
  return q === -1 ? href : href.slice(0, q)
}

export function findNavCapabilityRule(href: string): NavCapabilityRule | null {
  const path = pathWithoutQuery(href)
  if (path.startsWith("__")) return null
  // Longest prefix match
  let best: NavCapabilityRule | null = null
  for (const rule of ADMIN_NAV_CAPABILITY_RULES) {
    if (path === rule.pathPrefix || (!rule.exact && path.startsWith(`${rule.pathPrefix}/`))) {
      if (!best || rule.pathPrefix.length > best.pathPrefix.length) best = rule
    }
  }
  return best
}

export function buildCapabilityDenialMessage(args: {
  surfaceLabel: string
  capabilities: readonly AdminCapability[]
}): string {
  const listed = args.capabilities.slice(0, 3).join(", ")
  const more = args.capabilities.length > 3 ? ", …" : ""
  return `You don’t have access to ${args.surfaceLabel}. Ask an organization owner or admin to grant ${listed}${more}.`
}

export function evaluateCapabilityAccess(args: {
  capabilities: readonly AdminCapability[]
  anyOf: readonly AdminCapability[]
  surfaceLabel: string
}): CapabilityAccessResult {
  if (args.anyOf.some((cap) => hasAdminCapability(args.capabilities, cap)))
    return { allowed: true }

  return {
    allowed: false,
    code: "capability_denied",
    message: buildCapabilityDenialMessage({
      surfaceLabel: args.surfaceLabel,
      capabilities: args.anyOf,
    }),
    requestCapabilities: args.anyOf,
    surfaceLabel: args.surfaceLabel,
  }
}

export function evaluateNavHrefAccess(args: {
  href: string
  capabilities: readonly AdminCapability[] | null | undefined
}): CapabilityAccessResult {
  const rule = findNavCapabilityRule(args.href)
  if (!rule) {
    if (!pathWithoutQuery(args.href).startsWith("/admin/")) return { allowed: true }
    return {
      allowed: false,
      code: "capability_denied",
      message: "This Admin surface has not been assigned an access policy.",
      requestCapabilities: [],
      surfaceLabel: "Unclassified Admin surface",
    }
  }

  // A loading or failed capability lookup must not expose protected navigation.
  if (!args.capabilities) {
    return {
      allowed: false,
      code: "capability_denied",
      message: `Access to ${rule.surfaceLabel} is unavailable until permissions are verified.`,
      requestCapabilities: rule.anyOf,
      surfaceLabel: rule.surfaceLabel,
    }
  }

  return evaluateCapabilityAccess({
    capabilities: args.capabilities,
    anyOf: rule.anyOf,
    surfaceLabel: rule.surfaceLabel,
  })
}

export interface CapabilityAwareNavItem {
  href: string
  label: string
  children?: CapabilityAwareNavItem[]
  /** Synthetic category rows use __prefix__ hrefs */
  access: CapabilityAccessResult
}

/**
 * Annotate nav tree with access. Categories remain if any child is allowed;
 * denied leaves keep access metadata for disabled + tooltip UX.
 */
export function annotateNavTreeByCapabilities<T extends {
  href: string
  label: string
  children?: T[]
}>(args: {
  items: T[]
  capabilities: readonly AdminCapability[] | null | undefined
}): Array<T & { access: CapabilityAccessResult }> {
  return args.items.map((item) => {
    if (item.children?.length) {
      const children = annotateNavTreeByCapabilities({
        items: item.children,
        capabilities: args.capabilities,
      })
      const anyChildAllowed = children.some((child) => child.access.allowed)
      return {
        ...item,
        children,
        access: anyChildAllowed
          ? { allowed: true as const }
          : evaluateCapabilityAccess({
              capabilities: args.capabilities || [],
              anyOf: ["tour.view"],
              surfaceLabel: item.label,
            }),
      }
    }

    return {
      ...item,
      access: evaluateNavHrefAccess({
        href: item.href,
        capabilities: args.capabilities,
      }),
    }
  })
}

/** Redacted denial for API/UI — never include entity ids or protected field names. */
export function publicCapabilityDenialPayload(denial: CapabilityDenial): {
  code: "capability_denied"
  message: string
  requestCapabilities: readonly AdminCapability[]
} {
  return {
    code: denial.code,
    message: denial.message,
    requestCapabilities: denial.requestCapabilities,
  }
}
