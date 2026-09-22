import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { readMigrationSql } from '../helpers/migration-source'

describe('follow vs friend ecosystem wiring', () => {
  it('exposes account_follows migration', () => {
    const sql = readFileSync(
      readMigrationSql('20260712003357_account_follows.sql'),
      'utf8'
    )
    expect(sql).toContain('create table if not exists public.account_follows')
    expect(sql).toContain('follower_user_id')
    expect(sql).toContain('account_id')
  })

  it('enhanced search returns ownerUserId and accountId fields', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/search/enhanced/route.ts'), 'utf8')
    expect(source).toContain('ownerUserId')
    expect(source).toContain('accountId')
    expect(source).toContain('organization')
  })

  it('relationship API route exists with follow and friend actions', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/social/relationship/route.ts'), 'utf8')
    expect(source).toContain("action === 'follow'")
    expect(source).toContain("action === 'friend_request'")
    expect(source).toContain('account_follows')
  })

  it('following feed reads account_follows', () => {
    const source = readFileSync(join(process.cwd(), 'app/api/feed/posts/route.ts'), 'utf8')
    expect(source).toContain("from('account_follows')")
    expect(source).toContain('followedAccountIds')
  })

  it('discover renders follows through FollowFriendButton, never raw /api/follow', () => {
    // Discover page delegates to the shared search-results renderer, which
    // owns follow interactions via FollowFriendButton.
    const results = readFileSync(join(process.cwd(), 'components/search/global-search-results.tsx'), 'utf8')
    expect(results).toContain('FollowFriendButton')

    const page = readFileSync(join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
    expect(page).not.toContain('"/api/follow"')
    const client = readFileSync(join(process.cwd(), 'components/discover/discover-page-client.tsx'), 'utf8')
    expect(client).not.toContain('"/api/follow"')
  })
})
