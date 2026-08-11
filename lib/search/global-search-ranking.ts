import type {
  GlobalSearchRelationship,
  RankedSearchResult,
} from "@/lib/search/global-search-types"

const MAX_QUERY_LENGTH = 120

export function normalizeSearchQuery(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
}

export function searchTokens(query: string): string[] {
  return normalizeSearchQuery(query)
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter(Boolean)
    .slice(0, 8)
}

export function postgresPrefixQuery(query: string): string | null {
  const tokens = searchTokens(query)
    .map(token => token.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
  return tokens.length ? tokens.map(token => `${token}:*`).join(" & ") : null
}

export function escapePostgrestLike(value: string): string {
  return value
    .replace(/[,()]/g, " ")
    .replace(/[\\%_]/g, match => `\\${match}`)
}

export function relevanceTier(item: RankedSearchResult, query: string): number {
  const normalized = normalizeSearchQuery(query).toLocaleLowerCase()
  const primary = item.primaryText.toLocaleLowerCase().trim()
  const handle = (item.handleText || "").toLocaleLowerCase().replace(/^@/, "").trim()
  const haystack = item.searchText.toLocaleLowerCase()
  const tokens = searchTokens(normalized)

  if (primary === normalized || handle === normalized) return 0
  if (primary.startsWith(normalized) || handle.startsWith(normalized)) return 1
  if (tokens.length && tokens.every(token => haystack.includes(token))) return 2
  return 3
}

export function affinityTier(relationship: GlobalSearchRelationship): number {
  switch (relationship) {
    case "friend":
      return 0
    case "following":
      return 1
    case "follower":
      return 2
    default:
      return 3
  }
}

export function relationshipLabel(relationship: GlobalSearchRelationship): string | null {
  switch (relationship) {
    case "friend":
      return "Friend"
    case "following":
      return "Following"
    case "follower":
      return "Follows you"
    default:
      return null
  }
}

function numericDate(value: string | null): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function rankSearchResults(items: RankedSearchResult[], query: string): RankedSearchResult[] {
  return items
    .map(item => ({
      ...item,
      relevanceTier: relevanceTier(item, query),
      affinityTier: affinityTier(item.relationship),
    }))
    .sort((left, right) =>
      (left.relevanceTier! - right.relevanceTier!) ||
      (left.affinityTier! - right.affinityTier!) ||
      (Number(right.verified) - Number(left.verified)) ||
      (right.engagement - left.engagement) ||
      (numericDate(right.sortDate) - numericDate(left.sortDate)) ||
      left.key.localeCompare(right.key)
    )
}

export function dedupeSearchResults(items: RankedSearchResult[]): RankedSearchResult[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const identity = `${item.kind}:${item.id}`
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

export interface SearchCursorPayload {
  version: 1
  category: string
  profileType: string
  lastKey: string
}

export function encodeSearchCursor(payload: SearchCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export function parseSearchCursor(value: string | null | undefined): SearchCursorPayload | null {
  if (!value || value.length > 500) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SearchCursorPayload>
    if (
      parsed.version !== 1 ||
      typeof parsed.category !== "string" ||
      typeof parsed.profileType !== "string" ||
      typeof parsed.lastKey !== "string"
    ) return null
    return parsed as SearchCursorPayload
  } catch {
    return null
  }
}
