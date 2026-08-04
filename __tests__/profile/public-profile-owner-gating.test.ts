import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('general public profile owner-function quarantine', () => {
  it('uses an owner preview bar instead of Edit Profile in the hero', () => {
    const view = read('components/profile/enhanced-public-profile-view.tsx')

    expect(view).toContain("You&apos;re viewing your public profile")
    expect(view).toContain('Edit in Settings')
    expect(view).toContain('href="/settings"')
    expect(view).not.toContain('Edit Profile')
    expect(view).toContain('resolveProfileCoverUrl')
    expect(view).toContain('variant="public"')
  })

  it('does not expose Create Post on profile posts empty state', () => {
    const posts = read('components/profile/profile-posts.tsx')

    expect(posts).not.toContain('Create Your First Post')
    expect(posts).toContain("hasn't shared any posts yet")
  })

  it('keeps public achievements off the owner dashboard link', () => {
    const section = read('components/achievements/profile-achievements-section.tsx')

    expect(section).toContain('variant?: "default" | "public"')
    expect(section).toContain('isPublicSurface')
    expect(section).toContain('showOwnerControls')
    expect(section).toContain('/api/profile/')
    expect(section).toContain('/recognition')
    // Dashboard link only when showOwnerControls (non-public variant)
    expect(section).toContain('href="/achievements"')
    expect(section).toContain('showOwnerControls && (')
    expect(section).toContain('isPublicSurface && hasMoreToShow')
  })

  it('loads badges without fragile granted_by FK embed', () => {
    const reads = read('lib/achievements/achievement-reads.ts')

    expect(reads).not.toContain('profiles!user_badges_granted_by_fkey')
    expect(reads).toContain('fetchProfilesMap')
    expect(reads).toContain('badge:badges(*)')
  })

  it('does not wrap public profiles in a container layout', () => {
    const layout = read('app/profile/layout.tsx')

    expect(layout).not.toContain('container py-6')
    expect(layout).toContain('{children}')
  })

  it('resolves artist public banner via cover fallback helper', () => {
    const loader = read('lib/public-artist/get-public-artist-profile.ts')

    expect(loader).toContain('resolveProfileCoverUrl')
    expect(loader).toContain('const coverUrl = resolveProfileCoverUrl(resolvedProfile)')
  })
})
