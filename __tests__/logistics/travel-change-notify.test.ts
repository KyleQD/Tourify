import { describe, expect, it } from 'vitest'
import {
  diffMaterialFields,
  resolveFlightNotifyType,
  resolveLodgingNotifyType,
} from '@/lib/logistics/travel-change-helpers'

describe('travel-change-notify helpers', () => {
  it('diffs only material flight fields', () => {
    const changed = diffMaterialFields(
      { status: 'scheduled', gate: 'A1', notes: 'x' },
      { status: 'delayed', gate: 'A1', notes: 'y' },
      ['status', 'gate'],
    )
    expect(changed).toEqual(['status'])
  })

  it('resolves flight notify types from status', () => {
    expect(resolveFlightNotifyType('delayed')).toBe('flight_delayed')
    expect(resolveFlightNotifyType('cancelled')).toBe('flight_cancelled')
    expect(resolveFlightNotifyType('scheduled')).toBe('flight_changed')
  })

  it('resolves lodging notify types from status', () => {
    expect(resolveLodgingNotifyType('cancelled')).toBe('lodging_cancelled')
    expect(resolveLodgingNotifyType('confirmed')).toBe('lodging_changed')
  })
})
