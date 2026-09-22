import assert from "node:assert/strict"
import test from "node:test"

import { databaseTypeSource } from "./database-types-source.mjs"

test("defaults to the manually reconciled local target", () => {
  const source = databaseTypeSource({})
  assert.equal(source.source, "local")
  assert.ok(source.args.includes("--local"))
  assert.ok(!source.args.includes("--linked"))
})

test("requires an explicit choice for linked and project-id targets", () => {
  const linked = databaseTypeSource({ SUPABASE_TYPE_SOURCE: "linked" })
  assert.ok(linked.args.includes("--linked"))

  const project = databaseTypeSource({
    SUPABASE_TYPE_SOURCE: "project-id",
    SUPABASE_TYPE_PROJECT_ID: "abcdefghijklmnopqrst",
  })
  assert.deepEqual(project.args.slice(-2), ["--project-id", "abcdefghijklmnopqrst"])
})

test("rejects missing, malformed, or implicit remote targets", () => {
  assert.throws(
    () => databaseTypeSource({ SUPABASE_TYPE_SOURCE: "project-id" }),
    /SUPABASE_TYPE_PROJECT_ID/,
  )
  assert.throws(
    () => databaseTypeSource({ SUPABASE_TYPE_SOURCE: "production" }),
    /must be one of/,
  )
})
