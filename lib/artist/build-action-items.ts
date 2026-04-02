import { addDays } from 'date-fns'

export interface DashboardActionItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  type: 'profile' | 'content' | 'collaboration' | 'event'
  href?: string
}

/** Derive actionable items from real profile + catalog state (no mock tasks). */
export function buildDashboardActionItems(input: {
  profile: {
    bio: string | null
    genres: string[] | null
    artist_name: string | null
  } | null
  musicCount: number
  eventCount: number
}): DashboardActionItem[] {
  const items: DashboardActionItem[] = []
  const p = input.profile

  if (p && (!p.artist_name || !p.bio || !p.genres?.length)) {
    items.push({
      id: 'task-profile',
      title: 'Complete your artist profile',
      description: !p.artist_name
        ? 'Add your artist name so your public page and releases stay consistent.'
        : !p.bio
          ? 'Add a short bio so fans and bookers understand your sound.'
          : 'Add genres to improve discovery and recommendations.',
      priority: 'high',
      dueDate: addDays(new Date(), 7),
      type: 'profile',
      href: '/artist/profile',
    })
  }

  if (input.musicCount === 0) {
    items.push({
      id: 'task-first-track',
      title: 'Upload your first track',
      description: 'Your catalog is empty. Upload music to unlock performance insights.',
      priority: 'high',
      dueDate: addDays(new Date(), 14),
      type: 'content',
      href: '/artist/music/upload',
    })
  }

  if (input.eventCount === 0) {
    items.push({
      id: 'task-first-event',
      title: 'Create an event',
      description: 'Add a show or release event so fans can save the date.',
      priority: 'medium',
      dueDate: addDays(new Date(), 30),
      type: 'event',
      href: '/artist/events',
    })
  }

  return items.slice(0, 5)
}
