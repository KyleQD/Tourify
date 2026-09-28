import { describe, expect, it } from 'vitest'
import {
  assertComms101InventoryCoverage,
  COMMS_DELIVERY_PATHS,
  COMMS_REQUIRED_CHANNELS,
} from '@/lib/admin/comms-path-inventory'

describe('COMMS-101 path inventory', () => {
  it('covers every required channel with complete metadata', () => {
    const coverage = assertComms101InventoryCoverage()
    expect(coverage.failures).toEqual([])
    expect(coverage.ok).toBe(true)
  })

  it('includes platform pipes and publication outbox', () => {
    const ids = COMMS_DELIVERY_PATHS.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining([
      'PIPE-ONS',
      'PIPE-OUTBOUND',
      'PIPE-WEBHOOK',
      'PIPE-PUB-OUTBOX',
      'ADMIN-COMMS-TEAM',
      'LOG-TRAVEL-CHANGE',
      'WORKMODE-PUB',
      'CHAT-DM',
    ]))
    for (const channel of COMMS_REQUIRED_CHANNELS) {
      expect(COMMS_DELIVERY_PATHS.some((p) => p.channels.includes(channel))).toBe(true)
    }
  })

  it('marks double-delivery and fire-and-forget risks for convergence', () => {
    const webhook = COMMS_DELIVERY_PATHS.find((p) => p.id === 'PIPE-WEBHOOK')
    const team = COMMS_DELIVERY_PATHS.find((p) => p.id === 'ADMIN-COMMS-TEAM')
    expect(webhook?.convergence).toBe('retire')
    expect(team?.dedupeRetry).toMatch(/double fanout/i)
    expect(COMMS_DELIVERY_PATHS.filter((p) => p.convergence === 'merge-outbox').length).toBeGreaterThan(10)
  })
})
