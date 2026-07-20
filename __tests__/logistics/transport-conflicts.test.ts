import { describe, expect, it } from 'vitest'
import {
  detectCapacityOverflow,
  detectDoubleBookedKey,
  detectTransferBufferConflict,
} from '@/lib/logistics/conflicts'

describe('transport conflicts', () => {
  it('blocks over-capacity passenger loads', () => {
    expect(detectCapacityOverflow({ id: 'seg-1', capacity: 6, assigned: 8 })?.severity)
      .toBe('blocking')
  })

  it('detects double-booked drivers across overlapping segments', () => {
    const conflicts = detectDoubleBookedKey({
      key: 'Jordan',
      occurrences: [
        { id: 'a', start: '2026-08-01T08:00:00Z', end: '2026-08-01T10:00:00Z' },
        { id: 'b', start: '2026-08-01T09:30:00Z', end: '2026-08-01T11:00:00Z' },
      ],
    })
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].impactedPeople).toContain('Jordan')
  })

  it('warns on tight airport transfer buffers', () => {
    expect(detectTransferBufferConflict({
      id: 'transfer-1',
      earlierEnd: '2026-08-01T14:00:00Z',
      laterStart: '2026-08-01T14:15:00Z',
      requiredMinutes: 45,
      label: 'Airport to venue transfer too tight',
    })?.code).toBe('insufficient_transfer_buffer')
  })
})
