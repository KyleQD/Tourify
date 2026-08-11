"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Disc3,
  FileText,
  Heart,
  Loader2,
  Map,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { FollowFriendButton, type FollowFriendRelationship } from "@/components/social/follow-friend-button"
import { trackDashboardUxEvent } from "@/lib/analytics/ux-event-client"
import type {
  GlobalSearchCategory,
  GlobalSearchProfileType,
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchResultMetadata,
  GlobalSearchRelationshipActionStatus,
} from "@/lib/search/global-search-types"
import { cn } from "@/lib/utils"

type ResultCategory = Exclude<GlobalSearchCategory, "all">

const TABS: Array<{ value: GlobalSearchCategory; label: string; icon: LucideIcon }> = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "profiles", label: "Profiles", icon: UsersRound },
  { value: "events", label: "Events", icon: CalendarDays },
  { value: "tours", label: "Tours", icon: Map },
  { value: "music", label: "Music", icon: Disc3 },
  { value: "posts", label: "Posts", icon: FileText },
  { value: "jobs", label: "Jobs", icon: BriefcaseBusiness },
]

const PROFILE_TYPES: Array<{ value: GlobalSearchProfileType; label: string }> = [
  { value: "all", label: "All profiles" },
  { value: "general", label: "People" },
  { value: "artist", label: "Artists" },
  { value: "service", label: "Services" },
  { value: "venue", label: "Venues" },
  { value: "organization", label: "Organizations" },
]

const SECTION_LABELS: Record<ResultCategory, string> = {
  profiles: "Profiles",
  events: "Events",
  tours: "Tours",
  music: "Music",
  posts: "Posts",
  jobs: "Jobs",
}

const PROFILE_LABELS: Record<Exclude<GlobalSearchProfileType, "all">, string> = {
  general: "Person",
  artist: "Artist",
  service: "Service provider",
  venue: "Venue",
  organization: "Organization",
}

const CATEGORY_STYLES: Record<ResultCategory, { icon: LucideIcon; tint: string; iconColor: string }> = {
  profiles: { icon: UserRound, tint: "from-violet-500/25 to-fuchsia-500/10", iconColor: "text-violet-200" },
  events: { icon: CalendarDays, tint: "from-cyan-500/25 to-blue-500/10", iconColor: "text-cyan-200" },
  tours: { icon: Map, tint: "from-emerald-500/25 to-teal-500/10", iconColor: "text-emerald-200" },
  music: { icon: Disc3, tint: "from-fuchsia-500/25 to-purple-500/10", iconColor: "text-fuchsia-200" },
  posts: { icon: FileText, tint: "from-sky-500/25 to-indigo-500/10", iconColor: "text-sky-200" },
  jobs: { icon: BriefcaseBusiness, tint: "from-amber-500/25 to-orange-500/10", iconColor: "text-amber-200" },
}

function metadataOf<K extends GlobalSearchResultMetadata["kind"]>(
  result: GlobalSearchResult,
  kind: K
): Extract<GlobalSearchResultMetadata, { kind: K }> | null {
  return result.metadata?.kind === kind
    ? result.metadata as Extract<GlobalSearchResultMetadata, { kind: K }>
    : null
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: string | null | undefined, withYear = true): string | null {
  const date = parseDate(value)
  if (!date) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date)
}

function formatDateRange(start: string | null, end: string | null): string | null {
  const startLabel = formatDate(start)
  const endLabel = formatDate(end)
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`
  return startLabel || endLabel
}

function relativeDate(value: string | null): string | null {
  const date = parseDate(value)
  if (!date) return null
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function resultCount(response: GlobalSearchResponse): number {
  return Object.values(response.totals).reduce((total, value) => total + value, 0)
}

function currentSearchPath(response: GlobalSearchResponse): string {
  const params = new URLSearchParams()
  if (response.query) params.set("q", response.query)
  if (response.category !== "all") params.set("category", response.category)
  if (response.category === "profiles" && response.profileType !== "all") {
    params.set("profileType", response.profileType)
  }
  const query = params.toString()
  return query ? `/search?${query}` : "/search"
}

function trackResultOpen(result: GlobalSearchResult) {
  void trackDashboardUxEvent({
    eventName: "global_search_result_opened",
    surface: "global_search_results",
    metadata: {
      resultType: result.kind,
      category: result.category,
      relationship: result.relationship,
    },
  })
}

function RelationshipBadge({ result }: { result: GlobalSearchResult }) {
  if (!result.relationshipLabel) return null
  return (
    <span className="inline-flex items-center rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
      {result.relationshipLabel}
    </span>
  )
}

function ResultArtwork({
  result,
  src = result.imageUrl,
  compact = false,
  square = true,
}: {
  result: GlobalSearchResult
  src?: string | null
  compact?: boolean
  square?: boolean
}) {
  const style = CATEGORY_STYLES[result.category]
  const Icon = style.icon
  return (
    <div className={cn(
      "relative shrink-0 overflow-hidden border border-white/10 bg-gradient-to-br shadow-inner shadow-white/5",
      style.tint,
      square ? "aspect-square" : "aspect-[4/3]",
      compact ? "h-14 w-14 rounded-xl sm:h-16 sm:w-16" : "h-20 w-20 rounded-2xl sm:h-24 sm:w-24"
    )}>
      {src ? (
        <Avatar className="h-full w-full rounded-none">
          <AvatarImage src={src} alt="" className="object-cover" />
          <AvatarFallback className={cn("rounded-none bg-transparent", style.iconColor)}>
            <Icon className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className={cn(compact ? "h-5 w-5" : "h-7 w-7", style.iconColor)} />
        </div>
      )}
    </div>
  )
}

function MetaPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warm" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
      tone === "warm"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
        : "border-white/10 bg-white/[0.045] text-slate-300"
    )}>
      {children}
    </span>
  )
}

function ProfileCard({
  result,
  compact,
  signInReturnTo,
  onRelationshipChanged,
}: {
  result: GlobalSearchResult
  compact: boolean
  signInReturnTo: string
  onRelationshipChanged: (key: string, status: GlobalSearchRelationshipActionStatus) => void
}) {
  const metadata = metadataOf(result, "profile")
  const action = result.relationshipAction
  const initial = (action?.status || "none") as FollowFriendRelationship
  const profileType = result.profileType || metadata?.profileType || "general"
  const actionLabel = action?.kind === "follow" ? "follow" : "connect"

  return (
    <article className={cn(
      "group relative overflow-hidden bg-white/[0.025] transition duration-200 hover:bg-white/[0.055]",
      compact ? "p-4" : "rounded-2xl border border-white/[0.08] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:p-5"
    )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          href={result.href}
          onClick={() => trackResultOpen(result)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:gap-4"
        >
          <Avatar className={cn(
            "shrink-0 border border-white/10 bg-slate-800 ring-2 ring-transparent transition group-hover:ring-violet-400/30",
            compact ? "h-14 w-14" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
          )}>
            <AvatarImage src={result.imageUrl || undefined} alt="" className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-violet-500/35 to-fuchsia-500/20 text-lg font-bold text-violet-100">
              {result.title.slice(0, 1).toUpperCase() || <UserRound className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn("truncate font-semibold text-white", compact ? "text-[15px]" : "text-lg")}>{result.title}</span>
              {result.verified ? <CheckCircle2 aria-label="Verified" className="h-4 w-4 shrink-0 fill-sky-400 text-slate-950" /> : null}
              <RelationshipBadge result={result} />
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 sm:text-sm">
              {metadata?.handle ? <span>@{metadata.handle}</span> : null}
              <span aria-hidden="true" className="text-slate-600">•</span>
              <span>{PROFILE_LABELS[profileType]}</span>
              {metadata?.location ? <><span aria-hidden="true" className="text-slate-600">•</span><span>{metadata.location}</span></> : null}
            </span>
            {result.description ? (
              <span className={cn("mt-2 block text-sm leading-5 text-slate-300", compact ? "line-clamp-1" : "line-clamp-2")}>{result.description}</span>
            ) : null}
          </span>
        </Link>

        {action ? (
          <div className="flex shrink-0 items-center pl-[4.25rem] sm:pl-0">
            {action.requiresAuthentication ? (
              <Button asChild size="sm" variant="outline" className="rounded-full border-violet-300/25 bg-violet-400/10 text-violet-100 hover:bg-violet-400/20 hover:text-white">
                <Link href={`/login?redirectTo=${encodeURIComponent(signInReturnTo)}`} aria-label={`Sign in to ${actionLabel} ${result.title}`}>
                  Sign in to {actionLabel}
                </Link>
              </Button>
            ) : (
              <FollowFriendButton
                kind={action.kind}
                targetAccountId={result.ownerAccountId}
                targetUserId={result.ownerUserId}
                accountType={profileType}
                initialRelationship={initial}
                statusResolved
                className="rounded-full px-4"
                onChanged={relationship => onRelationshipChanged(result.key, relationship)}
              />
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function EventCard({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  const metadata = metadataOf(result, "event")
  const date = parseDate(metadata?.startsAt)
  return (
    <ResultLink result={result} compact={compact} artwork={
      result.imageUrl ? <ResultArtwork result={result} compact={compact} /> : (
        <div className={cn(
          "flex aspect-square shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-center",
          compact ? "h-14 w-14 rounded-xl sm:h-16 sm:w-16" : "h-20 w-20 sm:h-24 sm:w-24"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">{date ? date.toLocaleString("en-US", { month: "short" }) : "Event"}</span>
          <span className="text-2xl font-black text-white">{date?.getDate() || "—"}</span>
        </div>
      )
    }>
      <ResultTitle result={result} />
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 sm:text-sm">
        {formatDate(metadata?.startsAt) ? <span className="font-medium text-cyan-200">{formatDate(metadata?.startsAt)}</span> : null}
        {metadata?.venue ? <span>{metadata.venue}</span> : null}
        {metadata?.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{metadata.location}</span> : null}
      </div>
      <ResultDescription result={result} compact={compact} />
    </ResultLink>
  )
}

function TourCard({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  const metadata = metadataOf(result, "tour")
  return (
    <ResultLink result={result} compact={compact} artwork={<ResultArtwork result={result} compact={compact} />}>
      <ResultTitle result={result} />
      <div className="mt-2 flex flex-wrap gap-2">
        {formatDateRange(metadata?.startsAt || null, metadata?.endsAt || null) ? <MetaPill>{formatDateRange(metadata?.startsAt || null, metadata?.endsAt || null)}</MetaPill> : null}
        {metadata?.showCount ? <MetaPill>{metadata.showCount} {metadata.showCount === 1 ? "show" : "shows"}</MetaPill> : null}
      </div>
      <ResultDescription result={result} compact={compact} />
    </ResultLink>
  )
}

function MusicCard({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  const metadata = metadataOf(result, "music")
  return (
    <ResultLink result={result} compact={compact} artwork={<ResultArtwork result={result} compact={compact} />}>
      <ResultTitle result={result} />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 sm:text-sm">
        <span className="font-semibold uppercase tracking-wide text-fuchsia-200">{metadata?.releaseType || result.kind}</span>
        {metadata?.genre ? <><span aria-hidden="true">•</span><span>{metadata.genre}</span></> : null}
        {formatDate(metadata?.releasedAt) ? <><span aria-hidden="true">•</span><span>{formatDate(metadata?.releasedAt)}</span></> : null}
      </div>
      <ResultDescription result={result} compact={compact} />
    </ResultLink>
  )
}

function PostCard({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  const metadata = metadataOf(result, "post")
  const engagement = (metadata?.likes || 0) + (metadata?.comments || 0) + (metadata?.shares || 0)
  return (
    <Link
      href={result.href}
      onClick={() => trackResultOpen(result)}
      className={cn(
        "group block bg-white/[0.025] outline-none transition duration-200 hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
        compact ? "p-4" : "rounded-2xl border border-white/[0.08] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:p-5"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 border border-white/10">
          <AvatarImage src={metadata?.authorImageUrl || undefined} alt="" />
          <AvatarFallback className="bg-sky-400/15 text-sky-200"><UserRound className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-white">{metadata?.authorName || result.title.replace(/'s post$/, "")}</span>
            {metadata?.authorHandle ? <span className="text-xs text-slate-400">@{metadata.authorHandle}</span> : null}
            {relativeDate(metadata?.createdAt || null) ? <span suppressHydrationWarning className="text-xs text-slate-500">• {relativeDate(metadata?.createdAt || null)}</span> : null}
            <RelationshipBadge result={result} />
          </div>
          {result.description ? <p className={cn("mt-2 text-sm leading-6 text-slate-200", compact ? "line-clamp-2" : "line-clamp-3")}>{result.description}</p> : null}
          {engagement > 0 ? (
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              {metadata?.likes ? <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{compactNumber(metadata.likes)}</span> : null}
              {metadata?.comments ? <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{compactNumber(metadata.comments)}</span> : null}
            </div>
          ) : null}
        </div>
        {metadata?.mediaThumbnailUrl ? (
          <ResultArtwork result={result} src={metadata.mediaThumbnailUrl} compact={compact} />
        ) : null}
      </div>
    </Link>
  )
}

function JobCard({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  const metadata = metadataOf(result, "job")
  return (
    <ResultLink result={result} compact={compact} artwork={<ResultArtwork result={result} compact={compact} />}>
      <ResultTitle result={result} />
      <div className="mt-2 flex flex-wrap gap-2">
        {metadata?.position && metadata.position !== result.title ? <MetaPill>{metadata.position}</MetaPill> : null}
        {metadata?.location ? <MetaPill>{metadata.location}</MetaPill> : null}
        {metadata?.remote ? <MetaPill>Remote</MetaPill> : null}
        {metadata?.urgent ? <MetaPill tone="warm">Hiring now</MetaPill> : null}
      </div>
      <ResultDescription result={result} compact={compact} />
      {relativeDate(metadata?.postedAt || null) ? <p suppressHydrationWarning className="mt-2 text-xs text-slate-500">Posted {relativeDate(metadata?.postedAt || null)}</p> : null}
    </ResultLink>
  )
}

function ResultLink({
  result,
  compact,
  artwork,
  children,
}: {
  result: GlobalSearchResult
  compact: boolean
  artwork: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={result.href}
      onClick={() => trackResultOpen(result)}
      className={cn(
        "group flex items-start gap-3 bg-white/[0.025] outline-none transition duration-200 hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 sm:gap-4",
        compact ? "p-4" : "rounded-2xl border border-white/[0.08] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:p-5"
      )}
    >
      {artwork}
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
    </Link>
  )
}

function ResultTitle({ result }: { result: GlobalSearchResult }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-semibold text-white transition group-hover:text-violet-100">{result.title}</h3>
      {result.verified ? <CheckCircle2 aria-label="Verified" className="h-4 w-4 fill-sky-400 text-slate-950" /> : null}
      <RelationshipBadge result={result} />
    </div>
  )
}

function ResultDescription({ result, compact }: { result: GlobalSearchResult; compact: boolean }) {
  if (!result.description) return null
  return <p className={cn("mt-2 text-sm leading-5 text-slate-400", compact ? "line-clamp-1" : "line-clamp-2")}>{result.description}</p>
}

function SearchResultCard({
  result,
  compact = false,
  signInReturnTo,
  onRelationshipChanged,
}: {
  result: GlobalSearchResult
  compact?: boolean
  signInReturnTo: string
  onRelationshipChanged: (key: string, status: GlobalSearchRelationshipActionStatus) => void
}) {
  switch (result.kind) {
    case "profile":
      return <ProfileCard result={result} compact={compact} signInReturnTo={signInReturnTo} onRelationshipChanged={onRelationshipChanged} />
    case "event":
      return <EventCard result={result} compact={compact} />
    case "tour":
      return <TourCard result={result} compact={compact} />
    case "track":
    case "album":
    case "ep":
      return <MusicCard result={result} compact={compact} />
    case "post":
      return <PostCard result={result} compact={compact} />
    case "job":
      return <JobCard result={result} compact={compact} />
  }
}

export function GlobalSearchLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 sm:py-8" aria-label="Loading search results">
      <div className="rounded-3xl border border-white/[0.08] bg-slate-950/45 p-5 sm:p-6">
        <Skeleton className="h-4 w-24 bg-white/10" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full bg-white/10" />
        <Skeleton className="mt-5 h-12 w-full rounded-2xl bg-white/10" />
      </div>
      <Skeleton className="mt-5 h-14 w-full rounded-2xl bg-white/10" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-28 w-full rounded-2xl bg-white/[0.07]" />)}
      </div>
    </div>
  )
}

export function GlobalSearchResults({ initialResponse }: { initialResponse: GlobalSearchResponse }) {
  const router = useRouter()
  const [response, setResponse] = useState(initialResponse)
  const [draftQuery, setDraftQuery] = useState(initialResponse.query)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setResponse(initialResponse)
    setDraftQuery(initialResponse.query)
  }, [initialResponse])

  const navigate = (category: GlobalSearchCategory, profileType: GlobalSearchProfileType = "all") => {
    const params = new URLSearchParams()
    if (response.query) params.set("q", response.query)
    if (category !== "all") params.set("category", category)
    if (category === "profiles" && profileType !== "all") params.set("profileType", profileType)
    void trackDashboardUxEvent({
      eventName: "global_search_filter_changed",
      surface: "global_search_results",
      metadata: { category, profileType: category === "profiles" ? profileType : "all" },
    })
    startTransition(() => router.push(`/search?${params.toString()}`))
  }

  const submitQuery = (query = draftQuery) => {
    const normalized = query.trim()
    if (!normalized) return
    void trackDashboardUxEvent({
      eventName: "global_search_submit",
      surface: "global_search_results",
      metadata: { category: "all", queryLength: normalized.length },
    })
    startTransition(() => router.push(`/search?q=${encodeURIComponent(normalized)}`))
  }

  const updateRelationship = (key: string, status: GlobalSearchRelationshipActionStatus) => {
    const updateItem = (item: GlobalSearchResult): GlobalSearchResult => item.key === key && item.relationshipAction
      ? { ...item, relationshipAction: { ...item.relationshipAction, status } }
      : item
    setResponse(current => ({
      ...current,
      items: current.items.map(updateItem),
      sections: current.sections.map(section => ({ ...section, items: section.items.map(updateItem) })),
    }))
  }

  const loadMore = async () => {
    if (!response.nextCursor) return
    setIsLoadingMore(true)
    setLoadMoreError(false)
    try {
      const params = new URLSearchParams({
        q: response.query,
        category: response.category,
        profileType: response.profileType,
        cursor: response.nextCursor,
        limit: "20",
      })
      const result = await fetch(`/api/search/global?${params}`, { credentials: "include", cache: "no-store" })
      if (!result.ok) throw new Error("Unable to load more")
      const next = await result.json() as GlobalSearchResponse
      setResponse(current => ({ ...next, items: [...current.items, ...next.items] }))
    } catch {
      setLoadMoreError(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const hasAnyResults = response.category === "all" ? response.sections.length > 0 : response.items.length > 0
  const total = resultCount(response)
  const signInReturnTo = currentSearchPath(response)

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#101329] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[52rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-[35rem] h-80 w-80 rounded-full bg-cyan-500/[0.07] blur-[100px]" />
      </div>

      <main className="relative mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 sm:py-8" aria-busy={isPending}>
        <header className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Tourify Search</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {response.query ? <>Results for <span className="text-violet-200">“{response.query}”</span></> : "Find your next connection"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {response.query
                ? `${total.toLocaleString()} public ${total === 1 ? "result" : "results"} across Tourify`
                : "Search profiles, live events, tours, music, posts, and opportunities."}
            </p>
          </div>

          <form onSubmit={event => { event.preventDefault(); submitQuery() }} className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <Input
              aria-label="Search Tourify"
              value={draftQuery}
              onChange={event => setDraftQuery(event.target.value)}
              className="h-12 rounded-2xl border-white/10 bg-black/25 pl-12 pr-28 text-base text-white shadow-inner placeholder:text-slate-500 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/30 sm:pr-32"
              placeholder="Search Tourify"
            />
            {draftQuery ? (
              <button type="button" onClick={() => setDraftQuery("")} aria-label="Clear search" className="absolute right-[5.4rem] top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white sm:right-[6.4rem]">
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <Button type="submit" disabled={!draftQuery.trim() || isPending} className="absolute right-1.5 top-1.5 h-9 rounded-xl bg-violet-600 px-4 text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500 sm:px-5">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Searching" /> : "Search"}
            </Button>
          </form>
        </header>

        {response.query ? (
          <div className="sticky top-16 z-40 -mx-2 mt-4 rounded-2xl border border-white/[0.08] bg-[#11152b]/90 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
            {isPending ? <div className="absolute inset-x-3 top-0 h-px overflow-hidden rounded-full bg-violet-400/20"><div className="h-full w-1/2 animate-pulse rounded-full bg-violet-400" /></div> : null}
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Search categories">
              <div className="flex min-w-max gap-1">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  const count = tab.value === "all" ? total : response.totals[tab.value]
                  const active = response.category === tab.value
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => navigate(tab.value)}
                      disabled={isPending}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400",
                        active ? "bg-violet-500/20 text-white shadow-inner shadow-violet-300/5" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active && "text-violet-300")} />
                      {tab.label}
                      {count > 0 ? <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-violet-300/15 text-violet-100" : "bg-white/[0.06] text-slate-500")}>{compactNumber(count)}</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}

        {response.category === "profiles" && response.query ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Profile types">
            {PROFILE_TYPES.map(type => {
              const active = response.profileType === type.value
              return (
                <button key={type.value} type="button" onClick={() => navigate("profiles", type.value)} disabled={isPending} className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400",
                  active ? "border-violet-300/30 bg-violet-400/15 text-violet-100" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:text-white"
                )}>{type.label}</button>
              )
            })}
          </div>
        ) : null}

        {response.unavailableCategories.length > 0 ? (
          <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p><span className="font-semibold">Some results are temporarily unavailable.</span> Results from {response.unavailableCategories.map(category => SECTION_LABELS[category]).join(", ")} could not be loaded, but everything else is shown below.</p>
          </div>
        ) : null}

        <div className={cn("mt-6 transition-opacity duration-200", isPending && "pointer-events-none opacity-50")}>
          {!response.query ? (
            <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-5 py-14 text-center sm:px-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200"><Search className="h-6 w-6" /></div>
              <h2 className="mt-5 text-xl font-semibold text-white">Search all of Tourify</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Find people you know, creators to follow, upcoming shows, releases, conversations, and work.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["artists", "venues", "tours", "crew jobs"].map(suggestion => <button key={suggestion} type="button" onClick={() => { setDraftQuery(suggestion); submitQuery(suggestion) }} className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold capitalize text-slate-300 transition hover:border-violet-300/25 hover:bg-violet-400/10 hover:text-white">{suggestion}</button>)}
              </div>
            </section>
          ) : !hasAnyResults ? (
            <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-5 py-14 text-center sm:px-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-400"><Search className="h-6 w-6" /></div>
              <h2 className="mt-5 text-xl font-semibold text-white">No results for “{response.query}”</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Try a shorter phrase, check the spelling, or search across every category.</p>
              {response.category !== "all" ? <Button type="button" variant="outline" onClick={() => navigate("all")} className="mt-5 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]">Search all categories</Button> : null}
            </section>
          ) : response.category === "all" ? (
            <div className="space-y-5">
              {response.sections.map(section => {
                const SectionIcon = CATEGORY_STYLES[section.category].icon
                return (
                  <section key={section.category} aria-labelledby={`section-${section.category}`} className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/35 shadow-[0_20px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", CATEGORY_STYLES[section.category].tint, CATEGORY_STYLES[section.category].iconColor)}><SectionIcon className="h-4 w-4" /></span>
                        <div>
                          <h2 id={`section-${section.category}`} className="font-semibold text-white">{SECTION_LABELS[section.category]}</h2>
                          <p className="text-xs text-slate-500">{section.total.toLocaleString()} {section.total === 1 ? "result" : "results"}</p>
                        </div>
                      </div>
                      {section.total > section.items.length ? <button type="button" onClick={() => navigate(section.category)} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-violet-200 outline-none transition hover:bg-violet-400/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400">See all <ArrowRight className="h-3.5 w-3.5" /></button> : null}
                    </div>
                    <div className="divide-y divide-white/[0.07]">
                      {section.items.map(item => <SearchResultCard key={item.key} result={item} compact signInReturnTo={signInReturnTo} onRelationshipChanged={updateRelationship} />)}
                    </div>
                    {section.total > section.items.length ? <button type="button" onClick={() => navigate(section.category)} className="flex w-full items-center justify-center gap-2 border-t border-white/[0.07] px-4 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:hidden">See all {SECTION_LABELS[section.category].toLowerCase()} <ArrowRight className="h-4 w-4" /></button> : null}
                  </section>
                )
              })}
            </div>
          ) : (
            <section aria-labelledby="category-results-heading">
              <div className="mb-4 flex items-end justify-between gap-4 px-1">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">Filtered results</p>
                  <h2 id="category-results-heading" className="mt-1 text-xl font-semibold text-white">{SECTION_LABELS[response.category]}</h2>
                </div>
                <p className="text-sm text-slate-500">{response.totals[response.category].toLocaleString()} found</p>
              </div>
              <div className="space-y-3">
                {response.items.map(item => <SearchResultCard key={item.key} result={item} signInReturnTo={signInReturnTo} onRelationshipChanged={updateRelationship} />)}
              </div>
              {response.nextCursor ? (
                <div className="pt-6 text-center">
                  {loadMoreError ? <p role="alert" className="mb-3 text-sm text-rose-300">More results could not be loaded. Please try again.</p> : null}
                  <Button type="button" variant="outline" onClick={loadMore} disabled={isLoadingMore} className="rounded-full border-white/15 bg-white/[0.04] px-6 text-white hover:bg-white/[0.08]">
                    {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Load more results
                  </Button>
                  {isLoadingMore ? <div className="mx-auto mt-4 max-w-2xl space-y-3"><Skeleton className="h-24 rounded-2xl bg-white/[0.06]" /><Skeleton className="h-24 rounded-2xl bg-white/[0.06]" /></div> : null}
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4" />You’ve seen all {SECTION_LABELS[response.category].toLowerCase()} results</div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
