import { describe, expect, it } from "vitest"

import { buildAdminUxSeedPlan } from "@/lib/testing/admin-ux-seed-plan"

describe("ADMUX-0002 deterministic Admin UX seed plan", () => {
  it("is idempotent for the same isolated target", () => {
    const first = buildAdminUxSeedPlan("preview-branch-admin-fixtures")
    const second = buildAdminUxSeedPlan("preview-branch-admin-fixtures")

    expect(second).toEqual(first)
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(first.operations.every((operation) => operation.conflictTarget === "id")).toBe(true)
  })

  it("contains the required collection scale for both organizations", () => {
    const plan = buildAdminUxSeedPlan("postgres://localhost/tourify_test")
    const rows = (table: string) => plan.operations.find((operation) => operation.table === table)?.rows ?? []

    expect(rows("tours")).toHaveLength(250)
    expect(rows("events_v2")).toHaveLength(250)
    expect(rows("financial_transactions")).toHaveLength(400)
    expect(rows("ticket_inventory_reservations")).toHaveLength(80)
  })

  it("fails closed for missing, Demo, or production targets", () => {
    expect(() => buildAdminUxSeedPlan("")).toThrow(/isolated/i)
    expect(() => buildAdminUxSeedPlan("Tourify Demo")).toThrow(/forbidden|isolated/i)
    expect(() => buildAdminUxSeedPlan("production")).toThrow(/forbidden|isolated/i)
  })
})
