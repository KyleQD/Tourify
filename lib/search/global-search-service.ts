import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { isArtistEventDiscoverable } from "@/lib/artist/artist-event-visibility"
import { normalizeAccountType } from "@/lib/accounts/account-types"
import { isEventsV2PubliclyListable } from "@/lib/discover/location-match"
import { buildJobDetailHref } from "@/lib/jobs/job-detail-href"
import {
  dedupeSearchResults,
  encodeSearchCursor,
  escapePostgrestLike,
  normalizeSearchQuery,
  parseSearchCursor,
  postgresPrefixQuery,
  rankSearchResults,
  relationshipLabel,
} from "@/lib/search/global-search-ranking"
import type {
  GlobalSearchCategory,
  GlobalSearchProfileType,
  GlobalSearchRelationship,
  GlobalSearchResponse,
  GlobalSearchResult,
  RankedSearchResult,
} from "@/lib/search/global-search-types"
import { resolveProfileRelationshipAction } from "@/lib/search/global-search-profile-action"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolvePublicProfilePath } from "@/lib/utils/public-profile-routes"

const CATEGORY_ORDER = ["profiles", "events", "tours", "music", "posts", "jobs"] as const
type ResultCategory = (typeof CATEGORY_ORDER)[number]
type QueryResult = { category: ResultCategory; items: RankedSearchResult[] }
type LooseRow = Record<string, any>

export interface GlobalSearchOptions {
  query: string
  category?: GlobalSearchCategory
  profileType?: GlobalSearchProfileType
  limit?: number
  cursor?: string | null
  requestClient: SupabaseClient
  publicClient?: SupabaseClient
}

function text(row: LooseRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function jsonNumber(value: unknown, ...keys: string[]): number {
  if (!value || typeof value !== "object") return 0
  const record = value as Record<string, unknown>
  return keys.reduce((total, key) => total + numberValue(record[key]), 0)
}

function excerpt(value: string | null, max = 180): string | null {
  if (!value) return null
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_~`]+/g, "")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1).trimEnd()}…` : normalized
}

function searchLike(query: string): string {
  return `%${escapePostgrestLike(query)}%`
}

async function retrieveCandidates({
  client,
  table,
  select,
  query,
  fallbackFilter,
  applyVisibility,
  vector = "global_search_vector",
}: {
  client: SupabaseClient
  table: string
  select: string
  query: string
  fallbackFilter: string
  applyVisibility: (builder: any) => any
  vector?: string
}): Promise<LooseRow[]> {
  const base = () => applyVisibility(client.from(table).select(select))
  const prefix = postgresPrefixQuery(query)
  const requests: Array<PromiseLike<any>> = [base().or(fallbackFilter).limit(100)]
  if (prefix) requests.push(base().textSearch(vector, prefix, { config: "simple" }).limit(100))
  const responses = await Promise.all(requests)
  const successful = responses.filter(response => !response.error)
  if (!successful.length) throw responses[0]?.error || new Error(`${table} search failed`)
  const byId = new Map<string, LooseRow>()
  for (const response of successful) {
    for (const row of response.data || []) byId.set(String(row.id), row)
  }
  return Array.from(byId.values())
}

async function getRelationships(requestClient: SupabaseClient, includeFriendRequests: boolean) {
  const { data: auth } = await requestClient.auth.getUser()
  const viewerId = auth.user?.id || null
  if (!viewerId) {
    return {
      viewerId,
      outgoingUsers: new Set<string>(),
      incomingUsers: new Set<string>(),
      followedAccounts: new Set<string>(),
      outgoingFriendRequests: new Set<string>(),
      incomingFriendRequests: new Set<string>(),
    }
  }

  const [outgoing, incoming, accounts, outgoingRequests, incomingRequests] = await Promise.all([
    requestClient.from("follows").select("following_id").eq("follower_id", viewerId),
    requestClient.from("follows").select("follower_id").eq("following_id", viewerId),
    requestClient.from("account_follows").select("account_id").eq("follower_user_id", viewerId),
    includeFriendRequests
      ? requestClient.from("follow_requests").select("target_id").eq("requester_id", viewerId).eq("status", "pending")
      : Promise.resolve({ data: [] }),
    includeFriendRequests
      ? requestClient.from("follow_requests").select("requester_id").eq("target_id", viewerId).eq("status", "pending")
      : Promise.resolve({ data: [] }),
  ])

  return {
    viewerId,
    outgoingUsers: new Set((outgoing.data || []).map((row: any) => String(row.following_id))),
    incomingUsers: new Set((incoming.data || []).map((row: any) => String(row.follower_id))),
    followedAccounts: new Set((accounts.data || []).map((row: any) => String(row.account_id))),
    outgoingFriendRequests: new Set((outgoingRequests.data || []).map((row: any) => String(row.target_id))),
    incomingFriendRequests: new Set((incomingRequests.data || []).map((row: any) => String(row.requester_id))),
  }
}

type Relationships = Awaited<ReturnType<typeof getRelationships>>

function relationshipFor(
  ownerUserId: string | null,
  ownerAccountId: string | null,
  relationships: Relationships
): GlobalSearchRelationship {
  if (ownerUserId && relationships.outgoingUsers.has(ownerUserId) && relationships.incomingUsers.has(ownerUserId)) {
    return "friend"
  }
  if (
    (ownerUserId && relationships.outgoingUsers.has(ownerUserId)) ||
    (ownerAccountId && relationships.followedAccounts.has(ownerAccountId))
  ) return "following"
  if (ownerUserId && relationships.incomingUsers.has(ownerUserId)) return "follower"
  return "none"
}

function withRelationship(item: RankedSearchResult, relationships: Relationships): RankedSearchResult {
  const relationship = relationshipFor(item.ownerUserId, item.ownerAccountId, relationships)
  const relationshipAction = relationshipActionFor(item, relationships)
  return { ...item, relationship, relationshipLabel: relationshipLabel(relationship), relationshipAction }
}

function relationshipActionFor(
  item: RankedSearchResult,
  relationships: Relationships
): RankedSearchResult["relationshipAction"] {
  if (item.kind !== "profile") return undefined
  return resolveProfileRelationshipAction({
    profileType: item.profileType,
    viewerId: relationships.viewerId,
    ownerUserId: item.ownerUserId ? String(item.ownerUserId) : null,
    ownerAccountId: item.ownerAccountId ? String(item.ownerAccountId) : null,
    outgoingUsers: relationships.outgoingUsers,
    incomingUsers: relationships.incomingUsers,
    followedAccounts: relationships.followedAccounts,
    outgoingFriendRequests: relationships.outgoingFriendRequests,
    incomingFriendRequests: relationships.incomingFriendRequests,
  })
}

function settingsValue(row: LooseRow, key: string): string | null {
  const settings = row.settings
  if (!settings || typeof settings !== "object") return null
  const value = settings[key]
  return typeof value === "string" ? value : null
}

async function queryProfiles(client: SupabaseClient, query: string, profileType: GlobalSearchProfileType): Promise<QueryResult> {
  const data = await retrieveCandidates({
    client,
    table: "accounts",
    select: "id, owner_user_id, account_type, profile_table, profile_id, display_name, username, avatar_url, is_verified, is_active, metadata, created_at, follower_count, engagement_score",
    query,
    vector: "search_vector",
    fallbackFilter: `display_name.ilike.${searchLike(query)},username.ilike.${searchLike(query)}`,
    applyVisibility: builder => {
      let scoped = builder.eq("is_active", true)
      if (profileType !== "all") {
        scoped = profileType === "organization"
          ? scoped.in("account_type", ["organization", "organizer", "business", "admin"])
          : scoped.eq("account_type", profileType)
      }
      return scoped
    },
  })

  const ownerIds = Array.from(new Set(data.map(row => String(row.owner_user_id || "")).filter(Boolean)))
  const [generalProfiles, artistProfiles, venueProfiles, organizationProfiles] = ownerIds.length
    ? await Promise.all([
        client.from("profiles").select("id, public_profile").in("id", ownerIds),
        client.from("artist_profiles").select("user_id, settings").in("user_id", ownerIds),
        client.from("venue_profiles").select("user_id, is_public").in("user_id", ownerIds),
        client.from("organizer_accounts").select("user_id, is_public, is_active").in("user_id", ownerIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
  const visibilityError = ([generalProfiles, artistProfiles, venueProfiles, organizationProfiles] as any[])
    .map(result => result.error)
    .find(Boolean)
  if (visibilityError) throw visibilityError

  const visibleGeneralOwners = new Set((generalProfiles.data || [])
    .filter((row: any) => row.public_profile !== false).map((row: any) => String(row.id)))
  const visibleArtistOwners = new Set((artistProfiles.data || [])
    .filter((row: any) => !row.settings || typeof row.settings !== "object" || row.settings.public_profile !== false)
    .map((row: any) => String(row.user_id)))
  const visibleVenueOwners = new Set((venueProfiles.data || [])
    .filter((row: any) => row.is_public !== false).map((row: any) => String(row.user_id)))
  const visibleOrganizationOwners = new Set((organizationProfiles.data || [])
    .filter((row: any) => row.is_public === true && row.is_active === true).map((row: any) => String(row.user_id)))

  const publicAccounts = data.filter(row => {
    const ownerId = String(row.owner_user_id || "")
    switch (normalizeAccountType(row.account_type)) {
      case "artist":
      case "service": return visibleArtistOwners.has(ownerId)
      case "venue": return visibleVenueOwners.has(ownerId)
      case "organization":
      case "staff": return visibleOrganizationOwners.has(ownerId)
      default: return visibleGeneralOwners.has(ownerId)
    }
  })

  const items = publicAccounts.map((row: LooseRow): RankedSearchResult => {
    const normalized = normalizeAccountType(row.account_type)
    const profileTypeValue = normalized === "staff" ? "organization" : normalized
    const title = text(row, "display_name", "username") || "Profile"
    const href = resolvePublicProfilePath({
      id: row.id,
      username: row.username || row.metadata?.url_slug || null,
      account_type: profileTypeValue,
      subtype: row.metadata?.subtype || null,
    }) || `/profile/${encodeURIComponent(row.username || row.id)}`
    const description = excerpt(text(row.metadata || {}, "bio", "description", "tagline"))
    return {
      key: `profile:${row.id}`,
      id: String(row.id),
      kind: "profile",
      category: "profiles",
      profileType: profileTypeValue as Exclude<GlobalSearchProfileType, "all">,
      title,
      description,
      imageUrl: row.avatar_url || null,
      href,
      ownerUserId: row.owner_user_id || null,
      ownerAccountId: row.id,
      relationship: "none",
      relationshipLabel: null,
      verified: Boolean(row.is_verified),
      subtitle: row.username ? `@${row.username}` : null,
      date: row.created_at || null,
      metadata: {
        kind: "profile",
        handle: row.username || null,
        profileType: profileTypeValue as Exclude<GlobalSearchProfileType, "all">,
        location: text(row.metadata || {}, "location", "city"),
      },
      searchText: [title, row.username, description, row.metadata?.location].filter(Boolean).join(" "),
      primaryText: title,
      handleText: row.username,
      engagement: numberValue(row.engagement_score) + numberValue(row.follower_count),
      sortDate: row.created_at || null,
    }
  })
  return { category: "profiles", items }
}

async function queryEvents(client: SupabaseClient, query: string): Promise<QueryResult> {
  const like = searchLike(query)
  const [legacy, v2, artist] = await Promise.all([
    retrieveCandidates({
      client, table: "events",
      select: "id, title, name, slug, description, venue_name, city, state, poster_url, event_date, start_at, created_at, artist_id, created_by, org_id, status, is_public, settings, producer_settings, expected_attendance, tickets_sold",
      query, fallbackFilter: `title.ilike.${like},name.ilike.${like},description.ilike.${like},venue_name.ilike.${like}`,
      applyVisibility: builder => builder.eq("status", "published"),
    }),
    retrieveCandidates({
      client, table: "events_v2",
      select: "id, title, slug, status, start_at, created_at, created_by, org_id, settings, capacity",
      query, fallbackFilter: `title.ilike.${like}`,
      applyVisibility: builder => builder.in("status", ["confirmed", "advancing", "onsite"]),
    }),
    retrieveCandidates({
      client, table: "artist_events",
      select: "id, title, slug, description, venue_name, venue_city, venue_state, poster_url, event_date, created_at, user_id, status, is_public, expected_attendance",
      query, fallbackFilter: `title.ilike.${like},description.ilike.${like},venue_name.ilike.${like}`,
      applyVisibility: builder => builder.eq("status", "published"),
    }),
  ])

  const rows: Array<LooseRow & { source: string }> = [
    ...(legacy.filter(isArtistEventDiscoverable).map(row => ({ ...row, source: "events" }))),
    ...(v2.filter(isEventsV2PubliclyListable).map(row => ({ ...row, source: "events_v2" }))),
    ...(artist.filter(isArtistEventDiscoverable).map(row => ({ ...row, source: "artist_events" }))),
  ]

  return {
    category: "events",
    items: rows.map(row => {
      const title = text(row, "title", "name") || "Event"
      const description = excerpt(text(row, "description") || settingsValue(row, "description"))
      const venue = text(row, "venue_name") || settingsValue(row, "venue_label") || settingsValue(row, "venue_name")
      const date = text(row, "start_at", "event_date", "created_at")
      const imageUrl = text(row, "poster_url") || settingsValue(row, "poster_url") || settingsValue(row, "cover_image_url")
      const location = [row.city || row.venue_city, row.state || row.venue_state].filter(Boolean).join(", ") || null
      return {
        key: `event:${row.source}:${row.id}`,
        id: String(row.id), kind: "event", category: "events", title, description, imageUrl,
        href: `/events/${encodeURIComponent(row.slug || row.id)}`,
        ownerUserId: row.artist_id || row.user_id || row.created_by || null,
        ownerAccountId: row.org_id || null,
        relationship: "none", relationshipLabel: null, verified: false,
        subtitle: [venue, row.city || row.venue_city, row.state || row.venue_state].filter(Boolean).join(", ") || null,
        date,
        metadata: { kind: "event", venue, location, startsAt: date },
        searchText: [title, description, venue, row.city, row.state, row.venue_city, row.venue_state].filter(Boolean).join(" "),
        primaryText: title, engagement: numberValue(row.expected_attendance) + numberValue(row.tickets_sold), sortDate: date,
      } as RankedSearchResult
    }),
  }
}

async function queryTours(client: SupabaseClient, query: string): Promise<QueryResult> {
  const data = await retrieveCandidates({
    client, table: "tours",
    select: "id, name, slug, description, status, start_date, end_date, created_at, cover_image_url, owner_user_id, user_id, org_id, total_shows",
    query, fallbackFilter: `name.ilike.${searchLike(query)},description.ilike.${searchLike(query)}`,
    applyVisibility: builder => builder.eq("status", "active").not("slug", "is", null),
  })
  return { category: "tours", items: data.map((row: LooseRow) => ({
    key: `tour:${row.id}`, id: String(row.id), kind: "tour", category: "tours", title: row.name || "Tour",
    description: excerpt(row.description), imageUrl: row.cover_image_url || null,
    href: `/tours/${encodeURIComponent(row.slug)}`,
    ownerUserId: row.owner_user_id || row.user_id || null, ownerAccountId: row.org_id || null,
    relationship: "none", relationshipLabel: null, verified: false,
    subtitle: row.start_date && row.end_date ? `${row.start_date} – ${row.end_date}` : null,
    date: row.start_date || row.created_at || null,
    metadata: {
      kind: "tour", startsAt: row.start_date || null, endsAt: row.end_date || null,
      showCount: numberValue(row.total_shows),
    },
    searchText: [row.name, row.description].filter(Boolean).join(" "), primaryText: row.name || "Tour",
    engagement: numberValue(row.total_shows), sortDate: row.start_date || row.created_at || null,
  })) }
}

async function queryMusic(client: SupabaseClient, query: string): Promise<QueryResult> {
  const like = searchLike(query)
  const data = await retrieveCandidates({
    client, table: "artist_music",
    select: "id, user_id, artist_profile_id, title, description, type, genre, release_date, cover_art_url, is_public, is_visible, rights_confirmed, moderation_status, stats, created_at",
    query, fallbackFilter: `title.ilike.${like},description.ilike.${like},genre.ilike.${like}`,
    applyVisibility: builder => builder.eq("is_public", true).eq("is_visible", true).eq("rights_confirmed", true).eq("moderation_status", "approved"),
  })
  return { category: "music", items: data.map((row: LooseRow) => {
    const type = String(row.type || "track").toLowerCase()
    const kind = type === "album" ? "album" : type === "ep" ? "ep" : "track"
    return {
      key: `music:${row.id}`, id: String(row.id), kind, category: "music", title: row.title || "Untitled",
      description: excerpt(row.description), imageUrl: row.cover_art_url || null,
      href: `/music?item=${encodeURIComponent(row.id)}`, ownerUserId: row.user_id || null, ownerAccountId: null,
      relationship: "none", relationshipLabel: null, verified: false,
      subtitle: [type.toUpperCase(), row.genre].filter(Boolean).join(" • "), date: row.release_date || row.created_at || null,
      metadata: {
        kind: "music", releaseType: kind, genre: row.genre || null,
        releasedAt: row.release_date || row.created_at || null,
      },
      searchText: [row.title, row.description, row.genre, row.type].filter(Boolean).join(" "), primaryText: row.title || "Untitled",
      engagement: jsonNumber(row.stats, "plays", "likes", "downloads"), sortDate: row.release_date || row.created_at || null,
    } as RankedSearchResult
  }) }
}

async function queryPosts(client: SupabaseClient, query: string): Promise<QueryResult> {
  const data = await retrieveCandidates({
    client, table: "posts",
    select: "id, user_id, account_id, content, images, media_urls, account_display_name, account_username, account_avatar_url, visibility, moderation_status, is_visible, likes_count, comments_count, shares_count, views_count, created_at",
    query, fallbackFilter: `content.ilike.${searchLike(query)}`,
    applyVisibility: builder => builder.eq("visibility", "public").eq("is_visible", true).or("moderation_status.is.null,moderation_status.neq.rejected"),
  })
  return { category: "posts", items: data.map((row: LooseRow) => {
    const description = excerpt(row.content)
    const title = row.account_display_name ? `${row.account_display_name}'s post` : "Post"
    const images = Array.isArray(row.images) ? row.images : Array.isArray(row.media_urls) ? row.media_urls : []
    return {
      key: `post:${row.id}`, id: String(row.id), kind: "post", category: "posts", title,
      description, imageUrl: images[0] || row.account_avatar_url || null, href: `/posts/${row.id}`,
      ownerUserId: row.user_id || null, ownerAccountId: row.account_id || null,
      relationship: "none", relationshipLabel: null, verified: false,
      subtitle: row.account_username ? `@${row.account_username}` : null, date: row.created_at || null,
      metadata: {
        kind: "post", authorName: row.account_display_name || null,
        authorHandle: row.account_username || null, authorImageUrl: row.account_avatar_url || null,
        mediaThumbnailUrl: images[0] || null, createdAt: row.created_at || null,
        likes: numberValue(row.likes_count), comments: numberValue(row.comments_count),
        shares: numberValue(row.shares_count),
      },
      searchText: [row.content, row.account_display_name, row.account_username].filter(Boolean).join(" "), primaryText: row.content || title,
      engagement: numberValue(row.likes_count) + numberValue(row.comments_count) + numberValue(row.shares_count) + numberValue(row.views_count) / 10,
      sortDate: row.created_at || null,
    } as RankedSearchResult
  }) }
}

async function queryJobs(client: SupabaseClient, query: string): Promise<QueryResult> {
  const like = searchLike(query)
  const [artist, venue] = await Promise.all([
    retrieveCandidates({
      client, table: "artist_jobs",
      select: "id, title, description, status, posted_by, poster_profile_id, job_type, location, city, state, featured, applications_count, views_count, created_at, expires_at",
      query, fallbackFilter: `title.ilike.${like},description.ilike.${like},location.ilike.${like},city.ilike.${like}`,
      applyVisibility: builder => builder.eq("status", "open").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    }),
    retrieveCandidates({
      client, table: "job_posting_templates",
      select: "id, title, position, description, status, venue_id, employer_entity_id, employer_entity_type, location, remote, urgent, applications_count, views_count, created_at, event_date",
      query, fallbackFilter: `title.ilike.${like},position.ilike.${like},description.ilike.${like},location.ilike.${like}`,
      applyVisibility: builder => builder.eq("status", "published"),
    }),
  ])
  const rows = [
    ...artist.map(row => ({ ...row, source: "artist" })),
    ...venue.map(row => ({ ...row, source: "venue" })),
  ]
  return { category: "jobs", items: rows.map((row: LooseRow) => {
    const title = text(row, "title", "position") || "Job"
    return {
      key: `job:${row.source}:${row.id}`, id: String(row.id), kind: "job", category: "jobs", title,
      description: excerpt(row.description), imageUrl: null,
      href: buildJobDetailHref({ id: row.id, source: row.source }) || "/jobs",
      ownerUserId: row.posted_by || null, ownerAccountId: row.venue_id || row.employer_entity_id || null,
      relationship: "none", relationshipLabel: null, verified: false,
      subtitle: [row.position, row.location || [row.city, row.state].filter(Boolean).join(", "), row.remote ? "Remote" : null].filter(Boolean).join(" • ") || null,
      date: row.event_date || row.created_at || null,
      metadata: {
        kind: "job", position: row.position || row.job_type || null,
        location: row.location || [row.city, row.state].filter(Boolean).join(", ") || null,
        remote: Boolean(row.remote), urgent: Boolean(row.urgent || row.featured),
        source: row.source as "artist" | "venue", postedAt: row.created_at || null,
      },
      searchText: [title, row.description, row.position, row.location, row.city, row.state].filter(Boolean).join(" "), primaryText: title,
      engagement: numberValue(row.applications_count) + numberValue(row.views_count) + (row.featured || row.urgent ? 100 : 0),
      sortDate: row.event_date || row.created_at || null,
    } as RankedSearchResult
  }) }
}

function publicItem(item: RankedSearchResult): GlobalSearchResult {
  const { searchText: _searchText, primaryText: _primaryText, handleText: _handleText, engagement: _engagement, sortDate: _sortDate, relevanceTier: _relevanceTier, affinityTier: _affinityTier, ...result } = item
  return result
}

export async function searchGlobal(options: GlobalSearchOptions): Promise<GlobalSearchResponse> {
  const startedAt = Date.now()
  const query = normalizeSearchQuery(options.query)
  const category = options.category || "all"
  const profileType = options.profileType || "all"
  const limit = Math.min(Math.max(options.limit || (category === "all" ? 5 : 20), 1), 20)
  const emptyTotals = { profiles: 0, events: 0, tours: 0, music: 0, posts: 0, jobs: 0 }
  if (!query) return { query, category, profileType, items: [], sections: [], totals: emptyTotals, nextCursor: null, unavailableCategories: [], durationMs: Date.now() - startedAt }

  const publicClient = options.publicClient || createServiceRoleClient()
  const selected = category === "all" ? CATEGORY_ORDER : [category as ResultCategory]
  const relationshipPromise = getRelationships(options.requestClient, selected.includes("profiles"))
  const tasks = selected.map(selectedCategory => {
    switch (selectedCategory) {
      case "profiles": return queryProfiles(publicClient, query, profileType)
      case "events": return queryEvents(publicClient, query)
      case "tours": return queryTours(publicClient, query)
      case "music": return queryMusic(publicClient, query)
      case "posts": return queryPosts(publicClient, query)
      case "jobs": return queryJobs(publicClient, query)
    }
  })

  const [relationships, settled] = await Promise.all([relationshipPromise, Promise.allSettled(tasks)])
  const totals = { ...emptyTotals }
  const unavailableCategories: ResultCategory[] = []
  const rankedByCategory = new Map<ResultCategory, RankedSearchResult[]>()

  settled.forEach((result, index) => {
    const selectedCategory = selected[index]
    if (result.status === "rejected") {
      unavailableCategories.push(selectedCategory)
      console.error(`[global-search] ${selectedCategory} unavailable`, result.reason)
      return
    }
    const ranked = rankSearchResults(dedupeSearchResults(result.value.items.map(item => withRelationship(item, relationships))), query)
    totals[selectedCategory] = ranked.length
    rankedByCategory.set(selectedCategory, ranked)
  })

  if (category === "all") {
    const sections = CATEGORY_ORDER.filter(current => rankedByCategory.has(current)).map(current => ({
      category: current,
      items: (rankedByCategory.get(current) || []).slice(0, 5).map(publicItem),
      total: totals[current],
    })).filter(section => section.items.length > 0)
    const previewCounts = new Map<ResultCategory, number>()
    const mixed = rankSearchResults(Array.from(rankedByCategory.values()).flat(), query)
      .filter(item => {
        const cap = item.category === "profiles" ? 5 : 2
        const count = previewCounts.get(item.category) || 0
        if (count >= cap) return false
        previewCounts.set(item.category, count + 1)
        return true
      })
      .slice(0, 10)
      .map(publicItem)
    return { query, category, profileType, items: mixed, sections, totals, nextCursor: null, unavailableCategories, durationMs: Date.now() - startedAt }
  }

  const ranked = rankedByCategory.get(category as ResultCategory) || []
  const cursor = parseSearchCursor(options.cursor)
  const startIndex = cursor && cursor.category === category && cursor.profileType === profileType
    ? Math.max(ranked.findIndex(item => item.key === cursor.lastKey) + 1, 0)
    : 0
  const page = ranked.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + page.length < ranked.length
  const nextCursor = hasMore && page.length
    ? encodeSearchCursor({ version: 1, category, profileType, lastKey: page[page.length - 1].key })
    : null

  return {
    query, category, profileType, items: page.map(publicItem), sections: [], totals, nextCursor,
    unavailableCategories, durationMs: Date.now() - startedAt,
  }
}
