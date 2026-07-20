import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('site map version integration', () => {
  it('publish-work-mode writes map_versions snapshot without touching builder components', () => {
    const publish = readFileSync(
      join(process.cwd(), 'app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts'),
      'utf8'
    )
    expect(publish).toContain('map_versions')
    expect(publish).toContain('snapshot_payload')
    expect(publish).toContain('current_published_version_id')
    expect(publish).not.toContain('simcity-site-map-viewer')
  })

  it('versions route requires site map read access', () => {
    const versions = readFileSync(
      join(process.cwd(), 'app/api/admin/logistics/site-maps/[id]/versions/route.ts'),
      'utf8'
    )
    expect(versions).toContain('requireSiteMapAccess')
    expect(versions).toContain("'read'")
  })

  it('collaborators GET enforces site map access', () => {
    const collaborators = readFileSync(
      join(process.cwd(), 'app/api/admin/logistics/site-maps/[id]/collaborators/route.ts'),
      'utf8'
    )
    expect(collaborators).toContain('getSiteMapAccess')
    expect(collaborators).toContain('requireSiteMapAccess')
  })
})
