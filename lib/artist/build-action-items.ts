import { addDays } from 'date-fns'

export interface DashboardActionItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  type: 'profile' | 'content' | 'collaboration' | 'event' | 'payment' | 'business'
  href?: string
}

/** Derive actionable items from real profile + catalog + account state (no mock tasks). */
export function buildDashboardActionItems(input: {
  profile: {
    bio: string | null
    genres: string[] | null
    artist_name: string | null
    url_slug?: string | null
  } | null
  musicCount: number
  eventCount: number
  hasEpk?: boolean
  stripeConnected?: boolean
  agreementAccepted?: boolean
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

  if (p && !p.url_slug) {
    items.push({
      id: 'task-url-slug',
      title: 'Set your public profile URL',
      description: 'Choose a URL slug so fans and bookers can find your public page.',
      priority: 'high',
      dueDate: addDays(new Date(), 7),
      type: 'profile',
      href: '/artist/profile',
    })
  }

  if (input.hasEpk === false) {
    items.push({
      id: 'task-epk',
      title: 'Build your EPK',
      description: 'Create an electronic press kit so venues and press can book you faster.',
      priority: 'high',
      dueDate: addDays(new Date(), 14),
      type: 'business',
      href: '/artist/epk',
    })
  }

  if (input.stripeConnected === false) {
    items.push({
      id: 'task-stripe',
      title: 'Connect Stripe payouts',
      description: 'Connect Stripe so you can get paid for merch, tickets, and store sales.',
      priority: 'high',
      dueDate: addDays(new Date(), 7),
      type: 'payment',
      href: '/artist/store?tab=payments',
    })
  }

  if (input.agreementAccepted === false) {
    items.push({
      id: 'task-seller-agreement',
      title: 'Accept seller agreement',
      description: 'Accept the seller agreement to publish listings in your store.',
      priority: 'medium',
      dueDate: addDays(new Date(), 10),
      type: 'payment',
      href: '/artist/store',
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

  return items.slice(0, 8)
}
