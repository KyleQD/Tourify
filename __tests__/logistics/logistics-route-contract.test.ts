import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Operations logistics route contracts', () => {
  it('exposes one organization-bound logistics overview read model', () => {
    const route = read('app/api/admin/logistics/overview/route.ts')
    const service = read('lib/admin/logistics-overview.service.ts')

    expect(route).toContain('withAdminCapability')
    expect(route).toContain('"logistics.view"')
    expect(route).toContain('loadAdminLogisticsOverview')
    expect(service).toContain('resolveAuthorizedOrgLogisticsScope')
    expect(service).toContain('allowedTourIds')
    expect(service).toContain('Promise.all')
    expect(service).toContain('status: "unavailable"')
    expect(service).toContain('.from("staff_shifts")')
    expect(service).toContain('Uncovered ${String(shift.role_assignment || "staff")} shift')
    expect(service).not.toContain('medical')
    expect(service).not.toContain('dietary')
    expect(service).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

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
    expect(source).toContain('withAdminCapability')
    expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
  })

  it('uses the canonical capability gate for logistics task mutations', () => {
    for (const path of [
      'app/api/admin/logistics/items/[id]/route.ts',
      'app/api/admin/logistics/items/[id]/status/route.ts',
      'app/api/admin/logistics/items/bulk/route.ts',
    ]) {
      const source = read(path)
      expect(source).toContain("withAdminCapability('logistics.manage'")
      expect(source).not.toContain('authenticateApiRequest')
      expect(source).not.toContain('checkAdminPermissions')
      expect(source).not.toContain('resolveActingAdminContext')
      expect(source).toContain('executeLogisticsCommand')
    }
  })

  it('persists logistics context on team communications', () => {
    const source = read('app/api/admin/communications/route.ts')
    const migration = read('supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql')

    expect(source).toContain('event_id')
    expect(source).toContain('tour_id')
    expect(source).toContain('site_map_id')
    expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
    expect(source).toContain('sendLogisticsNotifications')
    expect(migration).toContain('add column if not exists event_id')
    expect(migration).toContain('add column if not exists metadata')
  })

  it('exposes transport catering backline and reservation logistics APIs', () => {
    const transport = read('app/api/admin/logistics/transport/route.ts')
    const catering = read('app/api/admin/logistics/catering/route.ts')
    const backline = read('app/api/admin/logistics/backline/route.ts')
    const reservations = read('app/api/admin/logistics/equipment/reservations/route.ts')
    const foundation = read('supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql')

    expect(transport).toContain('ground_transportation_coordination')
    expect(catering).toContain('buildDietaryKitchenSummary')
    expect(backline).toContain('backline_requirements')
    expect(reservations).toContain('equipment_reservations')
    expect(foundation).toContain('catering_services')
    expect(foundation).toContain('logistics_acknowledgements')
  })

  it('scopes legacy travel, lodging, and rental APIs through active event and tour parents', () => {
    const travel = read('app/api/admin/travel-coordination/route.ts')
    const lodging = read('app/api/admin/lodging/route.ts')
    const rentals = read('app/api/admin/rentals/route.ts')
    const tenantKeys = read('lib/admin/travel-tenant-keys.ts')

    for (const source of [travel, lodging, rentals]) {
      expect(source).toContain("capabilities.includes('logistics.view')")
      expect(source).toContain("capabilities.includes('logistics.manage')")
      expect(source).toContain('resolveAuthorizedOrgLogisticsScope')
    }

    expect(travel).toContain('Select a tour or event to view travel logistics.')
    expect(travel).not.toContain(".eq('org_id'")
    expect(lodging).toContain('Select a tour or event to view lodging.')
    expect(lodging).toContain('lodging_bookings!inner')
    expect(lodging).toContain('organization vendor foundation')
    expect(lodging).not.toContain(".eq('org_id'")
    expect(rentals).toContain('Select a tour or event to view rentals.')
    expect(rentals).toContain('organization vendor foundation')
    expect(tenantKeys).toContain('enumerable: false')
  })

  it('uses only active-schema columns in the organization overview projection', () => {
    const service = read('lib/admin/logistics-overview.service.ts')

    expect(service).not.toContain('ops_owner_user_id')
    expect(service).not.toContain('owner_user_id')
    expect(service).not.toContain('venue_city')
    expect(service).toContain('.from("day_sheets").select("event_id, updated_at, distributed_at, version")')
    expect(service).not.toContain('.from("day_sheets").select("event_id, updated_at, distributed_at, version, status")')
    expect(service).toContain('.from("venues_v2")')
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

    expect(elements).toContain('sync_site_map_elements')
    expect(elements).toContain('isMissingSiteMapElementSyncFunction')
    expect(elements).toContain('syncSiteMapElementsWithoutRpc')
    expect(elements).toContain('resolveAuthorizedOrgLogisticsScope')

    expect(publish).toContain("status: 'published'")
    expect(publish).toContain('worker_url')
    expect(publish).toContain('/work/site-maps/')
  })

  it('exposes worker site map and bulk zone assign routes', () => {
    const worker = read('app/api/work/site-maps/[id]/route.ts')
    const bulk = read('app/api/admin/logistics/site-maps/[id]/zones/bulk-assign/route.ts')
    const ownership = read('supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql')

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

  it('creates site maps with a minimal select and canonical organization scope', () => {
    const source = read('app/api/admin/logistics/site-maps/route.ts')
    const manager = read('components/admin/logistics/site-map/site-map-manager.tsx')
    const createSheet = read('components/admin/logistics/site-map/site-map-create-sheet.tsx')
    const clientHook = read('hooks/use-site-maps.ts')
    const migration = read('supabase/migrations/20260710193033_site_map_rls_no_recursion.sql')
    const guard = read('components/account/account-route-guard.tsx')

    expect(source).toContain("const selectCreated = '*'")
    expect(source).toContain('event_v2_id: eventId || null')
    expect(source).toContain("code: 'site_map_scope_required'")
    expect(source).toContain("runListQuery('event_v2_id')")
    expect(source).toContain("runListQuery('event_id')")
    expect(source).toContain('isMissingSiteMapEventV2Column')
    expect(source).not.toContain('event_id: body.eventId || null')
    expect(manager).toContain('upsertSiteMap(data.data)')
    expect(manager).toContain('openSiteMap(data.data.id)')
    expect(manager).toContain("if (eventId) formData.append('eventId', eventId)")
    expect(manager).toContain('const hasCreationScope = Boolean(eventId || tourId)')
    expect(manager).toContain('disabled={!hasCreationScope || !isAdminReady}')
    expect(createSheet).toContain('Select an event or tour in Logistics before creating a site map.')
    expect(createSheet).not.toContain('create now and attach an event later')
    expect(clientHook).toContain('useAdminActingRequest')
    expect(clientHook).toContain('requestScopeKeyRef.current !== requestContextKey')
    expect(migration).toContain('private.user_owns_site_map')
    expect(migration).toContain('private.user_is_site_map_collaborator')
    expect(migration).toContain('create schema if not exists private')
    expect(guard).toContain('ofType.length >= 1')
    expect(guard).toContain('auto-select first match')
  })

  it('routes Admin site-map clients through the acting-organization adapter', () => {
    const clients = [
      'app/admin/dashboard/events/[id]/components/event-site-map-tab.tsx',
      'app/admin/dashboard/events/[id]/day-sheet/page.tsx',
      'components/admin/event-communication-hub.tsx',
      'components/admin/logistics/site-map/site-map-manager.tsx',
      'components/admin/logistics/site-map-builder/simcity-site-map-viewer.tsx',
      'components/admin/logistics/site-map-collaboration-panel.tsx',
      'components/admin/logistics/site-map-share-dialog.tsx',
      'components/admin/logistics/vendor-management.tsx',
      'hooks/use-site-maps.ts',
    ]

    for (const path of clients) {
      const source = read(path)
      expect(source, path).toContain('adminFetch')
      expect(source, path).not.toMatch(/\bfetch\(\s*[`'"]\/api\/admin\/logistics\/site-map/)
    }
  })
})
