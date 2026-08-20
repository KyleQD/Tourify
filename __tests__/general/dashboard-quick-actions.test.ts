import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('general dashboard quick actions', () => {
  it('keeps the dashboard quick actions scoped to general account destinations', () => {
    const source = read('components/dashboard/enhanced-quick-actions.tsx')

    for (const label of [
      'Work Hub',
      'Events',
      'Blogs/Articles',
      'Analytics Dashboard',
      'Music',
      'Manage Profile',
    ]) {
      expect(source).toContain(label)
    }

    for (const href of [
      'href: "/work"',
      'href: "/events"',
      'href: "/blog/manage"',
      'href: "/analytics?scope=dashboard"',
      'href: "/music"',
      'href: "/settings/profile"',
    ]) {
      expect(source).toContain(href)
    }

    expect(source).not.toContain('useMultiAccount')
    expect(source).not.toContain('accounts.forEach')
    expect(source).not.toContain('accountSpecificActions')
    expect(source).not.toContain('accountType')
    expect(source).not.toContain('/artist/content')
    expect(source).not.toContain('/bookings/requests')
    expect(source).not.toContain('/venue/bookings')
    expect(source).not.toContain('/venue/equipment')
    expect(source).not.toContain('/admin/dashboard')
  })

  it('adds a general account article manager backed by the Pulse article APIs', () => {
    const manager = read('app/blog/manage/page.tsx')
    const composer = read('app/blog/new/page.tsx')

    expect(manager).toContain('/api/pulse/articles?mine=1&limit=100')
    expect(manager).toContain("method: 'PATCH'")
    expect(manager).toContain("method: 'DELETE'")
    expect(manager).toContain("'x-acting-account-type': 'general'")
    expect(manager).toContain("'x-acting-profile-id': user?.id")
    expect(manager).toContain('/blog/new?from=general')

    expect(composer).toContain("searchParams.get('from') === 'general'")
    expect(composer).toContain("'x-acting-account-type': 'general'")
    expect(composer).toContain("'x-acting-profile-id': user.id")
    expect(composer).toContain("router.push('/blog/manage')")
  })
})
