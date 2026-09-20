import assert from "node:assert/strict"
import test from "node:test"

import { validateHostedMigrationLedger } from "./check-hosted-migration-ledger.mjs"

const snapshot = {
  migrations: ["20260101000000_one.sql", "20260102000000_two.sql"],
  count: 2,
  firstMigration: "20260101000000_one.sql",
  lastMigration: "20260102000000_two.sql",
  digestSha256: "a".repeat(64),
}

function ledger() {
  return {
    schemaVersion: 1,
    sourceDirectory: "supabase/migrations",
    sourceSnapshot: {
      activeCount: 2,
      firstMigration: snapshot.firstMigration,
      lastMigration: snapshot.lastMigration,
      digestSha256: snapshot.digestSha256,
    },
    environments: {
      staging: { defaultHistoryStatus: "unverified", entries: {} },
      production: { defaultHistoryStatus: "unverified", entries: {} },
    },
    launch: {
      required: [{
        migration: snapshot.firstMigration,
        taskId: "DB-TEST",
        rationale: "required",
        nextAction: "apply manually",
      }],
      deferred: [],
      unclassified: { count: 1, blocker: "hosted history not captured" },
    },
  }
}

test("accepts an honest partially reconciled ledger", () => {
  assert.deepEqual(validateHostedMigrationLedger(ledger(), snapshot), [])
})

test("release mode fails while source classifications and hosted histories are incomplete", () => {
  const failures = validateHostedMigrationLedger(ledger(), snapshot, { requireReconciled: true })
  assert.ok(failures.some((failure) => failure.includes("launch-unclassified")))
  assert.ok(failures.some((failure) => failure.includes("staging history")))
  assert.ok(failures.some((failure) => failure.includes("production history")))
})

test("rejects source drift and duplicate classifications", () => {
  const invalid = ledger()
  invalid.sourceSnapshot.activeCount = 3
  invalid.launch.deferred.push({ ...invalid.launch.required[0] })
  invalid.launch.unclassified.count = 0
  const failures = validateHostedMigrationLedger(invalid, snapshot)
  assert.ok(failures.some((failure) => failure.includes("activeCount")))
  assert.ok(failures.some((failure) => failure.includes("classified more than once")))
})
