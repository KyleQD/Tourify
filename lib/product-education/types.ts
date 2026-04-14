export type HelpAudience = "admin" | "venue" | "artist" | "business" | "all"

export type HelpDifficulty = "beginner" | "intermediate" | "advanced"

export interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  /** HTML body for reader pane (legacy-compatible) */
  contentHtml: string
  keywords: string[]
  difficulty: HelpDifficulty
  lastUpdated: string
  relatedTopicIds: string[]
  /** Prefixes like `/admin/dashboard` or exact segments */
  audiences: HelpAudience[]
  /** Boost search when pathname starts with one of these */
  relatedRoutePrefixes?: string[]
}

export interface ContextualTip {
  id: string
  audiences: HelpAudience[]
  /** Path must start with this string */
  routePrefix: string
  priority: number
  headline: string
  body: string
  learnMoreArticleId?: string
  primaryAction?: { label: string; href: string }
  /** Days before "Snooze" shows tip again */
  snoozeDays?: number
}

export interface TourStep {
  id: string
  title: string
  body: string
  /** `data-education-anchor` value; omit for centered card */
  anchorId?: string
  placement?: "top" | "bottom" | "left" | "right"
}

export interface ProductTour {
  id: string
  audiences: HelpAudience[]
  steps: TourStep[]
}

export interface TipDismissalState {
  dismissedTipIds: string[]
  snoozedUntil: Record<string, string>
  venueSpotlightVersion: number | null
}
