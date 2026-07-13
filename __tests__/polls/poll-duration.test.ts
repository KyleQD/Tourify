import { describe, expect, it } from 'vitest'
import {
  isPollClosed,
  isPollDuration,
  isValidPollOptionCount,
  normalizePollOptions,
  resolvePollEndsAt,
} from '@/lib/polls/poll-duration'

describe('poll-duration', () => {
  it('normalizes and validates poll options', () => {
    expect(normalizePollOptions([' A ', '', 'B', 'C', 'D', 'E'])).toEqual(['A', 'B', 'C', 'D'])
    expect(isValidPollOptionCount(['A'])).toBe(false)
    expect(isValidPollOptionCount(['A', 'B'])).toBe(true)
    expect(isValidPollOptionCount(['A', 'B', 'C', 'D', 'E'])).toBe(false)
  })

  it('resolves duration to poll_ends_at', () => {
    expect(isPollDuration('7d')).toBe(true)
    expect(isPollDuration('2d')).toBe(false)

    const from = new Date('2026-07-11T12:00:00.000Z')
    const endsAt = resolvePollEndsAt({ duration: '1d', from })
    expect(endsAt?.toISOString()).toBe('2026-07-12T12:00:00.000Z')

    expect(resolvePollEndsAt({ duration: 'bad' })).toBeNull()
  })

  it('detects closed polls', () => {
    const now = new Date('2026-07-11T12:00:00.000Z')
    expect(isPollClosed('2026-07-11T11:00:00.000Z', now)).toBe(true)
    expect(isPollClosed('2026-07-11T13:00:00.000Z', now)).toBe(false)
    expect(isPollClosed(null, now)).toBe(false)
  })
})
