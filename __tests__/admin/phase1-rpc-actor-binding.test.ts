import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * SEC / ADM-M-051..055 — Phase 1 RPC actor-binding contract.
 *
 * Structural regression: the hardened definitions must keep deriving actor
 * identity from auth.uid(), reject caller-supplied foreign identities, and
 * keep EXECUTE restricted away from anon. If a future change removes any of
 * these guards, this test fails before the vulnerability ships.
 */

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql",
)

function loadSql(): string {
  return readFileSync(MIGRATION_PATH, "utf8")
}

describe("SEC-101x phase1 rpc actor binding contract", () => {
  const sql = loadSql()

  it("switch_active_account canonical form derives actor from auth.uid()", () => {
    expect(sql).toMatch(/switch_active_account\(\s*p_target_profile_id uuid,\s*p_target_account_type text\s*\)/)
    expect(sql).toMatch(/v_uid uuid := auth\.uid\(\)/)
    // Legacy 3-arg wrapper refuses foreign user ids
    expect(sql).toMatch(/cannot_switch_account_for_other_user/)
  })

  it("get_user_accounts_adaptive blocks cross-user enumeration except service_role", () => {
    expect(sql).toMatch(/cannot_enumerate_other_user_accounts/)
    expect(sql).toMatch(/current_setting\('role', true\), ''\) <> 'service_role'/)
  })

  it("create_artist_account rejects foreign user_id and never trusts the argument", () => {
    expect(sql).toMatch(/cannot_create_account_for_other_user/)
    expect(sql).toMatch(/values \(v_uid, p_artist_name/)
  })

  it("send_dm_request rejects caller-controlled sender identity", () => {
    expect(sql).toMatch(/sender_must_be_caller/)
  })

  it("get_or_create_conversation requires caller participation and runs as invoker", () => {
    expect(sql).toMatch(/caller_must_be_participant/)
    expect(sql).toMatch(
      /create or replace function public\.get_or_create_conversation[\s\S]*?security invoker/,
    )
  })

  it("revokes EXECUTE from anon on every touched function", () => {
    const revoked = sql.match(/revoke execute on function public\.\w+\([^)]*\) from public, anon/g) ?? []
    expect(revoked.length).toBeGreaterThanOrEqual(5)
  })

  it("pins search_path on all SECURITY DEFINER bodies", () => {
    const definerBlocks = sql.split("security definer").slice(1)
    expect(definerBlocks.length).toBeGreaterThanOrEqual(5)
    for (const block of definerBlocks) {
      expect(block.slice(0, 200)).toMatch(/set search_path = public/)
    }
  })

  it("keeps user_sessions in the active chain with owner-only RLS", () => {
    expect(sql).toMatch(/create table if not exists public\.user_sessions/)
    expect(sql).toMatch(/user_sessions_owner_all on public\.user_sessions/)
  })
})
