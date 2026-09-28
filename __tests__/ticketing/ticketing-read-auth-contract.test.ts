import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const purchaseRoute = readFileSync(join(root, 'app/api/ticketing/enhanced/route.ts'), 'utf8')
const adminOverviewRoute = readFileSync(join(root, 'app/api/admin/ticketing/enhanced/route.ts'), 'utf8')
const reportsRoute = readFileSync(join(root, 'app/api/ticketing/reports/route.ts'), 'utf8')
const checkInRoute = readFileSync(join(root, 'app/api/ticketing/check-in/route.ts'), 'utf8')
const doorCheckIn = readFileSync(join(root, 'components/ticketing/door-check-in.tsx'), 'utf8')

describe('ticketing readiness contracts', () => {
  it('requires authentication before every purchase, independent of feature flags', () => {
    const purchaseStart = purchaseRoute.indexOf("if (action === 'purchase')")
    const configStart = purchaseRoute.indexOf('// Enforce ticketing config when present', purchaseStart)
    const purchaseBlock = purchaseRoute.slice(purchaseStart, configStart)
    expect(purchaseBlock).toContain('if (!user)')
    expect(purchaseBlock).not.toContain('v2Enabled && !user')
  })

  it('returns unavailable when canonical overview metrics are absent', () => {
    expect(adminOverviewRoute).toContain('function requiredMetric')
    expect(adminOverviewRoute).toContain("requiredMetric(totals, 'total_revenue')")
    expect(adminOverviewRoute).toContain("code: 'ticketing_unavailable'")
  })

  it('does not coerce unavailable event report reads into zero', () => {
    expect(reportsRoute).toContain("code: 'ticketing_unavailable'")
    expect(reportsRoute).toContain('checkinsRes.count === null')
    expect(reportsRoute).toContain('compsRes.count === null')
    expect(reportsRoute).toContain('const checkedIn = checkinsRes.count')
    expect(reportsRoute).toContain('complimentary_issued: compsRes.count')
    expect(reportsRoute).not.toContain('checkinsRes.count ??')
    expect(reportsRoute).not.toContain('compsRes.count ?? 0')
  })

  it('fails closed when door statistics are unavailable instead of returning zero', () => {
    expect(checkInRoute).toContain("code: 'ticketing_unavailable'")
    expect(checkInRoute).toContain('totalRes.value.count === null')
    expect(checkInRoute).toContain('checkedInRes.value.count === null')
    expect(checkInRoute).toContain('capRes.value.data.capacity === null')
    expect(checkInRoute).not.toContain('totalRes.value.count ?? 0')
    expect(checkInRoute).not.toContain('checkedInRes.value.count ?? 0')
    expect(checkInRoute).not.toContain('capRes.value.data?.capacity ?? 0')
    expect(doorCheckIn).toContain('function requiredStat')
    expect(doorCheckIn).not.toContain('Number(payload.total || 0)')
    expect(doorCheckIn).not.toContain('Number(payload.checked_in || 0)')
    expect(doorCheckIn).not.toContain('Number(payload.capacity || 0)')
  })
})
