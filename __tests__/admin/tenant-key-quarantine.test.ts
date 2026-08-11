import { describe, expect, it } from "vitest"
import {
  ADMIN_TENANT_KEY_QUARANTINE_TABLE,
  ADMIN_TENANT_KEY_QUARANTINE_VIEW,
  isSec105OrgKeyedTable,
  SEC105_ORG_KEYED_TABLES,
  TENANT_KEY_QUARANTINE_REASONS,
} from "@/lib/admin/tenant-key-quarantine"

describe("SEC-105 tenant key quarantine contract", () => {
  it("exposes quarantine table and open-queue view names", () => {
    expect(ADMIN_TENANT_KEY_QUARANTINE_TABLE).toBe("admin_tenant_key_quarantine")
    expect(ADMIN_TENANT_KEY_QUARANTINE_VIEW).toBe("admin_tenant_key_quarantine_v")
  })

  it("covers finance/logistics/staffing/site-map/ticketing domains", () => {
    const domains = {
      logistics: ["logistics_tasks", "flight_coordination", "lodging_bookings"],
      staffing: ["staff_members", "staff_shifts", "staff_zones"],
      siteMap: ["site_maps", "site_map_zones"],
      ticketing: ["ticket_types", "ticket_sales", "tickets"],
    }
    for (const tables of Object.values(domains))
      for (const table of tables) expect(SEC105_ORG_KEYED_TABLES).toContain(table)
  })

  it("guards typed table membership", () => {
    expect(isSec105OrgKeyedTable("logistics_tasks")).toBe(true)
    expect(isSec105OrgKeyedTable("not_a_table")).toBe(false)
  })

  it("documents reason codes used by the migration", () => {
    expect(TENANT_KEY_QUARANTINE_REASONS.unresolvableAfterBackfill).toMatch(/unresolvable/)
    expect(TENANT_KEY_QUARANTINE_REASONS.missingOrganizationRow).toMatch(/organization/)
  })
})
