import type {
  GlobalSearchCategory,
  GlobalSearchProfileType,
} from "@/lib/search/global-search-types"

const TYPE_ALIASES: Record<string, { category: GlobalSearchCategory; profileType?: GlobalSearchProfileType }> = {
  artist: { category: "profiles", profileType: "artist" }, artists: { category: "profiles", profileType: "artist" },
  venue: { category: "profiles", profileType: "venue" }, venues: { category: "profiles", profileType: "venue" },
  user: { category: "profiles", profileType: "general" }, users: { category: "profiles", profileType: "general" },
  organization: { category: "profiles", profileType: "organization" }, organizations: { category: "profiles", profileType: "organization" },
  organizer: { category: "profiles", profileType: "organization" }, organizers: { category: "profiles", profileType: "organization" },
  event: { category: "events" }, events: { category: "events" }, tour: { category: "tours" }, tours: { category: "tours" },
  music: { category: "music" }, post: { category: "posts" }, posts: { category: "posts" }, job: { category: "jobs" }, jobs: { category: "jobs" },
}

const CATEGORIES = new Set<GlobalSearchCategory>(["all", "profiles", "events", "tours", "music", "posts", "jobs"])
const PROFILE_TYPES = new Set<GlobalSearchProfileType>(["all", "general", "artist", "service", "venue", "organization"])

export const CANONICAL_SEARCH_RATE_LIMIT = { namespace: "search", limit: 60, windowSec: 60 } as const

export interface CanonicalSearchRequest {
  query: string | null
  category: GlobalSearchCategory
  profileType: GlobalSearchProfileType
  limit: number | undefined
  cursor: string | null
}

/** Maps legacy query names at the HTTP boundary. New callers use category and profileType. */
export function parseCanonicalSearchRequest(searchParams: URLSearchParams): CanonicalSearchRequest {
  const legacy = TYPE_ALIASES[(searchParams.get("type") || "").toLowerCase()]
  const requestedCategory = searchParams.get("category") as GlobalSearchCategory | null
  const requestedProfileType = searchParams.get("profileType") as GlobalSearchProfileType | null
  const parsedLimit = Number.parseInt(searchParams.get("limit") || "", 10)

  return {
    query: searchParams.get("q"),
    category: requestedCategory && CATEGORIES.has(requestedCategory) ? requestedCategory : legacy?.category || "all",
    profileType: requestedProfileType && PROFILE_TYPES.has(requestedProfileType) ? requestedProfileType : legacy?.profileType || "all",
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : undefined,
    cursor: searchParams.get("cursor"),
  }
}
