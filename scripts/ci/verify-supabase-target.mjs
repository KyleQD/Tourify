#!/usr/bin/env node

export function validateSupabaseTarget({ actual, expected, confirmation }) {
  const failures = []
  if (!actual) failures.push("SUPABASE_PROJECT_ID is required")
  if (!expected) failures.push("EXPECTED_SUPABASE_PROJECT_ID is required")
  if (actual && expected && actual !== expected) {
    failures.push(`target mismatch: actual ${actual} does not match approved ${expected}`)
  }
  if (!confirmation || confirmation !== expected) {
    failures.push("SUPABASE_TARGET_CONFIRMATION must exactly match the approved project ref")
  }
  return failures
}

function main() {
  const actual = process.env.SUPABASE_PROJECT_ID || ""
  const expected = process.env.EXPECTED_SUPABASE_PROJECT_ID || ""
  const confirmation = process.env.SUPABASE_TARGET_CONFIRMATION || ""
  console.log(`Supabase target actual=${actual || "<missing>"} expected=${expected || "<missing>"}`)
  const failures = validateSupabaseTarget({ actual, expected, confirmation })
  if (failures.length > 0) {
    for (const failure of failures) console.error(`✗ ${failure}`)
    process.exitCode = 1
    return
  }
  console.log("✓ Supabase target identity confirmed")
}

if (import.meta.url === `file://${process.argv[1]}`) main()

