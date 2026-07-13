import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Site map ops upgrade contracts', () => {
  it('keeps zone ownership migration and event zone bridge wiring', () => {
    const migration = read('supabase/migrations/20260710140000_site_map_zone_ownership.sql')
    const zonesPost = read('app/api/admin/logistics/site-maps/[id]/zones/route.ts')
    const zonesPut = read('app/api/admin/logistics/site-maps/[id]/zones/[zoneId]/route.ts')
    const sync = read('lib/site-map/zone-roster-sync.ts')

    expect(migration).toContain('lead_user_id')
    expect(migration).toContain('assigned_department')
    expect(zonesPost).toContain('resolveOrCreateEventZone')
    expect(zonesPut).toContain('syncZoneOwnershipToRoster')
    expect(sync).toContain('assigned_zone')
    expect(sync).toContain('assigned_staff_count')
  })

  it('ships worker map surface and simplified venue/artist viewers', () => {
    const workerPage = read('app/work/site-maps/[id]/page.tsx')
    const workerViewer = read('components/site-maps/worker-site-map-viewer.tsx')
    const venue = read('components/venue/site-map-viewer.tsx')
    const artist = read('app/artist/events/[id]/site-map/page.tsx')
    const publish = read('app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts')

    expect(workerPage).toContain('WorkerSiteMapViewer')
    expect(workerViewer).toContain('COMPLETE_TASK')
    expect(venue).toContain('PublicSiteMapViewer')
    expect(artist).toContain('PublicSiteMapViewer')
    expect(publish).toContain('worker_url')
  })

  it('uses a single context drawer and roster-backed task form in the builder', () => {
    const viewer = read('components/admin/logistics/site-map-builder/simcity-site-map-viewer.tsx')
    const drawer = read('components/admin/logistics/site-map-builder/site-map-context-drawer.tsx')
    const taskForm = read('components/admin/logistics/site-map-builder/site-map-task-form.tsx')
    const filterBar = read('components/admin/logistics/site-map-builder/site-map-filter-bar.tsx')

    expect(viewer).toContain('SiteMapContextDrawer')
    expect(viewer).toContain('SiteMapFilterBar')
    expect(viewer).toContain('SiteMapTaskForm')
    expect(viewer).toContain('drawOpsBadge')
    expect(drawer).toContain('lead_user_id')
    expect(taskForm).toContain('/api/hiring/roster')
    expect(filterBar).toContain('unassignedZonesOnly')
  })
})
