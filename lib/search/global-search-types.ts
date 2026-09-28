export const GLOBAL_SEARCH_CATEGORIES = [
  "all",
  "profiles",
  "events",
  "tours",
  "music",
  "posts",
  "jobs",
] as const

export type GlobalSearchCategory = (typeof GLOBAL_SEARCH_CATEGORIES)[number]

export const GLOBAL_SEARCH_PROFILE_TYPES = [
  "all",
  "general",
  "artist",
  "service",
  "venue",
  "organization",
] as const

export type GlobalSearchProfileType = (typeof GLOBAL_SEARCH_PROFILE_TYPES)[number]
export type GlobalSearchRelationship = "friend" | "following" | "follower" | "none"
export type GlobalSearchKind =
  | "profile"
  | "event"
  | "tour"
  | "track"
  | "album"
  | "ep"
  | "post"
  | "job"

export type GlobalSearchResultMetadata =
  | {
      kind: "profile"
      handle: string | null
      profileType: Exclude<GlobalSearchProfileType, "all">
      location: string | null
    }
  | {
      kind: "event"
      venue: string | null
      location: string | null
      startsAt: string | null
    }
  | {
      kind: "tour"
      startsAt: string | null
      endsAt: string | null
      showCount: number
    }
  | {
      kind: "music"
      releaseType: "track" | "album" | "ep"
      genre: string | null
      releasedAt: string | null
    }
  | {
      kind: "post"
      authorName: string | null
      authorHandle: string | null
      authorImageUrl: string | null
      mediaThumbnailUrl: string | null
      createdAt: string | null
      likes: number
      comments: number
      shares: number
    }
  | {
      kind: "job"
      position: string | null
      location: string | null
      remote: boolean
      urgent: boolean
      source: "artist" | "venue"
      postedAt: string | null
    }

export type GlobalSearchRelationshipActionStatus =
  | "none"
  | "pending"
  | "incoming"
  | "following"
  | "friends"

export interface GlobalSearchRelationshipAction {
  kind: "friend" | "follow"
  status: GlobalSearchRelationshipActionStatus
  requiresAuthentication: boolean
}

export interface GlobalSearchResult {
  key: string
  id: string
  kind: GlobalSearchKind
  category: Exclude<GlobalSearchCategory, "all">
  profileType?: Exclude<GlobalSearchProfileType, "all">
  title: string
  description: string | null
  imageUrl: string | null
  href: string
  ownerUserId: string | null
  ownerAccountId: string | null
  relationship: GlobalSearchRelationship
  relationshipLabel: string | null
  verified: boolean
  subtitle: string | null
  date: string | null
  metadata?: GlobalSearchResultMetadata
  relationshipAction?: GlobalSearchRelationshipAction | null
}

export interface GlobalSearchSection {
  category: Exclude<GlobalSearchCategory, "all">
  items: GlobalSearchResult[]
  total: number
}

export interface GlobalSearchResponse {
  query: string
  category: GlobalSearchCategory
  profileType: GlobalSearchProfileType
  items: GlobalSearchResult[]
  sections: GlobalSearchSection[]
  totals: Record<Exclude<GlobalSearchCategory, "all">, number>
  nextCursor: string | null
  unavailableCategories: Array<Exclude<GlobalSearchCategory, "all">>
  durationMs: number
}

export interface RankedSearchResult extends GlobalSearchResult {
  searchText: string
  primaryText: string
  handleText?: string | null
  engagement: number
  sortDate: string | null
  relevanceTier?: number
  affinityTier?: number
}
