import { describe, expect, it } from 'vitest'

import { collectUnavailableDashboardDomains } from '@/lib/admin/dashboard-stats'

describe('dashboard statistics resilience', () => {
  it('reports rejected and errored domains without rejecting healthy results', () => {
    const unavailable = collectUnavailableDashboardDomains([
      ['tours', { status: 'fulfilled', value: { data: [{ id: 'tour-1' }], error: null } }],
      ['finance', { status: 'fulfilled', value: { data: null, error: { message: 'missing view' } } }],
      ['travel', { status: 'rejected', reason: new Error('timeout') }],
    ])

    expect(unavailable).toEqual(['finance', 'travel'])
  })

  it('returns no unavailable domains when every query succeeds', () => {
    expect(collectUnavailableDashboardDomains([
      ['events', { status: 'fulfilled', value: { data: [], error: null } }],
    ])).toEqual([])
  })
})
