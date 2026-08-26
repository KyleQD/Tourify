import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * SEC / ADM-M-003 — Admin surface access derives from membership + grants.
 * Structural contract: the gate implementation must not query self-serviceable
 * identity shapes as authorization sources, and the DB must guard the only
 * remaining privilege-bearing profile columns.
 */

const GATE_PATH = join(process.cwd(), "lib/auth/admin.ts")
const GUARD_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260825122000_phase2_profiles_elevation_guard.sql",
)

describe("admin surface gate membership-only contract", () => {
  const src = readFileSync(GATE_PATH, "utf8")
  const sql = readFileSync(GUARD_MIGRATION, "utf8")

  it("queries org_members with admin-capable roles", () => {
    expect(src).toMatch(/from\('org_members'\)[\s\S]*?in\('role', \['owner', 'admin', 'tour_manager', 'production'\]\)/)
  })

  it("grants super to direct organization creators (owner invariant)", () => {
    expect(src).toMatch(/from\('organizations'\)[\s\S]*?eq\('created_by', userId\)/)
  })

  it("keeps confirmed tour collaborators at support level", () => {
    expect(src).toMatch(/profileType: 'tour_collaborator'/)
    expect(src).toMatch(/adminLevel: 'support'/)
  })

  it("no longer treats organizer_accounts or account_relationships as grants", () => {
    expect(src).not.toMatch(/from\('organizer_accounts'\)/)
    expect(src).not.toMatch(/from\('account_relationships'\)/)
  })

  it("does not read self-serviceable profile shapes for authorization", () => {
    const selectClause = src.match(/select\('([^']*)'\)/)?.[1] ?? ""
    expect(selectClause).not.toContain("account_type")
    expect(selectClause).not.toContain("account_settings")
  })

  it("DB guard blocks self-elevation of privilege columns", () => {
    expect(sql).toMatch(/guard_profile_privilege_columns/)
    expect(sql).toMatch(/self_elevation_blocked/)
    expect(sql).toMatch(/before insert or update on public\.profiles/)
  })
})
