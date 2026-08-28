import { describe, expect, it } from 'vitest'
import { readQuarantinedMigration } from './quarantined-migration-history'

const migration = readQuarantinedMigration(
  '20260811182035_admin_owner_org_scope_repair.sql',
)

describe('quarantined admin owner org scope repair history', () => {
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
