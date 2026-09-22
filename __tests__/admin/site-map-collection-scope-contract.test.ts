import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync(
  join(process.cwd(), 'app/api/admin/logistics/site-maps/route.ts'),
  'utf8',
)

describe('Admin site-map collection scope contract', () => {
  it('uses events_v2 as the only event scope for reads and writes', () => {
    expect(routeSource).toContain("query.eq('event_v2_id', eventId)")
    expect(routeSource).toContain('event_v2_id: eventId || null')
    expect(routeSource).not.toContain("query.eq('event_id', eventId)")
    expect(routeSource).not.toContain('event_id: body.eventId || null')
  })

  it('requires a selected event or tour and rejects client-controlled legacy scope fields', () => {
    expect(routeSource).toContain("code: 'site_map_scope_required'")
    expect(routeSource).toContain("'event_id'")
    expect(routeSource).toContain("'event_v2_id'")
    expect(routeSource).toContain("'tour_id'")
    expect(routeSource).toContain("'org_id'")
    expect(routeSource).toContain("code: 'legacy_scope_field_rejected'")
  })

  it('resolves the acting organization before uploading a background image', () => {
    const postSource = routeSource.slice(routeSource.indexOf('export const POST'))
    const resolution = postSource.indexOf('scope = await resolveAuthorizedOrgLogisticsScope')
    const upload = postSource.indexOf(".upload(storagePath, imageBuffer")

    expect(resolution).toBeGreaterThan(-1)
    expect(upload).toBeGreaterThan(-1)
    expect(resolution).toBeLessThan(upload)
  })

  it('post-filters every linked parent against the acting organization', () => {
    expect(routeSource).toContain('isWithinAuthorizedScope')
    expect(routeSource).toContain('if (eventId && !eventIds.has(eventId)) return false')
    expect(routeSource).toContain('if (tourId && !tourIds.has(tourId)) return false')
    expect(routeSource).toContain('if (!eventId && !tourId) return false')
  })
})
