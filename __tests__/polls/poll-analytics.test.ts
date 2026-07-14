import { describe, expect, it } from 'vitest'
import { aggregatePollAnalytics } from '@/lib/polls/poll-analytics'
import { buildPollPayload } from '@/lib/polls/hydrate-polls'

describe('poll-analytics', () => {
  it('builds poll payload with viewer vote state', () => {
    const poll = buildPollPayload({
      question: 'Which city next?',
      options: [
        { id: 'a', text: 'LA', vote_count: 3, position: 0 },
        { id: 'b', text: 'NYC', vote_count: 1, position: 1 },
      ],
      endsAt: '2026-07-20T00:00:00.000Z',
      totalVotes: 4,
      viewerVotedOptionId: 'a',
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(poll.viewerHasVoted).toBe(true)
    expect(poll.totalVotes).toBe(4)
    expect(poll.isClosed).toBe(false)
    expect(poll.options[0].votes).toBe(3)
  })

  it('aggregates account poll analytics', () => {
    const summary = aggregatePollAnalytics({
      followerCount: 100,
      now: new Date('2026-07-11T00:00:00.000Z'),
      polls: [
        {
          id: '1',
          content: 'Tour merch color?',
          created_at: '2026-07-01T00:00:00.000Z',
          poll_ends_at: '2026-07-20T00:00:00.000Z',
          poll_total_votes: 20,
          options: [
            { id: 'o1', text: 'Black', vote_count: 12, position: 0 },
            { id: 'o2', text: 'White', vote_count: 8, position: 1 },
          ],
        },
        {
          id: '2',
          content: 'Setlist opener?',
          created_at: '2026-06-01T00:00:00.000Z',
          poll_ends_at: '2026-06-10T00:00:00.000Z',
          poll_total_votes: 30,
          options: [
            { id: 'o3', text: 'Hit A', vote_count: 18, position: 0 },
            { id: 'o4', text: 'Hit B', vote_count: 12, position: 1 },
          ],
        },
      ],
    })

    expect(summary.totalPolls).toBe(2)
    expect(summary.activePolls).toBe(1)
    expect(summary.closedPolls).toBe(1)
    expect(summary.totalVotes).toBe(50)
    expect(summary.averageVotesPerPoll).toBe(25)
    expect(summary.participationRate).toBe(50)
    expect(summary.recentPolls[0].poll.options[0].text).toBe('Black')
  })
})
