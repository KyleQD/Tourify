import { describe, expect, it } from "vitest"
import {
  SEC108_DESTINATION_TABLES,
  SEC108_DROPPED_PERMISSIVE_POLICIES,
  SEC108_LEGACY_READ_ONLY_TABLES,
  SEC108_LEGACY_REGISTRY_TABLE,
} from "@/lib/admin/legacy-ticketing-rls-contract"

describe("SEC-108 legacy ticketing RLS contract", () => {
  it("lists blanket policies that must be dropped not shadowed", () => {
    expect(SEC108_DROPPED_PERMISSIVE_POLICIES).toContain("ticket_types_all")
    expect(SEC108_DROPPED_PERMISSIVE_POLICIES).toContain("ticket_campaigns_write")
    expect(SEC108_DROPPED_PERMISSIVE_POLICIES).toContain("promo_codes_all")
  })

  it("marks legacy tables read-only pending retirement", () => {
    expect(SEC108_LEGACY_READ_ONLY_TABLES).toContain("event_ticket_types")
    expect(SEC108_LEGACY_REGISTRY_TABLE).toBe("legacy_ticketing_migration_tables")
  })

  it("points destination writes at canonical ticketing tables", () => {
    expect(SEC108_DESTINATION_TABLES).toContain("ticket_types")
    expect(SEC108_DESTINATION_TABLES).toContain("tickets")
  })
})
