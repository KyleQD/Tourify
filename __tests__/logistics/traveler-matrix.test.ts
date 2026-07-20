import { describe, expect, it } from 'vitest'
import { buildTravelerMatrix } from '@/lib/logistics/traveler-matrix'

describe('traveler matrix', () => {
  it('identifies flight lodging and transfer gaps', () => {
    const result = buildTravelerMatrix({
      members: [
        { id: '1', name: 'Alex' },
        { id: '2', name: 'Blake' },
        { id: '3', name: 'Casey' },
      ],
      flightMemberIds: ['1', '2'],
      lodgingMemberIds: ['1'],
      transferMemberIds: ['1', '3'],
    })

    expect(result.missingFlight).toBe(1)
    expect(result.missingLodging).toBe(2)
    expect(result.missingTransfer).toBe(1)
    expect(result.fullyCovered).toBe(1)
    expect(result.rows.find((r) => r.memberId === '1')?.gaps).toEqual([])
  })
})
