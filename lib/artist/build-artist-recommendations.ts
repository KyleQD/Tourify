/**
 * Deterministic, author-scoped recommendations from real stats + content metadata.
 * No invented metrics (no "2.3x engagement" unless computed from provided rows).
 */

export interface Recommendation {
  id: string
  type: 'content' | 'event' | 'collaboration' | 'revenue' | 'audience' | 'platform'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
  estimatedValue: number
  confidence: number
  actionUrl?: string
  actionText?: string
  tags: string[]
  priority: number
}

export interface ArtistStatsInput {
  totalRevenue: number
  totalFans: number
  totalStreams: number
  engagementRate: number
  monthlyListeners: number
  musicCount: number
  videoCount: number
  photoCount: number
  blogCount: number
  eventCount: number
  merchandiseCount: number
  totalPlays: number
  totalViews: number
}

export interface ContentSnippet {
  id: string
  title: string
  type: 'track' | 'video' | 'photo' | 'blog'
  views: number
  likes: number
  shares: number
  createdAt: string
}

export interface EventSnippet {
  id: string
  title: string
  date: string
  venue?: string
  ticketSales?: number
  capacity?: number
}

export interface ProfileFlags {
  hasBio: boolean
  hasGenres: boolean
  hasArtistName: boolean
}

const DEFAULT_ORDER = 1

function confidenceFor(rule: string): number {
  const map: Record<string, number> = {
    profile: 92,
    first_content: 88,
    promote: 78,
    event: 80,
    community: 72,
    revenue: 70,
    audience: 75,
  }
  return map[rule] ?? 70
}

export function buildArtistRecommendations(input: {
  stats: ArtistStatsInput
  recentContent: ContentSnippet[]
  upcomingEvents: EventSnippet[]
  profile: ProfileFlags
}): Recommendation[] {
  const { stats, recentContent, upcomingEvents, profile } = input
  const out: Recommendation[] = []
  let priority = DEFAULT_ORDER

  const topTrack = recentContent
    .filter((c) => c.type === 'track')
    .sort((a, b) => b.views - a.views)[0]

  if (!profile.hasArtistName || !profile.hasBio || !profile.hasGenres) {
    out.push({
      id: 'rule-profile-complete',
      type: 'platform',
      title: 'Complete your artist profile',
      description:
        'Add your artist name, bio, and genres so fans and venues can discover you.',
      impact: 'high',
      effort: 'low',
      estimatedValue: Math.min(500, 100 + stats.totalFans * 0.1),
      confidence: confidenceFor('profile'),
      actionUrl: '/artist/profile',
      actionText: 'Edit profile',
      tags: ['profile', 'discovery'],
      priority: priority++,
    })
  }

  if (stats.musicCount === 0 && stats.videoCount === 0 && stats.photoCount === 0) {
    out.push({
      id: 'rule-first-upload',
      type: 'content',
      title: 'Publish your first music or video',
      description: 'Upload a track or video to start building your catalog and analytics.',
      impact: 'high',
      effort: 'medium',
      estimatedValue: 400,
      confidence: confidenceFor('first_content'),
      actionUrl: '/artist/music/upload',
      actionText: 'Upload',
      tags: ['content', 'catalog'],
      priority: priority++,
    })
  }

  if (topTrack && (topTrack.views > 0 || topTrack.likes > 0)) {
    out.push({
      id: `rule-promote-${topTrack.id}`,
      type: 'content',
      title: `Promote "${topTrack.title}"`,
      description: `This track has ${topTrack.views.toLocaleString()} plays and ${topTrack.likes.toLocaleString()} likes. Cross-post to grow reach.`,
      impact: 'high',
      effort: 'low',
      estimatedValue: Math.min(2000, 200 + topTrack.views * 0.02),
      confidence: confidenceFor('promote'),
      actionUrl: '/artist/content',
      actionText: 'Open composer',
      tags: ['promotion', 'social'],
      priority: priority++,
    })
  }

  if (upcomingEvents.length > 0) {
    const next = upcomingEvents[0]
    const cap = next.capacity ?? 0
    const sold = next.ticketSales ?? 0
    const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0
    out.push({
      id: `rule-event-${next.id}`,
      type: 'event',
      title: `Promote: ${next.title}`,
      description:
        cap > 0
          ? `Ticket sales are at ${pct}% of capacity (${sold.toLocaleString()} / ${cap.toLocaleString()}).`
          : 'Schedule posts and campaigns to drive ticket interest.',
      impact: cap > 0 && pct < 50 ? 'high' : 'medium',
      effort: 'low',
      estimatedValue: Math.min(1500, 300 + stats.totalRevenue * 0.01),
      confidence: confidenceFor('event'),
      actionUrl: '/artist/business/marketing',
      actionText: 'Marketing',
      tags: ['events', 'tickets'],
      priority: priority++,
    })
  }

  if (stats.totalFans < 500 && stats.musicCount > 0) {
    out.push({
      id: 'rule-grow-audience',
      type: 'audience',
      title: 'Grow your audience',
      description: `You have ${stats.totalFans.toLocaleString()} fans. Engage consistently on your feed and community to build reach.`,
      impact: 'medium',
      effort: 'medium',
      estimatedValue: 350,
      confidence: confidenceFor('audience'),
      actionUrl: '/artist/feed',
      actionText: 'Open feed',
      tags: ['community', 'growth'],
      priority: priority++,
    })
  }

  if (stats.merchandiseCount === 0 && stats.totalFans > 100) {
    out.push({
      id: 'rule-merch',
      type: 'revenue',
      title: 'Add merchandise',
      description: 'You have an engaged fan base. Consider listing merch to diversify revenue.',
      impact: 'medium',
      effort: 'high',
      estimatedValue: Math.min(1200, stats.totalRevenue * 0.05 + 200),
      confidence: confidenceFor('revenue'),
      actionUrl: '/artist/business',
      actionText: 'Business',
      tags: ['revenue', 'merch'],
      priority: priority++,
    })
  }

  out.push({
    id: 'rule-collaborate',
    type: 'collaboration',
    title: 'Collaborate with other artists',
    description: 'Use messages and community to find collaborators in your genre.',
    impact: 'medium',
    effort: 'medium',
    estimatedValue: 600,
    confidence: confidenceFor('community'),
    actionUrl: '/artist/messages',
    actionText: 'Messages',
    tags: ['collaboration', 'networking'],
    priority: priority++,
  })

  return out.slice(0, 8)
}
