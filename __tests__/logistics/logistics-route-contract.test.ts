import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Operations logistics route contracts', () => {
  it('keeps logistics metrics scoped by event and tour', () => {
    const source = read('app/api/admin/logistics/metrics/route.ts')

    expect(source).toContain("searchParams.get('eventId')")
    expect(source).toContain("searchParams.get('tourId')")
    expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
    expect(source).toContain('applyOrgLogisticsTaskFilter')
  })

  it('exposes equipment assignments for logistics item dashboards', () => {
    const source = read('app/api/admin/logistics/items/route.ts')

    expect(source).toContain("type === 'assignments'")
    expect(source).toContain('logistics_task_equipment')
    expect(source).toContain('equipment_links:logistics_task_equipment')
    expect(source).toContain('withAdminAuth')
    expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
  })

  it('persists logistics context on team communications', () => {
    const source = read('app/api/admin/communications/route.ts')
    const migration = read('supabase/migrations/20260630214500_logistics_team_communications_scope.sql')

    expect(source).toContain('event_id')
    expect(source).toContain('tour_id')
    expect(source).toContain('site_map_id')
    expect(migration).toContain('add column if not exists event_id')
    expect(migration).toContain('add column if not exists metadata')
  })

  it('protects direct site map reads and vendor logistics endpoints', () => {
    const siteMapRoute = read('app/api/admin/logistics/site-maps/[id]/route.ts')
    const vendorDashboard = read('app/api/admin/logistics/vendor/dashboard/route.ts')
    const vendorInventory = read('app/api/admin/logistics/vendor/inventory/route.ts')
    const vendorWorkflows = read('app/api/admin/logistics/vendor/workflows/route.ts')

    expect(siteMapRoute).toContain('getSiteMapAccess')
    expect(siteMapRoute).toContain("requireSiteMapAccess(await getSiteMapAccess")
    expect(vendorDashboard).toContain('checkAdminPermissions')
    expect(vendorInventory).toContain('checkAdminPermissions')
    expect(vendorWorkflows).toContain('checkAdminPermissions')
  })

  it('requires site map access on geometry, activity, export, and publish routes', () => {
    const elements = read('app/api/admin/logistics/site-maps/[id]/elements/route.ts')
    const zones = read('app/api/admin/logistics/site-maps/[id]/zones/route.ts')
    const tents = read('app/api/admin/logistics/site-maps/[id]/tents/route.ts')
    const activity = read('app/api/admin/logistics/site-maps/[id]/activity/route.ts')
    const exportRoute = read('app/api/admin/logistics/site-maps/[id]/export/route.ts')
    const publish = read('app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts')
    const share = read('app/api/admin/logistics/site-maps/[id]/share/route.ts')

    for (const source of [elements, zones, tents, activity, exportRoute, publish, share]) {
      expect(source).toContain('getSiteMapAccess')
      expect(source).toContain('requireSiteMapAccess')
    }

    expect(publish).toContain("status: 'published'")
    expect(publish).toContain('worker_url')
    expect(publish).toContain('/work/site-maps/')
  })

  it('exposes worker site map and bulk zone assign routes', () => {
    const worker = read('app/api/work/site-maps/[id]/route.ts')
    const bulk = read('app/api/admin/logistics/site-maps/[id]/zones/bulk-assign/route.ts')
    const ownership = read('supabase/migrations/20260710140000_site_map_zone_ownership.sql')

    expect(worker).toContain('map_task_assignments')
    expect(worker).toContain('employment_assignments')
    expect(bulk).toContain('bulkAssignTeamToZone')
    expect(bulk).toContain('getSiteMapAccess')
    expect(ownership).toContain('lead_user_id')
    expect(ownership).toContain('assigned_department')
  })

  it('lists site maps without a broken includeData=false select', () => {
    const source = read('app/api/admin/logistics/site-maps/route.ts')

    expect(source).toContain("const listSelect = '*'")
    expect(source).toContain('includeData ? detailSelect : listSelect')
    expect(source).not.toMatch(/select\(`\s*\*,\s*\$\{includeData/)
    expect(source).toContain('scale_unit')
    expect(source).toContain('retrying insert without it')
    expect(source).toContain('details: error.message')
  })

  it('creates site maps with a minimal select and optional event scope', () => {
    const source = read('app/api/admin/logistics/site-maps/route.ts')
    const manager = read('components/admin/logistics/site-map/site-map-manager.tsx')
    const migration = read('supabase/migrations/20260710192849_site_map_rls_no_recursion.sql')
    const guard = read('components/account/account-route-guard.tsx')

    expect(source).toContain("const selectCreated = '*'")
    expect(source).toContain('if (body.eventId)')
    expect(manager).toContain('upsertSiteMap(data.data)')
    expect(manager).toContain('openSiteMap(data.data.id)')
    expect(manager).toContain("if (eventId) formData.append('eventId', eventId)")
    expect(migration).toContain('private.user_owns_site_map')
    expect(migration).toContain('private.user_is_site_map_collaborator')
    expect(migration).toContain('create schema if not exists private')
    expect(guard).toContain('ofType.length >= 1')
    expect(guard).toContain('auto-select first match')
  })
})
