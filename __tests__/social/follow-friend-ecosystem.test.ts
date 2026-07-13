import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('follow vs friend ecosystem wiring', () => {
  it('exposes account_follows migration', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260712003357_account_follows.sql'),
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

  it('discover uses FollowFriendButton instead of raw /api/follow', () => {
    const source = readFileSync(join(process.cwd(), 'app/discover/page.tsx'), 'utf8')
    expect(source).toContain('FollowFriendButton')
    expect(source).not.toContain('"/api/follow"')
  })
})
