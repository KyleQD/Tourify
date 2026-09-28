import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260918213707_mfa_verification_code_store.sql",
)
const migration = readFileSync(migrationPath, "utf8")

describe("MFA verification-code migration", () => {
  it("creates an RLS-protected default-deny table with no client grants", () => {
    expect(migration).toContain("create table if not exists public.mfa_verification_codes")
    expect(migration).toContain("alter table public.mfa_verification_codes enable row level security")
    expect(migration).toContain(
      "revoke all on table public.mfa_verification_codes from public, anon, authenticated",
    )
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.mfa_verification_codes to service_role",
    )
    expect(migration).not.toMatch(/create\s+policy\s+[\s\S]+?mfa_verification_codes/i)
  })

  it("restricts every atomic MFA RPC to service_role", () => {
    const functions = [
      "issue_mfa_verification_code",
      "begin_mfa_verification_attempt",
      "finish_mfa_verification_attempt",
      "revoke_mfa_verification_code",
      "cleanup_expired_mfa_verification_codes",
    ]

    for (const functionName of functions) {
      expect(migration).toMatch(
        new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]+?from public, anon, authenticated`, "i"),
      )
      expect(migration).toMatch(
        new RegExp(`grant execute on function public\\.${functionName}\\([\\s\\S]+?to service_role`, "i"),
      )
    }
  })

  it("keeps rate limits and attempt consumption inside locked database functions", () => {
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration).toContain("for update")
    expect(migration).toContain("set attempts = attempts + 1")
    expect(migration).toContain("set consumed_at = p_completed_at")
    expect(migration).toContain("issued_at <= p_now - make_interval")
  })
})
