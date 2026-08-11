import { describe, expect, it } from "vitest"

import {
  assertLogisticsOrgKeyVerification,
  isLog101ChildTable,
  isLog101ParentTable,
  LOG101_CHILD_TABLES,
  LOG101_DEFERRED_TABLES,
  LOG101_PARENT_CHILD_LINKS,
  LOG101_PARENT_TABLES,
  LOG101_QUARANTINE_REASON,
  LOG101_VERIFY_RPC,
} from "@/lib/admin/logistics-tenant-keys"

describe("LOG-101 logistics tenant keys", () => {
  it("lists parents and children for logistics domains", () => {
    expect(LOG101_PARENT_TABLES).toEqual(
      expect.arrayContaining(["logistics_tasks", "site_maps", "catering_services"]),
    )
    expect(LOG101_CHILD_TABLES).toContain("logistics_task_equipment")
    expect(LOG101_CHILD_TABLES).toContain("site_map_collaborators")
    expect(LOG101_CHILD_TABLES).toContain("site_map_activity_log")
    expect(LOG101_CHILD_TABLES).toContain("catering_headcount_snapshots")
    expect(LOG101_CHILD_TABLES).toContain("map_layers")
  })

  it("maps every child to a parent FK for backfill", () => {
    const linked = new Set(LOG101_PARENT_CHILD_LINKS.map((link) => link.childTable))
    for (const child of LOG101_CHILD_TABLES) expect(linked.has(child)).toBe(true)
    for (const link of LOG101_PARENT_CHILD_LINKS) {
      expect(link.childFk.trim().length).toBeGreaterThan(0)
      expect(link.parentTable).toBeTruthy()
    }
  })

  it("exposes quarantine reason, verify RPC, and deferred catalogs", () => {
    expect(LOG101_QUARANTINE_REASON).toMatch(/unresolvable/)
    expect(LOG101_VERIFY_RPC).toBe("admin_verify_logistics_org_keys")
    expect(LOG101_DEFERRED_TABLES).toContain("equipment_catalog")
  })

  it("guards typed membership helpers", () => {
    expect(isLog101ChildTable("map_issues")).toBe(true)
    expect(isLog101ChildTable("travel_groups")).toBe(false)
    expect(isLog101ParentTable("site_maps")).toBe(true)
    expect(isLog101ParentTable("map_layers")).toBe(false)
  })

  it("verifies null org rows match quarantine and parent mismatches are zero", () => {
    const ok = assertLogisticsOrgKeyVerification([
      {
        table_name: "logistics_task_equipment",
        total_rows: 10,
        keyed_rows: 9,
        null_org_rows: 1,
        quarantine_open: 1,
        parent_mismatch_rows: 0,
      },
      {
        table_name: "site_map_collaborators",
        total_rows: 5,
        keyed_rows: 5,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 0,
      },
    ])
    expect(ok.ok).toBe(true)

    const bad = assertLogisticsOrgKeyVerification([
      {
        table_name: "logistics_task_equipment",
        total_rows: 10,
        keyed_rows: 8,
        null_org_rows: 2,
        quarantine_open: 1,
        parent_mismatch_rows: 1,
      },
    ])
    expect(bad.ok).toBe(false)
  })
})
