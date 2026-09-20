#!/usr/bin/env node

import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MIGRATION = "supabase/migrations/20260914090000_revoke_public_execute_db002.sql"
const POSTFLIGHT = "supabase/tests/db002_security_grants.sql"

export const DB002_FUNCTIONS = [
  "public.can_view_hiring_pii(uuid, text, uuid)",
  "public.replace_ticket_revenue_allocations(uuid, jsonb)",
  "public.delete_tour_cascade(uuid)",
  "public.has_entity_permission(uuid, text, uuid, text)",
]

function normalizeSql(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function validateDb002SecurityContract(migrationSql, postflightSql) {
  const failures = []
  const migration = normalizeSql(migrationSql)
  const postflight = normalizeSql(postflightSql)

  for (const signature of DB002_FUNCTIONS) {
    const normalizedSignature = signature.toLowerCase()
    const revoke = `revoke execute on function ${normalizedSignature} from public, anon;`
    const grant = `grant execute on function ${normalizedSignature} to authenticated, service_role;`

    if (!migration.includes(revoke)) {
      failures.push(`${MIGRATION}: missing exact PUBLIC + anon EXECUTE revoke for ${signature}`)
    }
    if (!migration.includes(grant)) {
      failures.push(`${MIGRATION}: missing exact authenticated + service_role EXECUTE grant for ${signature}`)
    }

    const compactSignature = normalizedSignature.replaceAll(" ", "")
    if (!postflight.includes(`'${compactSignature}'`)) {
      failures.push(`${POSTFLIGHT}: missing postflight coverage for ${signature}`)
    }
  }

  for (const assertion of [
    "acl.grantee = 0",
    "acl.privilege_type = 'execute'",
    "has_function_privilege('anon', v_function, 'execute')",
    "has_function_privilege('authenticated', v_function, 'execute')",
    "has_function_privilege('service_role', v_function, 'execute')",
    "p.prosecdef",
    "search_path=public",
  ]) {
    if (!postflight.includes(assertion)) {
      failures.push(`${POSTFLIGHT}: missing assertion contract ${assertion}`)
    }
  }

  return failures
}

export function main() {
  const migrationSql = readFileSync(path.join(ROOT, MIGRATION), "utf8")
  const postflightSql = readFileSync(path.join(ROOT, POSTFLIGHT), "utf8")
  const failures = validateDb002SecurityContract(migrationSql, postflightSql)

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`✗ ${failure}`))
    process.exit(1)
  }

  console.log(`✓ DB-002 grant contract covers ${DB002_FUNCTIONS.length} SECURITY DEFINER functions`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
