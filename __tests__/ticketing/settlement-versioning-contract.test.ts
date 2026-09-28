import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const route = readFileSync('app/api/ticketing/settlements/route.ts', 'utf8')
const migration = readFileSync(
  'supabase/migrations/20260910150000_version_ticket_revenue_allocations.sql',
  'utf8',
)

describe('TICKET-002 settlement versioning contract', () => {
  it('does not retain a destructive route fallback', () => {
    expect(route).not.toMatch(/from\(['"]ticket_revenue_allocations['"]\)\.delete\(/)
    expect(route).toContain("status: 503")
    expect(route).toContain('versioned: true')
  })

  it('retires active rows and preserves prior revisions in the existing table', () => {
    expect(migration).toContain('for update')
    expect(migration).toContain('set is_active = false')
    expect(migration).toContain('insert into public.ticket_revenue_allocations')
    expect(migration).toContain('return v_active_count')
    expect(migration).not.toMatch(/delete\s+from\s+public\.ticket_revenue_allocations/i)
  })
})
