"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Eye,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
  Mail,
  Music,
  RefreshCw,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"

type BandProfile = {
  id: string
  organization_name: string | null
  description: string | null
  url_slug: string | null
  is_public: boolean | null
}

type RosterRow = {
  id: string
  role: string
  status: "pending" | "accepted" | "declined" | "removed" | string
  artist_profile_id: string
  artist_profiles?: {
    id?: string
    artist_name?: string | null
    url_slug?: string | null
  } | null
}

type GrantRow = {
  user_id: string
  role: string
  created_at?: string | null
}

type SearchHit = {
  id: string
  artistProfileId?: string | null
  displayName?: string | null
  username?: string | null
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "B"
}

function statusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Listed publicly"
    case "pending":
      return "Invite sent"
    case "declined":
      return "Declined"
    case "removed":
      return "Removed"
    default:
      return status
  }
}

function statusClass(status: string) {
  switch (status) {
    case "accepted":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
    case "pending":
      return "border-amber-500/30 bg-amber-500/15 text-amber-200"
    case "declined":
    case "removed":
      return "border-white/10 bg-white/5 text-slate-400"
    default:
      return "border-sky-500/30 bg-sky-500/15 text-sky-200"
  }
}

const panelClass =
  "rounded-lg border border-slate-700/50 bg-slate-950/60 shadow-xl shadow-black/25 backdrop-blur"
const insetClass = "rounded-md border border-slate-800/80 bg-slate-950/55"
const iconTileClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06]"

function ReadinessBadge({ ready }: { ready: boolean }) {
  return (
    <Badge className={ready ? statusClass("accepted") : statusClass("pending")}>
      {ready ? "Ready" : "Next"}
    </Badge>
  )
}

function HubStatCard({
  label,
  value,
  caption,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  caption: string
  icon: typeof Users
  accent: string
}) {
  return (
    <div className={`${insetClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <div className={`${iconTileClass} ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

interface BandHubProps {
  organizerAccountId: string
  onboarding?: boolean
}

export function BandHub({ organizerAccountId, onboarding = false }: BandHubProps) {
  const [band, setBand] = useState<BandProfile | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingArtist, setIsSavingArtist] = useState(false)
  const [isSavingManager, setIsSavingManager] = useState(false)
  const [artistQuery, setArtistQuery] = useState("")
  const [artistHits, setArtistHits] = useState<SearchHit[]>([])
  const [selectedArtist, setSelectedArtist] = useState<SearchHit | null>(null)
  const [artistRole, setArtistRole] = useState("member")
  const [isSearchingArtist, setIsSearchingArtist] = useState(false)
  const [managerEmail, setManagerEmail] = useState("")
  const [managerRole, setManagerRole] = useState<"tour_manager" | "admin" | "production">("tour_manager")

  const publicPath = getArtistPublicProfilePath(band?.url_slug)
  const counts = useMemo(() => {
    return roster.reduce(
      (acc, row) => {
        if (row.status === "accepted") acc.accepted += 1
        else if (row.status === "pending") acc.pending += 1
        else if (row.status === "removed") acc.removed += 1
        else if (row.status === "declined") acc.declined += 1
        return acc
      },
      { accepted: 0, pending: 0, removed: 0, declined: 0 }
    )
  }, [roster])

  const checklist = [
    { label: "Band name added", done: Boolean(band?.organization_name) },
    { label: "Public URL set", done: Boolean(band?.url_slug) },
    { label: "Band page visible", done: band?.is_public !== false },
    { label: "At least one listed member", done: counts.accepted > 0 },
    { label: "Manager invited", done: grants.some(grant => grant.role !== "owner") },
  ]
  const readiness = Math.round((checklist.filter(item => item.done).length / checklist.length) * 100)

  async function load() {
    setIsLoading(true)
    try {
      const [profileResult, rosterRes, grantsRes] = await Promise.all([
        supabase
          .from("organizer_accounts")
          .select("id, organization_name, description, url_slug, is_public")
          .eq("id", organizerAccountId)
          .maybeSingle(),
        fetch(`/api/organization/artist-members?organizerAccountId=${organizerAccountId}`, {
          credentials: "include",
        }),
        fetch(`/api/organization/tour-managers?organizerAccountId=${organizerAccountId}`, {
          credentials: "include",
        }),
      ])

      if (profileResult.data) setBand(profileResult.data as BandProfile)
      if (rosterRes.ok) {
        const data = await rosterRes.json()
        setRoster(data.members || [])
      }
      if (grantsRes.ok) {
        const data = await grantsRes.json()
        setGrants(data.members || [])
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (organizerAccountId) void load()
  }, [organizerAccountId])

  async function searchArtists(query: string) {
    setArtistQuery(query)
    setSelectedArtist(null)
    if (query.trim().length < 2) {
      setArtistHits([])
      return
    }
    setIsSearchingArtist(true)
    try {
      const res = await fetch(
        `/api/search/enhanced?q=${encodeURIComponent(query.trim())}&type=artists&limit=8`,
        { credentials: "include" }
      )
      if (!res.ok) return
      const data = await res.json()
      setArtistHits(
        Array.isArray(data.results)
          ? data.results.filter((row: SearchHit & { type?: string }) => row.type === "artist")
          : []
      )
    } finally {
      setIsSearchingArtist(false)
    }
  }

  async function sendArtistInvite(artistProfileId: string, role: string) {
    setIsSavingArtist(true)
    try {
      const res = await fetch("/api/organization/artist-members", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-acting-profile-id": organizerAccountId,
          "x-acting-account-type": "organization",
        },
        body: JSON.stringify({
          organizerAccountId,
          artistProfileId,
          role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to invite artist")
        return
      }
      toast.success("Band roster invite sent")
      setArtistQuery("")
      setArtistHits([])
      setSelectedArtist(null)
      setArtistRole("member")
      await load()
    } finally {
      setIsSavingArtist(false)
    }
  }

  async function inviteSelectedArtist() {
    const artistProfileId = selectedArtist?.artistProfileId
    if (!artistProfileId) {
      toast.error("Select an artist from search results")
      return
    }
    await sendArtistInvite(artistProfileId, artistRole.trim() || "member")
  }

  async function updateMembership(membershipId: string, status: "removed") {
    const res = await fetch("/api/organization/artist-members", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-acting-profile-id": organizerAccountId,
        "x-acting-account-type": "organization",
      },
      body: JSON.stringify({ membershipId, status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to update roster")
      return
    }
    toast.success("Roster updated")
    await load()
  }

  async function inviteManager() {
    if (!managerEmail.trim()) {
      toast.error("Enter a manager email")
      return
    }
    setIsSavingManager(true)
    try {
      const res = await fetch("/api/organization/tour-managers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerAccountId,
          email: managerEmail.trim(),
          role: managerRole,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to invite manager")
        return
      }
      toast.success("Manager invite sent")
      setManagerEmail("")
      setManagerRole("tour_manager")
      await load()
    } finally {
      setIsSavingManager(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`${panelClass} p-6 text-sm text-slate-400`}>
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading band hub…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {onboarding ? (
        <Card className="rounded-lg border-amber-400/25 bg-amber-500/10 shadow-lg shadow-amber-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-300/20 bg-amber-300/10">
                <Sparkles className="h-4 w-4 text-amber-200" />
              </div>
              <div>
              <p className="font-medium text-amber-100">Band account created</p>
              <p className="text-sm text-amber-100/75">
                  Finish the readiness list, then invite artists to appear on the public band page.
              </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
              <a href="#band-roster">
                Invite artists
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-800/80 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${iconTileClass} border-cyan-300/20 bg-cyan-300/10 text-cyan-200`}>
                <Activity className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">Band Command Center</p>
                  <Badge className={band?.is_public === false ? statusClass("removed") : statusClass("accepted")}>
                    {band?.is_public === false ? (
                      <Lock className="mr-1 h-3 w-3" />
                    ) : (
                      <Globe className="mr-1 h-3 w-3" />
                    )}
                    {band?.is_public === false ? "Private" : "Public"}
                  </Badge>
                </div>
                <h1 className="mt-2 truncate text-2xl font-semibold text-white">
                  {band?.organization_name || "Band"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">
                  {band?.description || "Add a short band bio so visitors know who they are discovering."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 font-mono text-xs text-cyan-100">
                {publicPath || "/artist/your-band"}
              </div>
              {publicPath ? (
                <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500">
                  <Link href={publicPath}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10">
                <Link href="/admin/dashboard/settings">
                  Profile
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <HubStatCard
            label="Listed"
            value={counts.accepted}
            caption="Public members"
            icon={Users}
            accent="text-emerald-200"
          />
          <HubStatCard
            label="Pending"
            value={counts.pending}
            caption="Roster invites"
            icon={UserPlus}
            accent="text-amber-200"
          />
          <HubStatCard
            label="Inactive"
            value={counts.removed + counts.declined}
            caption="Removed or declined"
            icon={RefreshCw}
            accent="text-slate-300"
          />
          <HubStatCard
            label="Access"
            value={grants.length}
            caption="Owners and managers"
            icon={Shield}
            accent="text-purple-200"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className={panelClass}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <span className={`${iconTileClass} text-emerald-200`}>
                <CheckCircle className="h-4 w-4" />
              </span>
              <span>
                Launch readiness
                <span className="mt-1 block text-sm font-normal text-slate-400">
                  {readiness}% configured
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={readiness} className="h-2 bg-slate-800" />
            <ul className="space-y-2">
              {checklist.map(item => (
                <li key={item.label} className={`${insetClass} flex items-center justify-between gap-3 px-3 py-2 text-sm`}>
                  <span className={item.done ? "text-slate-100" : "text-slate-400"}>{item.label}</span>
                  <ReadinessBadge ready={item.done} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <span className={`${iconTileClass} text-sky-200`}>
                <Globe className="h-4 w-4" />
              </span>
              <span>
                Public page controls
                <span className="mt-1 block text-sm font-normal text-slate-400">
                  Artist-style discovery for the band.
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className={`${insetClass} px-3 py-2`}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Public URL</p>
              <p className="mt-1 truncate font-mono text-sm text-slate-200">{publicPath || "/artist/your-band"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {publicPath ? (
                <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                  <Link href={publicPath}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10">
                <Link href="/admin/dashboard/settings">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="band-roster" className={panelClass}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`${iconTileClass} text-cyan-200`}>
                <Users className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-white">Roster command</CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Band members appear publicly. Accepting a roster invite does not grant edit access.
              </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={statusClass("accepted")}>{counts.accepted} listed</Badge>
              <Badge className={statusClass("pending")}>{counts.pending} pending</Badge>
              <Badge className={statusClass("removed")}>{counts.removed + counts.declined} inactive</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-3 md:grid-cols-[1fr_150px_auto]">
            <div className="space-y-2">
              <Label htmlFor="band-artist-search">Search artist</Label>
              {selectedArtist ? (
                <div className="flex items-center justify-between rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2">
                  <div className="min-w-0 text-sm text-sky-100">
                    <span className="font-medium">{selectedArtist.displayName || selectedArtist.username}</span>
                    {selectedArtist.username ? <span className="ml-2 text-sky-200/60">@{selectedArtist.username}</span> : null}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-sky-100" onClick={() => setSelectedArtist(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="band-artist-search"
                    value={artistQuery}
                    onChange={(event) => void searchArtists(event.target.value)}
                    placeholder="Artist name or slug"
                    className="border-white/10 bg-slate-950/70"
                  />
                  {isSearchingArtist ? (
                    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Searching…
                    </div>
                  ) : artistHits.length ? (
                    <div className="max-h-44 overflow-auto rounded-md border border-white/10 bg-slate-950/70">
                      {artistHits.map(hit => (
                        <button
                          key={hit.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-cyan-300/10"
                          onClick={() => {
                            setSelectedArtist(hit)
                            setArtistQuery(hit.displayName || hit.username || "")
                            setArtistHits([])
                          }}
                        >
                          {hit.displayName || hit.username || "Artist"}
                          {hit.username ? <span className="ml-2 text-xs text-slate-500">@{hit.username}</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="band-artist-role">Role</Label>
              <Input
                id="band-artist-role"
                value={artistRole}
                onChange={(event) => setArtistRole(event.target.value)}
                className="border-white/10 bg-slate-950/70"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={inviteSelectedArtist}
                disabled={isSavingArtist || !selectedArtist?.artistProfileId}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500"
              >
                {isSavingArtist ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Invite artist
              </Button>
            </div>
          </div>

          {roster.length ? (
            <div className="space-y-2">
              {roster.map(row => {
                const artist = row.artist_profiles
                const name = artist?.artist_name || row.artist_profile_id
                const href = getArtistPublicProfilePath(artist?.url_slug || artist?.id || row.artist_profile_id)
                const inactive = row.status === "removed" || row.status === "declined"
                return (
                  <div
                    key={row.id}
                    className={`${insetClass} grid gap-3 p-3 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${inactive ? "opacity-60" : "hover:border-cyan-300/25"}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarFallback className="bg-white/10 text-xs text-white">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          {artist?.url_slug ? <span>@{artist.url_slug}</span> : null}
                          <span className="capitalize">{row.role || "member"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                      {row.status === "accepted" && href ? (
                        <Button asChild size="sm" variant="ghost" className="text-slate-200 hover:bg-white/10">
                          <Link href={href}>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      ) : null}
                      {row.status === "accepted" || row.status === "pending" ? (
                        <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => void updateMembership(row.id, "removed")}>
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-200 hover:bg-white/10"
                          disabled={isSavingArtist}
                          onClick={() => void sendArtistInvite(row.artist_profile_id, row.role || "member")}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Reinvite
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-cyan-300/20 bg-cyan-300/[0.03] p-6 text-center">
              <Music className="mx-auto mb-3 h-8 w-8 text-cyan-200/60" />
              <p className="text-sm font-medium text-slate-200">No band members invited yet</p>
              <p className="mt-1 text-sm text-slate-500">Search for artist accounts above to build the public member roster.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={panelClass}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className={`${iconTileClass} text-purple-200`}>
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-white">Access command</CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Managers can help edit and manage the band. They are not shown as public band members.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border border-purple-300/15 bg-purple-300/[0.04] p-3 md:grid-cols-[1fr_170px_auto]">
            <div className="space-y-2">
              <Label htmlFor="band-manager-email">Email</Label>
              <Input
                id="band-manager-email"
                type="email"
                value={managerEmail}
                onChange={(event) => setManagerEmail(event.target.value)}
                placeholder="manager@example.com"
                className="border-white/10 bg-slate-950/70"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={managerRole} onValueChange={(value) => setManagerRole(value as typeof managerRole)}>
                <SelectTrigger className="border-white/10 bg-slate-950/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tour_manager">Tour manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={inviteManager} disabled={isSavingManager} className="bg-white text-slate-950 hover:bg-slate-200">
                {isSavingManager ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Invite manager
              </Button>
            </div>
          </div>

          {grants.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {grants.map(grant => (
                <div key={`${grant.user_id}-${grant.role}`} className={`${insetClass} p-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="border-purple-300/25 bg-purple-300/10 capitalize text-purple-100">
                        {grant.role.replace(/_/g, " ")}
                      </Badge>
                      <p className="mt-2 text-xs text-slate-500">Management access</p>
                    </div>
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-slate-400">
                      {grant.user_id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-purple-300/20 bg-purple-300/[0.03] p-6 text-center">
              <Shield className="mx-auto mb-3 h-8 w-8 text-purple-200/60" />
              <p className="text-sm font-medium text-slate-200">No extra managers invited yet</p>
              <p className="mt-1 text-sm text-slate-500">Invite a trusted collaborator when you want help running the band.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
