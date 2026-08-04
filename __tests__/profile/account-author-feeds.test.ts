import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('account-scoped author feed contracts', () => {
  it('passes both public account and owner ids from shared profile posts', () => {
    const source = read('components/profile/profile-posts.tsx')

    expect(source).toContain('ownerUserId?: string | null')
    expect(source).toContain("profile_id: profileId")
    expect(source).toContain("params.set('user_id', ownerUserId)")
    expect(source).toContain('/api/feed/posts?')
  })

  it('routes enhanced and legacy public profile posts through the feed API', () => {
    const enhanced = read('components/profile/enhanced-public-profile-view.tsx')
    const legacy = read('components/profile/public-profile-view.tsx')

    expect(enhanced).toContain('profile.author_profile_id || profile.id')
    expect(enhanced).toContain('profile.owner_user_id || profile.id')
    expect(legacy).toContain('profile.author_profile_id || profile.id')
    expect(legacy).toContain('profile.owner_user_id || profile.id')
    expect(legacy).toContain('/api/feed/posts?')
    expect(legacy).not.toContain(".eq('user_id', profile.id)")
  })

  it('loads public artist posts by artist account id only', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')

    expect(source).toContain('getAccountAuthor')
    expect(source).toContain(".eq('posted_as_profile_id', artistId)")
    expect(source).not.toContain('posted_as_profile_id.eq.${artistId},user_id.eq.${artistUserId}')
    expect(source).toContain('posted_as_profile_id,')
    expect(source).toContain('content_ref')
  })

  it('hides private artist personas from non-owners', () => {
    const source = read('lib/public-artist/get-public-artist-profile.ts')

    expect(source).toContain('public_profile !== false')
    expect(source).toContain('if (!isPublicProfile && !isOwner) return null')
  })

  it('emits author profile ids from public profile APIs', () => {
    const profileRoute = read('app/api/profile/[username]/route.ts')
    const artistRoute = read('app/api/artist/[artistName]/route.ts')

    expect(profileRoute).toContain('author_profile_id: authorProfileId')
    expect(profileRoute).toContain('owner_user_id: ownerUserId')
    expect(profileRoute).toContain("from('organizer_accounts')")
    expect(profileRoute).toContain('authorProfileId = artist.id')
    expect(profileRoute).toContain('authorProfileId = venue.id')
    expect(artistRoute).toContain('author_profile_id: artistProfile.id')
    expect(artistRoute).toContain('owner_user_id: mainProfile.id')
  })

  it('adds venue profile posts using the venue account id', () => {
    const source = read('app/venues/[slug]/page.tsx')

    expect(source).toContain('ProfilePosts')
    expect(source).toContain('profileId={venue.id}')
    expect(source).toContain('ownerUserId={venue.user_id || undefined}')
    expect(source).toContain('<TabsTrigger value="posts">Posts</TabsTrigger>')
  })

  it('keeps organization posts styled and attributed on the public page', () => {
    const loader = read('lib/public-organization/get-public-organization-profile.ts')
    const page = read('components/public-organization/public-organization-page.tsx')

    expect(loader).toContain(".from('post_appearances')")
    expect(loader).toContain(".eq('posted_as_profile_id', organizerAccountId)")
    expect(page).toContain('PostAppearanceBoundary')
    expect(page).toContain('{dto.name}')
    expect(page).toContain('/organization/${encodeURIComponent(dto.slug)}')
  })
})
