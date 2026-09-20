import assert from "node:assert/strict"
import test from "node:test"

import {
  DB002_FUNCTIONS,
  validateDb002SecurityContract,
} from "./check-db002-security-contract.mjs"

const safeMigration = DB002_FUNCTIONS.map((signature) => `
  revoke execute on function ${signature} from public, anon;
  grant execute on function ${signature} to authenticated, service_role;
`).join("\n")

const safePostflight = `
  ${DB002_FUNCTIONS.map((signature) => `'${signature.replaceAll(" ", "")}'`).join(",")}
  select p.prosecdef, p.proconfig @> array['search_path=public']
  from pg_proc p, aclexplode(p.proacl) acl
  where acl.grantee = 0 and acl.privilege_type = 'EXECUTE';
  select has_function_privilege('anon', v_function, 'EXECUTE');
  select has_function_privilege('authenticated', v_function, 'EXECUTE');
  select has_function_privilege('service_role', v_function, 'EXECUTE');
`

test("accepts the complete DB-002 grant contract", () => {
  assert.deepEqual(validateDb002SecurityContract(safeMigration, safePostflight), [])
})

test("rejects a revoke that leaves a direct anon grant intact", () => {
  const unsafe = safeMigration.replace(
    "from public, anon;",
    "from public;",
  )
  assert.ok(
    validateDb002SecurityContract(unsafe, safePostflight).some((failure) =>
      failure.includes("PUBLIC + anon EXECUTE revoke"),
    ),
  )
})

test("requires postflight checks for PUBLIC and the function security attributes", () => {
  const incomplete = safePostflight
    .replace("acl.grantee = 0", "acl.grantee = 10")
    .replace("p.prosecdef", "p.provolatile")
  const failures = validateDb002SecurityContract(safeMigration, incomplete)
  assert.ok(failures.some((failure) => failure.includes("acl.grantee = 0")))
  assert.ok(failures.some((failure) => failure.includes("p.prosecdef")))
})
