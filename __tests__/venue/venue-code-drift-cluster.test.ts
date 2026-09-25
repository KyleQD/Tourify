import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * DB-008 code-drift cluster "venue" — the retired venue workforce and
 * venue-projection surface.
 *
 * `docs/engineering/database-type-inventory-2026-09-25.json` proved by an
 * ordered CREATE/DROP/RENAME replay over the 302 active migrations that these
 * objects are absent from BOTH the active chain and `lib/database.types.ts`.
 * They are not stale types: regenerating the contract cannot create them
 * either, because no migration creates them. The only fix is to repoint the
 * consumer onto a canonical object the chain does create, or to delete the
 * consumer when nothing calls it.
 *
 * This file is a fast-tier lock over the venue-owned half of that cluster. It
 * pins, per object:
 *   - the archived SQL that proves the object was never in the active chain,
 *   - the canonical object the consumer now reads, and
 *   - the absence of the archived object from every venue-owned path.
 *
 * Consumers outside the venue domain (lib/services/**, app/setup/**,
 * app/services/**, app/api/venues/**, app/api/ticketing/**) are covered by
 * their owning lane's handoff and are deliberately not asserted here.
 */

const ROOT = process.cwd()

function read(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8")
}

const MIGRATION_DIR = join(ROOT, "supabase/migrations")
const BACKUP_DIR = join(ROOT, "supabase/migrations_backup")

/** Reads every numbered active migration once. */
function activeMigrationSources(): Map<string, string> {
  const sources = new Map<string, string>()
  for (const name of readdirSync(MIGRATION_DIR)) {
    if (!name.endsWith(".sql")) continue
    sources.set(name, readFileSync(join(MIGRATION_DIR, name), "utf8"))
  }
  return sources
}

const ACTIVE_MIGRATIONS = activeMigrationSources()

/** The retired venue code-drift objects, with the SQL that proves they are archived. */
const ARCHIVED_VENUE_OBJECTS = [
  {
    object: "venue_crew_members",
    canonicalReplacement: "organization_people",
    proof: "supabase/migrations/archive/enhanced_staff_management_schema.sql",
    backup: "20250118000000_enhanced_staff_management.sql",
  },
  {
    object: "venue_team_contractors",
    canonicalReplacement: "organization_people",
    proof: "supabase/migrations/archive/enhanced_staff_management_schema.sql",
    backup: "20250118000000_enhanced_staff_management.sql",
  },
  {
    object: "get_staff_dashboard_stats",
    canonicalReplacement: "staff_members",
    proof: "supabase/migrations/archive/enhanced_staff_management_schema.sql",
    backup: "20250118000000_enhanced_staff_management.sql",
  },
  {
    object: "event_team_messages",
    canonicalReplacement: null,
    proof: "supabase/migrations_backup/20240320000000_add_event_management_tables.sql",
    backup: "20240320000000_add_event_management_tables.sql",
  },
  {
    object: "venue_shift_templates",
    canonicalReplacement: "venue_recurring_shifts",
    proof: "supabase/migrations_backup/20250122000000_enhanced_scheduling_shifts.sql",
    backup: "20250122000000_enhanced_scheduling_shifts.sql",
  },
] as const

/** Every venue-owned directory the drift cluster could resurface in. */
const VENUE_OWNED_ROOTS = ["app/venue", "app/api/venue", "lib/venue"] as const

function venueOwnedSources(): Map<string, string> {
  const sources = new Map<string, string>()
  const visit = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const relativePath = `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "__tests__"].includes(entry.name)) continue
        visit(relativePath)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        sources.set(relativePath, readFileSync(join(ROOT, relativePath), "utf8"))
      }
    }
  }
  for (const root of VENUE_OWNED_ROOTS) visit(root)
  return sources
}

const VENUE_OWNED = venueOwnedSources()

/**
 * True when any active migration issues DDL that creates the named object.
 *
 * A bare `source.includes(object)` is too weak: `event_team_messages` appears in
 * `20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` only as a string
 * inside a "all other linted tables" array whose grants are applied under a
 * `to_regclass` guard. That is a name reference, not a creation.
 */
function createsInActiveChain(object: string): string[] {
  const pattern = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?["']?${object}["']?\\s*\\(`,
    "i",
  )
  const createFunction = new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?["']?${object}["']?\\s*\\(`,
    "i",
  )
  return [...ACTIVE_MIGRATIONS.entries()]
    .filter(([, source]) => pattern.test(source) || createFunction.test(source))
    .map(([name]) => name)
}

describe("DB-008 venue code-drift cluster: objects are archived, not stale types", () => {
  it.each(ARCHIVED_VENUE_OBJECTS)("$object is never created by an active migration", ({ object }) => {
    expect(createsInActiveChain(object)).toEqual([])
  })

  it.each(ARCHIVED_VENUE_OBJECTS)("$object is absent from the generated contract", ({ object }) => {
    // The relations block of lib/database.types.ts. A missing relation makes
    // PostgREST's builder resolve to an error type, which is the source of the
    // 135 diagnostics this cluster accounts for.
    const types = read("lib", "database.types.ts")
    expect(types).not.toContain(`      ${object}: {`)
  })

  it.each(ARCHIVED_VENUE_OBJECTS)("$object survives only in archived/backup SQL", ({ object, proof, backup }) => {
    // `proof` is a repo-relative path; `backup` is a file name under migrations_backup.
    expect(existsSync(join(ROOT, proof))).toBe(true)
    expect(readFileSync(join(ROOT, proof), "utf8")).toContain(object)

    // The backup copy is the migration-shaped source that never reached the chain.
    expect(existsSync(join(BACKUP_DIR, backup))).toBe(true)
    expect(readFileSync(join(BACKUP_DIR, backup), "utf8")).toContain(object)
  })
})

describe("DB-008 venue code-drift cluster: no archived object is read from venue-owned code", () => {
  it.each(ARCHIVED_VENUE_OBJECTS.map((entry) => entry.object))(
    "%s has no reader, writer, or rpc call left under the venue domain",
    (object) => {
      const needles = [`.from('${object}')`, `.from("${object}")`, `rpc('${object}'`, `rpc("${object}"`]
      const offenders = [...VENUE_OWNED.entries()]
        .filter(([, source]) => needles.some((needle) => source.includes(needle)))
        .map(([path]) => path)

      expect(offenders).toEqual([])
    },
  )
})

describe("DB-008 venue code-drift cluster: retired workforce service is deleted, not repointed", () => {
  it("removes the zero-importer lib/venue/staff-management.service.ts", () => {
    // Zero importers were proven with `rg` over the whole tree: the only
    // remaining mentions of StaffManagementService / StaffDashboardStats /
    // TeamContractor are in docs/, and lib/services/staff-management.service.ts
    // declares its own identically named class in a different file.
    expect(existsSync(join(ROOT, "lib/venue/staff-management.service.ts"))).toBe(false)
  })

  it("leaves the canonical roster and workforce identity maps in place", () => {
    // Deleting the dead service must not delete the objects the repository
    // names as the canonical destinations.
    const canonicalRoster = ACTIVE_MIGRATIONS.get("20260823070000_staff_members_canonical_roster.sql")
    expect(canonicalRoster).toBeDefined()
    expect(canonicalRoster).toContain("staff_members")

    const identityMap = read("lib", "admin", "workforce-identity-map.ts")
    expect(identityMap).toContain("organization_people")
  })
})

describe("DB-008 venue code-drift cluster: retired event team chat is deleted, not repointed", () => {
  it("removes the zero-importer chat subtree", () => {
    // `app/venue/components/chat-tab.tsx` had zero importers, so the only
    // importer of `app/venue/actions/chat-actions.ts` was itself unreachable,
    // and `app/venue/types/chat.ts` was imported only by those two files.
    for (const path of [
      "app/venue/components/chat-tab.tsx",
      "app/venue/actions/chat-actions.ts",
      "app/venue/types/chat.ts",
    ]) {
      expect(existsSync(join(ROOT, path))).toBe(false)
    }
  })

  it("documents why event_group_messages is not a usable replacement", () => {
    // `event_group_messages` is the only chain-created event chat message table,
    // but 20260413210000_event_communications_system.sql grants it service_role
    // full access only — there is no client-role policy. The deleted surface
    // read and wrote it through a user-session server action, so repointing
    // would have converted a missing-relation error into an RLS denial.
    const communications = ACTIVE_MIGRATIONS.get("20260413210000_event_communications_system.sql")
    expect(communications).toBeDefined()
    expect(communications).toContain("CREATE TABLE IF NOT EXISTS event_group_messages")
    expect(communications).toContain(
      'CREATE POLICY "Service role full access on event_group_messages"',
    )
  })
})

describe("DB-008 venue code-drift cluster: venue_shift_templates consumer is repointed", () => {
  const SHIFT_TEMPLATES = "app/venue/components/staff/shift-templates.tsx"

  it("reads the canonical venue_recurring_shifts table", () => {
    const source = read(SHIFT_TEMPLATES)
    expect(source).toContain(".from('venue_recurring_shifts')")
    expect(source).not.toContain(".from('venue_shift_templates')")
  })

  it("selects only columns the canonical table declares", () => {
    const source = read(SHIFT_TEMPLATES)
    // venue_recurring_shifts: id, shift_title, department, start_time, end_time,
    // staff_needed. `template_name` belonged to the archived table.
    expect(source).toContain(
      "'id, shift_title, department, start_time, end_time, staff_needed'",
    )
    expect(source).not.toContain("template_name")
    // The archived query also ordered by a column that never existed.
    expect(source).toContain(".order('shift_title', { ascending: true })")
  })

  it("keeps the read RLS-scoped to the browser session client", () => {
    const source = read(SHIFT_TEMPLATES)
    expect(source).toContain("from '@/lib/supabase/client'")
    expect(source).toContain(".eq('venue_id', venueId)")
    // No privileged client may appear in a venue staff surface.
    expect(source).not.toContain("@/lib/supabase/service-role")
  })

  it("proves venue_recurring_shifts is created by the active chain and typed", () => {
    const portMissingTables = ACTIVE_MIGRATIONS.get("20260413200000_port_missing_tables.sql")
    expect(portMissingTables).toBeDefined()
    expect(portMissingTables).toContain("CREATE TABLE IF NOT EXISTS venue_recurring_shifts")

    // The active chain scopes the table to the venue owner.
    expect(portMissingTables).toContain("venue_recurring_shifts_owner")
    expect(portMissingTables).toContain("USING (venue_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))")

    // The generated contract declares it, so the query type-checks.
    expect(read("lib", "database.types.ts")).toContain("      venue_recurring_shifts: {")
  })

  it("keeps the compatibility re-export pointing at the canonical component", () => {
    const reexport = read("components", "venue", "staff", "shift-templates.tsx")
    expect(reexport).toContain('export { ShiftTemplates } from "@/app/venue/components/staff/shift-templates"')
  })
})
