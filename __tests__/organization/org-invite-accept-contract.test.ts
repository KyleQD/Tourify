import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const migration = readFileSync(join(root, 'supabase/migrations/20260909195618_atomic_org_invites.sql'), 'utf8')
const org005Migration = readFileSync(join(root, 'supabase/migrations/20260910000001_get_active_organizer_account_for_org.sql'), 'utf8')
const acceptRoute = readFileSync(join(root, 'app/api/orgs/invite/accept/route.ts'), 'utf8')
const revokeRoute = readFileSync(join(root, 'app/api/orgs/invite/revoke/route.ts'), 'utf8')
const inviteAction = readFileSync(join(root, 'app/orgs/_actions/org-actions.ts'), 'utf8')

describe('organization invite acceptance contract', () => {
  it('stores only a token hash and accepts membership in one database function', () => {
    expect(inviteAction).toContain("createHash('sha256').update(token).digest('hex')")
    expect(inviteAction).toContain('token_hash: tokenHash')
    expect(migration).toContain('create or replace function public.accept_org_invite(p_token_hash text)')
    expect(migration).toContain('for update;')
    expect(migration).toContain('on conflict (org_id, user_id) do nothing')
    expect(migration).toContain('update public.org_invites set token = null')
  })

  it('keeps acceptance and revocation authenticated and rate limited', () => {
    expect(acceptRoute).toContain("namespace: 'org-invite-accept'")
    expect(acceptRoute).toContain("rpc('accept_org_invite'")
    expect(revokeRoute).toContain("namespace: 'org-invite-revoke'")
    expect(revokeRoute).toContain("rpc('revoke_org_invite'")
    expect(migration).toContain('grant execute on function public.revoke_org_invite(uuid) to authenticated')
  })

  it('routes organizer account resolution through a guarded security definer helper (ORG-005)', () => {
    expect(org005Migration).toContain('create or replace function public.get_active_organizer_account_for_org(p_org_id uuid)')
    expect(org005Migration).toContain('security definer')
    expect(org005Migration).toContain('set search_path = pg_catalog, public')
    expect(org005Migration).toContain('if public.is_org_member(auth.uid(), p_org_id) is not true then')
    expect(org005Migration).toContain('where ops_org_id = p_org_id and is_active = true')
    expect(org005Migration).toContain('revoke all on function public.get_active_organizer_account_for_org(uuid) from public, anon')
    expect(org005Migration).toContain('grant execute on function public.get_active_organizer_account_for_org(uuid) to authenticated')
  })

  it('keeps accept_org_invite invoker-rights with the inline organizer read replaced by the helper (ORG-005)', () => {
    expect(org005Migration).toContain('create or replace function public.accept_org_invite(p_token_hash text)')
    expect(org005Migration).toContain('security invoker')
    expect(org005Migration).toContain('on conflict do nothing')
    expect(org005Migration).toContain('v_organizer_id := public.get_active_organizer_account_for_org(v_invite.org_id);')
    expect(org005Migration).toContain('raise exception \'email_mismatch\'')
    expect(org005Migration).toContain('revoke all on function public.accept_org_invite(text) from public, anon')
    expect(org005Migration).toContain('grant execute on function public.accept_org_invite(text) to authenticated')
  })
})
