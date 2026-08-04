import assert from "node:assert/strict"
import test from "node:test"

import { compareInventories } from "./compare-sec001-inventories.mjs"

function inventory(overrides = {}) {
  return {
    format_version: 1,
    generated_at: "2026-07-21T00:00:00.000Z",
    database_name: "test",
    relations: [
      {
        schema: "public",
        name: "tours",
        kind: "table",
        owner: "postgres",
        rls_enabled: true,
        rls_forced: true,
        view_security_invoker: null,
      },
    ],
    policies: [],
    routines: [],
    triggers: [],
    grants: [],
    migration_versions: [{ version: "20260721000000", name: "fixture" }],
    ...overrides,
  }
}

test("identical inventories have no drift", () => {
  const result = compareInventories(inventory(), inventory({ generated_at: "later" }))
  for (const collection of Object.values(result)) {
    assert.deepEqual(collection, { missing: [], unexpected: [], changed: [] })
  }
})

test("definition changes fail closed under the same identity", () => {
  const hosted = inventory({
    relations: [{ ...inventory().relations[0], rls_forced: false }],
  })
  const result = compareInventories(inventory(), hosted)
  assert.deepEqual(result.relations.changed, ["public.tours"])
})

test("missing and unexpected objects are reported independently", () => {
  const expected = inventory({
    policies: [{ schema: "public", relation: "tours", name: "tour_select" }],
  })
  const hosted = inventory({
    migration_versions: [
      { version: "20260721000000", name: "fixture" },
      { version: "20260721000001", name: "hosted_only" },
    ],
  })
  const result = compareInventories(expected, hosted)
  assert.deepEqual(result.policies.missing, ["public.tours.tour_select"])
  assert.deepEqual(result.migration_versions.unexpected, ["20260721000001:hosted_only"])
})
