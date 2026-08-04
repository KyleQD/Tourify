import assert from "node:assert/strict"
import test from "node:test"
import { validateSupabaseTarget } from "./verify-supabase-target.mjs"

test("accepts an exact three-way target match", () => {
  assert.deepEqual(
    validateSupabaseTarget({ actual: "project-a", expected: "project-a", confirmation: "project-a" }),
    [],
  )
})

test("fails closed for missing or mismatched target evidence", () => {
  assert.ok(validateSupabaseTarget({ actual: "", expected: "", confirmation: "" }).length >= 3)
  assert.ok(
    validateSupabaseTarget({
      actual: "project-a",
      expected: "project-b",
      confirmation: "project-b",
    }).some((failure) => failure.includes("target mismatch")),
  )
  assert.ok(
    validateSupabaseTarget({
      actual: "project-a",
      expected: "project-a",
      confirmation: "wrong",
    }).some((failure) => failure.includes("exactly match")),
  )
})

