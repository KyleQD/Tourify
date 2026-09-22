import type { AdminCapability } from "@/lib/auth/admin-capabilities"

export type AdminDashboardDomainId =
  | "tours"
  | "events"
  | "workforce"
  | "logistics"
  | "ticketing"
  | "finance"
  | "vendors"
  | "contracts"
  | "publication"
  | "audit"

export type AdminDashboardDomainStatus = "ready" | "empty" | "denied" | "unavailable" | "stale"

export interface AdminDashboardDomainHealth {
  id: AdminDashboardDomainId
  label: string
  href: string
  status: AdminDashboardDomainStatus
  count: number | null
  countLabel: string
  asOf: string
  message: string | null
}

export interface AdminDashboardCommandCenter {
  generatedAt: string
  degraded: boolean
  domains: AdminDashboardDomainHealth[]
}

export interface DashboardDomainDefinition {
  id: AdminDashboardDomainId
  label: string
  href: string
  countLabel: string
  capability: AdminCapability
}

export const DASHBOARD_DOMAIN_DEFINITIONS: readonly DashboardDomainDefinition[] = [
  { id: "tours", label: "Tours", href: "/admin/dashboard/tours", countLabel: "accessible tours", capability: "tour.view" },
  { id: "events", label: "Events", href: "/admin/dashboard/events", countLabel: "accessible events", capability: "event.view" },
  { id: "workforce", label: "Workforce", href: "/admin/dashboard/staff", countLabel: "team members", capability: "workforce.view" },
  { id: "logistics", label: "Logistics", href: "/admin/dashboard/logistics", countLabel: "open tasks", capability: "logistics.view" },
  { id: "ticketing", label: "Ticketing", href: "/admin/dashboard/ticketing", countLabel: "ticketing records", capability: "ticketing.view" },
  { id: "finance", label: "Finance", href: "/admin/dashboard/finances", countLabel: "transactions", capability: "finance.view" },
  { id: "vendors", label: "Vendors", href: "/admin/dashboard/logistics?tab=vendors", countLabel: "vendors", capability: "vendor.view" },
  { id: "contracts", label: "Contracts", href: "/admin/dashboard/finances?tab=contracts", countLabel: "contracts", capability: "contract.view" },
  { id: "publication", label: "Publication", href: "/admin/dashboard/publications/deliveries", countLabel: "pending deliveries", capability: "tour.view" },
  { id: "audit", label: "Audit", href: "/admin/dashboard/settings/audit", countLabel: "recent actions", capability: "audit.view" },
] as const

export function deniedDashboardDomain(
  definition: DashboardDomainDefinition,
  asOf: string,
): AdminDashboardDomainHealth {
  return {
    ...definition,
    status: "denied",
    count: null,
    asOf,
    message: "Access is not available for your current role.",
  }
}

export function resolvedDashboardDomain(
  definition: DashboardDomainDefinition,
  asOf: string,
  count: number,
): AdminDashboardDomainHealth {
  return {
    ...definition,
    status: count === 0 ? "empty" : "ready",
    count,
    asOf,
    message: null,
  }
}

export function unavailableDashboardDomain(
  definition: DashboardDomainDefinition,
  asOf: string,
  message = "This domain is temporarily unavailable.",
): AdminDashboardDomainHealth {
  return {
    ...definition,
    status: "unavailable",
    count: null,
    asOf,
    message,
  }
}
