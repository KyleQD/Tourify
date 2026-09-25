import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readMigrationSql } from '../helpers/migration-source'

/**
 * DB-008 — CI replay-safety contract for the application-document storage
 * policies in the active migration
 *   20260701021033_job_application_profile_snapshot.sql
 *
 * Background: `CREATE POLICY` enforces `pg_class_ownercheck` on the target
 * relation. The server satisfies that for the exact owner, a superuser, OR any
 * member of the owning role. The migration previously issued two unqualified
 * `CREATE POLICY ... ON storage.objects` statements with no permission
 * pre-check and no exception handler, so any replay role outside that set
 * aborted the whole chain with SQLSTATE 42501 "must be owner of table objects"
 * and took the `Database Types` CI job down with it.
 *
 * This test locks the *source* property, because the failure is a property of
 * how the migration replays, not of any one database's current contents.
 */
const MIGRATION = '20260701021033_job_application_profile_snapshot.sql'

const sql = readFileSync(readMigrationSql(MIGRATION), 'utf8')

/** The `do $app_docs_storage$ ... $app_docs_storage$;` block under test. */
function appDocsStorageBlock(source: string): string {
  const match =
    /do \$app_docs_storage\$[\s\S]*?\$app_docs_storage\$;/.exec(source)
  if (!match) {
    throw new Error(
      `${MIGRATION} no longer contains the do $app_docs_storage$ block; ` +
        'retire or rewrite this contract test if the policies move.',
    )
  }
  return match[0]
}

const block = appDocsStorageBlock(sql)

describe('application-document storage policy migration replay safety', () => {
  it('creates both application-document policies on storage.objects', () => {
    expect(block).toContain('create policy "application_documents_insert_own"')
    expect(block).toContain('create policy "application_documents_public_read"')
    expect(block).toContain('on storage.objects')

    // The policy bodies are the access contract and must not drift while the
    // replay guard is added around them.
    expect(block).toContain("for insert")
    expect(block).toContain("bucket_id = 'application-documents'")
    expect(block).toContain('(storage.foldername(name))[1] = auth.uid()::text')
    expect(block).toContain('for select')
  })

  it('absorbs every policy-creation failure so a fresh replay never aborts', () => {
    // Each CREATE POLICY is attempted in its own subtransaction. Without a
    // local exception handler the statement failure propagates out of the DO
    // block and aborts the migration (and the chain) with 42501.
    const createPolicyCount = (block.match(/create policy "/g) ?? []).length
    const handlerCount = (block.match(/exception when others then/g) ?? []).length

    expect(createPolicyCount).toBe(2)
    // One local handler per policy, plus the outer backstop.
    expect(handlerCount).toBeGreaterThanOrEqual(createPolicyCount + 1)
  })

  it('reports a skip as a WARNING, which client_min_messages still emits', () => {
    // The migration starts with `set client_min_messages = warning`, which
    // suppresses NOTICE. A skip reported only as NOTICE would be invisible in
    // CI, so the guard must raise WARNING and carry the SQLSTATE.
    expect(sql).toMatch(/set\s+client_min_messages\s*=\s*warning\s*;/i)
    expect(block).not.toMatch(/raise\s+notice/i)
    expect(block).toMatch(/raise\s+warning/i)
    expect(block).toContain('sqlstate')
    expect(block).toContain('sqlerrm')
  })

  it('does not silently skip when the replay role is permitted to create the policies', () => {
    // A pre-check comparing relowner = current_user is a strict subset of the
    // server predicate: it also returns false for a superuser and for a member
    // of the owning role, both of which the server accepts. That silently drops
    // the policies in the standard Supabase layout (superuser replay with
    // storage.objects owned by supabase_storage_admin), so the migration must
    // not decide permission itself.
    expect(block).not.toMatch(/pg_get_userbyid\s*\(\s*c\.relowner\s*\)\s*=\s*current_user/i)
    expect(block).not.toMatch(/pg_class_ownercheck/i)
    expect(block).not.toMatch(/relowner\s*=\s*current_user/i)
  })

  it('keeps the migration otherwise additive', () => {
    expect(block).not.toMatch(/\bdrop\s+policy\b/i)
    expect(block).not.toMatch(/\bdrop\s+table\b/i)
    expect(block).not.toMatch(/\bdrop\s+schema\b/i)
  })
})

/**
 * DB-008 — the retired venue workforce surface.
 *
 * `venue_crew_members`, `venue_team_contractors` and
 * `get_staff_dashboard_stats` exist only in
 * `supabase/migrations/archive/enhanced_staff_management_schema.sql` and in
 * `supabase/migrations_backup/`. They are absent from the active chain and from
 * the generated type contract, which is why `tsc --noEmit` fails on the venue
 * staff-management services. The repository's own architecture maps already
 * name the canonical destinations (`organization_people` via
 * `lib/admin/workforce-identity-map.ts`, `staff_members` via
 * `20260823070000_staff_members_canonical_roster.sql`), so re-creating these
 * objects would resurrect a documented-duplicate-risk surface instead of
 * closing the gap. This test pins that classification so a future change has
 * to make the retirement decision explicitly rather than by accident.
 */
const RETIRED_OBJECTS = {
  tables: ['venue_crew_members', 'venue_team_contractors'],
  functions: ['get_staff_dashboard_stats'],
} as const

function activeChainSql(): string {
  const dir = join(process.cwd(), 'supabase/migrations')
  return readdirSync(dir)
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n')
}

describe('retired venue workforce schema is not re-added by accident', () => {
  const chain = activeChainSql()

  it.each(RETIRED_OBJECTS.tables)(
    'active migration chain does not create table %s',
    (table) => {
      const creates = new RegExp(
        `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?"?${table}"?`,
        'i',
      )
      expect(creates.test(chain)).toBe(false)
    },
  )

  it.each(RETIRED_OBJECTS.functions)(
    'active migration chain does not create function %s',
    (fn) => {
      const creates = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?"?${fn}"?\\s*\\(`,
        'i',
      )
      expect(creates.test(chain)).toBe(false)
    },
  )

  it.each([...RETIRED_OBJECTS.tables, ...RETIRED_OBJECTS.functions])(
    'generated type contract does not declare %s',
    (objectName) => {
      const types = readFileSync(
        join(process.cwd(), 'lib/database.types.ts'),
        'utf8',
      )
      expect(types).not.toContain(objectName)
    },
  )

  it('the canonical replacements stay the documented destinations', () => {
    // venue_team_members is explicitly legacy; staff_members is the canonical
    // venue roster, and organization_people is the crew/contractor destination.
    const roster = readFileSync(
      readMigrationSql('20260823070000_staff_members_canonical_roster.sql'),
      'utf8',
    )
    expect(roster).toMatch(/COMMENT ON TABLE public\.venue_team_members IS/i)
    expect(roster).toMatch(/LEGACY \(VEN-103\)/)

    const identityMap = readFileSync(
      join(process.cwd(), 'lib/admin/workforce-identity-map.ts'),
      'utf8',
    )
    const crew = identityMap
      .slice(identityMap.indexOf('id: "venue_crew_members"'))
      .split('},')[0]
    expect(crew).toContain('canonicalDestination: "organization_people"')
  })
})
