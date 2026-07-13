import { isPollClosed } from '@/lib/polls/poll-duration'
import { buildPollPayload, type PollPayload } from '@/lib/polls/hydrate-polls'

export interface PollAnalyticsSummary {
  totalPolls: number
  activePolls: number
  closedPolls: number
  totalVotes: number
  averageVotesPerPoll: number
  participationRate: number
  followerCount: number
  recentPolls: Array<{
    id: string
    question: string
    createdAt: string
    endsAt: string | null
    isClosed: boolean
    totalVotes: number
    poll: PollPayload
  }>
}

export function aggregatePollAnalytics(params: {
  polls: Array<{
    id: string
    content: string
    created_at: string
    poll_ends_at?: string | null
    poll_total_votes?: number | null
    options?: Array<{ id: string; text: string; vote_count?: number | null; position?: number | null }>
  }>
  followerCount: number
  now?: Date
}): PollAnalyticsSummary {
  const now = params.now || new Date()
  const followerCount = Math.max(0, params.followerCount || 0)

  const recentPolls = params.polls.map((poll) => {
    const payload = buildPollPayload({
      question: poll.content,
      options: poll.options || [],
      endsAt: poll.poll_ends_at || null,
      totalVotes: poll.poll_total_votes,
      now,
    })

    return {
      id: poll.id,
      question: poll.content,
      createdAt: poll.created_at,
      endsAt: poll.poll_ends_at || null,
      isClosed: isPollClosed(poll.poll_ends_at, now),
      totalVotes: payload.totalVotes,
      poll: payload,
    }
  })

  const totalPolls = recentPolls.length
  const closedPolls = recentPolls.filter((poll) => poll.isClosed).length
  const activePolls = totalPolls - closedPolls
  const totalVotes = recentPolls.reduce((sum, poll) => sum + poll.totalVotes, 0)
  const averageVotesPerPoll = totalPolls > 0 ? totalVotes / totalPolls : 0
  const participationRate = followerCount > 0
    ? Math.min(100, (totalVotes / followerCount) * 100)
    : 0

  return {
    totalPolls,
    activePolls,
    closedPolls,
    totalVotes,
    averageVotesPerPoll: Number(averageVotesPerPoll.toFixed(2)),
    participationRate: Number(participationRate.toFixed(1)),
    followerCount,
    recentPolls,
  }
}
