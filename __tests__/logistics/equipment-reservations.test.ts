import { describe, expect, it } from 'vitest'
import { detectWindowOverlap } from '@/lib/logistics/conflicts'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('equipment reservations', () => {
  it('treats overlapping asset windows as conflicts', () => {
    const conflict = detectWindowOverlap({
      idA: 'r1',
      idB: 'r2',
      startA: '2026-08-01T10:00:00Z',
      endA: '2026-08-01T18:00:00Z',
      startB: '2026-08-01T16:00:00Z',
      endB: '2026-08-01T22:00:00Z',
      label: 'Serialized asset overlap',
    })
    expect(conflict?.code).toBe('schedule_overlap')
  })

  it('reservation route uses conflict detection and org scope', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/admin/logistics/equipment/reservations/route.ts'),
      'utf8'
    )
    expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
    expect(source).toContain('detectWindowOverlap')
    expect(source).toContain('equipment_reservations')
  })
})
