import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getDefaultAllocationReleaseAt,
  normalizeInviteEmail,
} from '@/lib/ticketing/guest-list'

const root = process.cwd()
const migration = readFileSync(
  join(root, 'supabase/migrations/20260821025543_unified_guest_list_admissions.sql'),
  'utf8',
)
const notifications = readFileSync(join(root, 'lib/ticketing/notifications.ts'), 'utf8')

describe('unified guest-list helpers', () => {
  it('normalizes recipient email before ownership matching', () => {
    expect(normalizeInviteEmail(' Guest@Example.COM ')).toBe('guest@example.com')
    expect(normalizeInviteEmail('  ')).toBeNull()
  })

  it('uses sales close as the default release cutoff', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    expect(getDefaultAllocationReleaseAt({
      now,
      saleEnd: '2026-08-21T01:00:00.000Z',
      eventStart: '2026-08-21T04:00:00.000Z',
    })).toBe('2026-08-21T01:00:00.000Z')
  })

  it('falls back to two hours before event start', () => {
    expect(getDefaultAllocationReleaseAt({
      now: new Date('2026-08-20T12:00:00.000Z'),
      eventStart: '2026-08-21T04:00:00.000Z',
    })).toBe('2026-08-21T02:00:00.000Z')
  })
})

describe('unified guest-list migration contract', () => {
  it('moves the full admission graph onto events_v2', () => {
    expect(migration).toContain('foreign key (event_id) references public.events_v2(id)')
    expect(migration).toContain('add column if not exists event_v2_id uuid references public.events_v2(id)')
  })

  it('enforces allocation bounds and locks pools for final-spot concurrency', () => {
    expect(migration).toContain('quantity_issued <= quantity_total')
    expect(migration).toMatch(/from public\.ticket_allocations\s+where id = p_allocation_id for update/)
    expect(migration).toContain("if v_active_count >= v_allocation.quantity_total then raise exception 'allocation is full'")
  })

  it('creates no ticket or credential until transactional acceptance', () => {
    const createInviteStart = migration.indexOf('create or replace function private.create_ticket_invite')
    const acceptStart = migration.indexOf('create or replace function private.accept_ticket_invite')
    const declineStart = migration.indexOf('create or replace function private.decline_ticket_invite')
    const createInviteSql = migration.slice(createInviteStart, acceptStart)
    const acceptSql = migration.slice(acceptStart, declineStart)
    expect(createInviteSql).not.toContain('insert into public.tickets(')
    expect(createInviteSql).not.toContain('insert into public.ticket_credentials')
    expect(acceptSql).toContain('insert into public.tickets(')
    expect(acceptSql).toContain('insert into public.ticket_credentials')
    expect(acceptSql).toContain("'non_transferable', true")
  })

  it('scopes accepted tickets to the event organization so the owner wallet can read them', () => {
    expect(migration).toContain('select org_id into v_org_id from public.events_v2')
    expect(migration).toMatch(/insert into public\.ticket_sales\(\s*org_id,/)
    expect(migration).toMatch(/insert into public\.tickets\(\s*org_id,/)
  })

  it('adds accepted canonical admissions to Upcoming Events atomically', () => {
    expect(migration).toContain("check (event_table in ('artist_events', 'events', 'events_v2'))")
    expect(migration).toContain('insert into public.event_attendance(event_id, user_id, event_table, status, updated_at)')
    expect(migration).toContain("values (v_invite.event_id, p_user_id, 'events_v2', 'attending', now())")
    expect(migration).toContain('on conflict (event_id, user_id, event_table)')
  })

  it('keeps token mutation RPCs service-only', () => {
    expect(migration).toContain('set token_hash = p_token_hash')
    expect(migration).toContain('revoke execute on function public.ticketing_rotate_invite_token(uuid,text) from public, anon, authenticated')
    expect(migration).toContain('grant execute on function public.ticketing_rotate_invite_token(uuid,text) to service_role')
  })

  it('does not require legacy ticketing permission helpers to exist', () => {
    expect(migration).toContain("to_regprocedure('public.can_ticketing_on_event(uuid,text)')")
    expect(migration).toContain("to_regprocedure('public.has_event_ticketing_grant(uuid,text)')")
    const policies = migration.slice(migration.indexOf('drop policy if exists ticket_allocations_all'))
    expect(policies).not.toMatch(/public\.can_ticketing_on_event\(event_id/)
    expect(policies).not.toMatch(/public\.has_event_ticketing_grant\(event_id/)
    expect(policies).toContain("private.can_access_event_ticketing(event_id, 'manage_guestlist')")
  })

  it('releases only the unused portion of held inventory', () => {
    expect(migration).toContain('v_remaining := greatest(v_reservation.quantity - v_reservation.quantity_consumed, 0)')
    expect(migration).toContain('quantity_reserved = greatest(quantity_reserved - v_remaining, 0)')
  })
})

describe('guest-list notification contract', () => {
  it('links the invitation notification directly to acceptance', () => {
    expect(notifications).toContain('link: params.inviteUrl')
    expect(notifications).toContain('idempotency_key: `ticket_invite:${params.inviteId}`')
  })

  it('links the accepted notification to the ticket wallet', () => {
    expect(notifications).toContain("link: '/tickets/my-tickets'")
    expect(notifications).toContain('idempotency_key: `comp_issued:${params.ticketId}`')
  })
})
