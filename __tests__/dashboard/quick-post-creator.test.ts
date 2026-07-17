import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'components/dashboard/quick-post-creator.tsx'),
  'utf8'
)

describe('QuickPostCreator dashboard contract', () => {
  it('does not render the old empty-post helper or public audience dropdown', () => {
    expect(source).not.toContain('Add a caption or photo to enable posting.')
    expect(source).not.toContain('<Select')
    expect(source).not.toContain('Public')
  })

  it('always submits dashboard posts as friend-visible followers posts', () => {
    expect(source).toContain("const DASHBOARD_POST_VISIBILITY = 'followers'")
    expect(source).toContain('visibility: DASHBOARD_POST_VISIBILITY')
    expect(source).toContain('Friends')
  })

  it('keeps empty dashboard posts disabled', () => {
    expect(source).toContain('const isPostEmpty = !content.trim() && selectedFiles.length === 0')
    expect(source).toContain('isSubmitDisabled')
    expect(source).toContain('isPostEmpty')
  })
})
