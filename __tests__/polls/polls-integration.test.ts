import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('follower polls integration contracts', () => {
  it('migration creates poll tables and counters', () => {
    const sql = read('supabase/migrations/20260712020525_follower_polls_and_analytics.sql')
    expect(sql).toContain('create table if not exists public.poll_options')
    expect(sql).toContain('create table if not exists public.poll_votes')
    expect(sql).toContain('poll_ends_at')
    expect(sql).toContain('poll_total_votes')
    expect(sql).toContain('bump_poll_vote_counts')
    expect(sql).toContain('can_read_poll_post')
  })

  it('create route accepts poll payload fields', () => {
    const source = read('app/api/posts/create/route.ts')
    expect(source).toContain("type === 'poll'")
    expect(source).toContain('poll_options')
    expect(source).toContain('poll_duration')
    expect(source).toContain("from('poll_options')")
  })

  it('vote route enforces eligibility helpers', () => {
    const source = read('app/api/posts/[id]/poll/vote/route.ts')
    expect(source).toContain('canVoteOnPoll')
    expect(source).toContain('resolvePollFollowerFlags')
    expect(source).toContain("You already voted on this poll")
  })

  it('feed hydration includes poll columns and hydrate helper', () => {
    const feed = read('app/api/feed/posts/route.ts')
    const query = read('lib/feed/feed-posts-query.ts')
    expect(feed).toContain('hydratePostsWithPolls')
    expect(feed).toContain('poll:')
    expect(query).toContain('poll_ends_at')
    expect(query).toContain('poll_total_votes')
  })
})
