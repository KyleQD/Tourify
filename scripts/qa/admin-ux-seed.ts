#!/usr/bin/env tsx

import { buildAdminUxSeedPlan } from "@/lib/testing/admin-ux-seed-plan"

const targetArgument = process.argv.find((argument) => argument.startsWith("--target="))
const target = targetArgument?.slice("--target=".length)

if (!target) {
  console.error("Usage: npm run qa:seed:admin-ux -- --target=<isolated-local-test-or-preview-target>")
  process.exit(1)
}

const plan = buildAdminUxSeedPlan(target)
const rowCount = plan.operations.reduce((total, operation) => total + operation.rows.length, 0)

console.log(JSON.stringify({
  target: plan.target,
  mode: plan.mode,
  tables: plan.operations.length,
  rows: rowCount,
  fingerprint: plan.fingerprint,
}, null, 2))
