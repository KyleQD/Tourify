import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { readMigrationSql } from "@/__tests__/helpers/migration-source"

/**
 * VENUE-005 — static invariants for
 * 20260924120000_venue_availability_reservations_scope_rls.sql.
 *
 * The hosted denial proof (SIM-20260922-VENUE-001 / SIM-20260922-DB-002) runs
 * `supabase/tests/venue005_availability_reservations_scope_contract.sql`
 * after the migration applies, which is owned by the DB-002/DB-008 staging lane.
 * Until that apply exists there is no hosted evidence, so this fast-tier test
 * locks the authored SQL to the boundary it claims to close. If a later edit
 * re-grants a client role, drops a write policy, or lets the contract test and
 * the manifest drift away from the SQL, this fails instead of shipping.
 */

const MIGRATION_FILE = "20260924120000_venue_availability_reservations_scope_rls.sql"
const RAW_TABLES = ["venue_availability", "venue_reservations"] as const

/** `readMigrationSql` resolves a path across the active chain and the archive. */
const migrationPath = readMigrationSql(MIGRATION_FILE)
const migrationBytes = readFileSync(migrationPath)
const sql = migrationBytes.toString("utf8")

/** Strips SQL comments so comment text can never satisfy an assertion. */
function code(sqlText: string): string {
  return sqlText
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
}

const statements = code(sql).replace(/\s+/g, " ").trim()

describe("VENUE-005 availability/reservations scope migration", () => {
  it("revokes table-level SELECT from every client role on both raw tables", () => {
    for (const table of RAW_TABLES) {
      const revoke = new RegExp(
        `revoke select on public\\.${table} from anon, public, authenticated\\s*;`,
        "i",
      )
      expect(statements, `missing client SELECT revoke for ${table}`).toMatch(revoke)
    }
  })

  it("retains service_role SELECT on both raw tables", () => {
    for (const table of RAW_TABLES) {
      expect(statements).toMatch(
        new RegExp(`grant select on public\\.${table} to service_role\\s*;`, "i"),
      )
    }
  })

  it("drops the permissive client read policies", () => {
    expect(statements).toMatch(
      /drop policy if exists "Anyone can view venue availability" on public\.venue_availability\s*;/i,
    )
    expect(statements).toMatch(
      /drop policy if exists venue_reservations_public_read on public\.venue_reservations\s*;/i,
    )
  })

  it("creates service-role-only read policies for both raw tables", () => {
    for (const table of RAW_TABLES) {
      const policy = table === "venue_availability" ? "venue_availability_service_read" : "venue_reservations_service_read"
      expect(statements).toMatch(
        new RegExp(
          `create policy ${policy} on public\\.${table} for select to service_role using \\(true\\)\\s*;`,
          "i",
        ),
      )
    }
  })

  it("never grants a client role read access through any statement", () => {
    // Any grant/alter-default-privileges path that hands a raw table to anon,
    // authenticated, or PUBLIC would silently reopen the boundary.
    const clientGrant = /(grant\s+select[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b)|(alter default privileges[^;]*)/i
    expect(statements).not.toMatch(clientGrant)
  })

  it("leaves the venue-scoped write path untouched", () => {
    // venue_reservations_operator and the availability owner policy are FOR ALL
    // and scoped by venue_has_operator_access; dropping them would break the
    // booking/reservation engine.
    expect(statements).not.toMatch(/drop policy[^;]*venue_reservations_operator/i)
    expect(statements).not.toMatch(/drop policy[^;]*"Venue owners can manage their availability"/i)
    expect(statements).not.toMatch(/alter table[^;]*venue_(availability|reservations)[^;]*disable row level security/i)
  })

  it("does not revoke the sanitized public projection", () => {
    expect(statements).not.toMatch(/revoke[^;]*public_venue_availability/i)
    expect(statements).not.toMatch(/drop view[^;]*public_venue_availability/i)
  })

  it("is re-runnable: each new policy is dropped by its own name first (CP-051)", () => {
    for (const policy of ["venue_availability_service_read", "venue_reservations_service_read"]) {
      const dropIndex = statements.search(
        new RegExp(`drop policy if exists ${policy}\\b`, "i"),
      )
      const createIndex = statements.search(new RegExp(`create policy ${policy}\\b`, "i"))
      expect(dropIndex, `missing drop-if-exists guard for ${policy}`).toBeGreaterThanOrEqual(0)
      expect(createIndex, `missing create for ${policy}`).toBeGreaterThanOrEqual(0)
      expect(dropIndex, `${policy} must be dropped before it is created`).toBeLessThan(createIndex)
    }
  })
})

describe("VENUE-005 hosted contract test", () => {
  const contract = readFileSync(
    join(process.cwd(), "supabase/tests/venue005_availability_reservations_scope_contract.sql"),
    "utf8",
  )

  it("keeps the catalog assertions for grants, policies, and the preserved write path", () => {
    expect(contract).toMatch(/role_table_grants/i)
    expect(contract).toMatch(/pg_policies/i)
    expect(contract).toMatch(/venue_reservations_operator/)
    expect(contract).toMatch(/Venue owners can manage their availability/)
  })

  it("keeps executable runtime denial probes for anon and authenticated", () => {
    // The catalog scan alone cannot prove the runtime boundary; the role-switch
    // probes are what make SIM-20260922-VENUE-001/-DB-002 creditable hosted.
    expect(contract).toMatch(/set_config\('role', v_role, true\)/)
    expect(contract).toMatch(/array\s*\[\s*'anon'\s*,\s*'authenticated'\s*\]/)
    expect(contract).toMatch(/when insufficient_privilege then/i)
    expect(contract).toMatch(/array\s*\[\s*'venue_availability'\s*,\s*'venue_reservations'\s*\]/)
    expect(contract).toMatch(/pg_has_role\(current_user, v_role, 'MEMBER'\)/)
    // A misconfigured runner must fail loudly, never report a pass.
    expect(contract).toMatch(/do not report this as a pass/i)
  })
})

describe("VENUE-005 migration validation manifest", () => {
  const manifest = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "docs/engineering/migration-validation/20260924120000_venue_availability_reservations_scope_rls.json",
      ),
      "utf8",
    ),
  ) as { sha256: string; status: string; taskId: string; evidence: Record<string, unknown> }

  it("pins the manifest to the authored migration bytes", () => {
    const digest = createHash("sha256").update(migrationBytes).digest("hex")
    expect(manifest.sha256).toBe(digest)
  })

  it("is owned by VENUE-005 and has not been credited with hosted evidence", () => {
    expect(manifest.taskId).toBe("VENUE-005")
    expect(manifest.status).toBe("planned")
    // CP-051: no hosted apply happened in this lane, so no evidence slot may be
    // filled. Crediting them here would fabricate hosted proof.
    for (const [env, artifact] of Object.entries(manifest.evidence)) {
      expect(artifact, `${env} evidence must stay null until a hosted apply records it`).toBeNull()
    }
  })
})
