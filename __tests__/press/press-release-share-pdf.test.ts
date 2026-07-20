import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('press release share + PDF', () => {
  it('exposes share and pdf API routes with authz helpers', () => {
    const shareRoute = read('app/api/press/releases/[id]/share/route.ts')
    expect(shareRoute).toContain('press_release_shares')
    expect(shareRoute).toContain('bumpArticleSharesBy')
    expect(read('app/api/press/releases/[id]/pdf/route.ts')).toContain('canAccessPressRelease')
    expect(read('app/api/press/releases/[id]/pdf/route.ts')).toContain('PressReleasePdfDocument')
    expect(read('lib/press/press-release-access.ts')).toContain('canAccessPressRelease')
  })

  it('renders release reader with share and download actions', () => {
    const page = read('app/artist/press/releases/[id]/page.tsx')
    expect(page).toContain('PressReleaseShareDialog')
    expect(page).toContain('Download PDF')
    expect(page).toContain('/api/press/releases/')
  })

  it('wires share dialog into the press library', () => {
    const page = read('app/artist/press/page.tsx')
    expect(page).toContain('PressReleaseShareDialog')
    expect(page).toContain('handleSharePressRelease')
  })
})
