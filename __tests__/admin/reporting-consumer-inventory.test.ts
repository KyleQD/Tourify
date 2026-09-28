import { describe, expect, it } from 'vitest'
import {
  assertRep101InventoryCoverage,
  listZeroMockViolations,
  REPORTING_CONSUMERS,
  REPORTING_REQUIRED_KINDS,
} from '@/lib/admin/reporting-consumer-inventory'

describe('REP-101 reporting consumer inventory', () => {
  it('covers every required kind with complete metadata', () => {
    const coverage = assertRep101InventoryCoverage()
    expect(coverage.failures).toEqual([])
    expect(coverage.ok).toBe(true)
  })

  it('includes core dashboards, exports, and known org holes', () => {
    const ids = REPORTING_CONSUMERS.map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining([
      'REP-DASH-ANALYTICS',
      'REP-DASH-FINANCES',
      'REP-QUERY-DASHBOARD-STATS',
      'REP-QUERY-TOP-PERFORMERS',
      'REP-EXPORT-TOUR-PDF-CSV',
      'REP-EXPORT-VENDOR-REPORT-STUB',
      'REP-DASH-LEGACY-MOCK',
    ]))

    for (const kind of REPORTING_REQUIRED_KINDS) {
      expect(REPORTING_CONSUMERS.some((c) => c.kind === kind)).toBe(true)
    }

    const top = REPORTING_CONSUMERS.find((c) => c.id === 'REP-QUERY-TOP-PERFORMERS')
    expect(top?.orgFilter).toBe('no')
  })

  it('documents zero-mock violations for retirement', () => {
    const violations = listZeroMockViolations()
    expect(violations.map((v) => v.id)).toEqual(expect.arrayContaining([
      'REP-DASH-LEGACY-MOCK',
      'REP-EXPORT-VENDOR-REPORT-STUB',
      'REP-CHART-EMBED-HISTORY',
    ]))
    expect(REPORTING_CONSUMERS.filter((c) => c.retirementPlan === 'retire').length).toBeGreaterThan(0)
    expect(REPORTING_CONSUMERS.filter((c) => c.retirementPlan === 'consolidate').length).toBeGreaterThan(3)
  })
})
