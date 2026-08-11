import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260811182035_admin_owner_org_scope_repair.sql'),
  'utf8',
)

describe('admin owner org scope repair migration', () => {
  it('links legacy organizer accounts to operations organizations', () => {
    expect(migration).toContain('ops_org_id is null')
    expect(migration).toContain('insert into public.organizations')
    expect(migration).toContain('set ops_org_id = new_org_id')
  })

  it('backfills missing owner memberships without overwriting existing roles', () => {
    expect(migration).toContain("insert into public.org_members (org_id, user_id, role, invited_by)")
    expect(migration).toContain("select oa.ops_org_id, oa.user_id, 'owner', oa.user_id")
    expect(migration).toContain('on conflict (org_id, user_id) do nothing')
  })
})
