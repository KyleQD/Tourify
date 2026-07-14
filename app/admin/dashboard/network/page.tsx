"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import supabaseClient from "@/lib/supabase/client"
import { toast } from "sonner"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Link2, Check, X, UserMinus, Search, Loader2, RefreshCw,
  MessageSquare, UserPlus,
} from "lucide-react"
import { AdminStatCard } from "../components/admin-stat-card"
import { formatDistanceToNow } from "date-fns"

interface ProfileSnippet {
  full_name: string | null
  username: string | null
  avatar_url: string | null
  account_type?: string | null
}

interface FollowRequest {
  id: string
  requester_id: string
  target_id: string
  status: "pending" | "accepted" | "rejected" | "cancelled"
  created_at: string
  requester?: ProfileSnippet | null
  target?: ProfileSnippet | null
}

interface DiscoverUser {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
  account_type?: string | null
  location?: string | null
  can_send_request?: boolean
  outgoing_request?: { id: string; status: string } | null
  incoming_request?: { id: string; status: string } | null
}

function accountTypeLabel(accountType?: string | null) {
  if (!accountType) return null
  return accountType.replace(/_/g, " ")
}

function AccountTypeBadge({ accountType }: { accountType?: string | null }) {
  const label = accountTypeLabel(accountType)
  if (!label) return null
  return (
    <Badge variant="outline" className="border-slate-600 text-slate-400 text-[10px] capitalize">
      {label}
    </Badge>
  )
}

function ConnectionCard({
  request,
  perspective,
  currentUserId,
  onApprove,
  onDecline,
  onRevoke,
  isBusy,
}: {
  request: FollowRequest
  perspective: "incoming" | "outgoing" | "accepted"
  currentUserId: string
  onApprove?: () => void
  onDecline?: () => void
  onRevoke?: () => void
  isBusy?: boolean
}) {
  const otherId =
    request.requester_id === currentUserId ? request.target_id : request.requester_id
  const profile =
    perspective === "incoming"
      ? request.requester
      : perspective === "outgoing"
        ? request.target
        : request.requester_id === currentUserId
          ? request.target
          : request.requester
  const displayName = profile?.full_name || profile?.username || "Unknown user"
  const avatarUrl = profile?.avatar_url

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-sm bg-slate-800/50 hover:bg-slate-800 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs bg-purple-600/20 text-purple-400">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <AccountTypeBadge accountType={profile?.account_type} />
          </div>
          <p className="text-slate-400 text-xs">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {perspective === "accepted" && (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-8 px-3" asChild>
            <Link href={`/admin/dashboard/communications?dm=${otherId}`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
            </Link>
          </Button>
        )}
        {perspective === "incoming" && (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
              onClick={onApprove}
              disabled={isBusy}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400 h-8 px-3"
              onClick={onDecline}
              disabled={isBusy}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Decline
            </Button>
          </>
        )}
        {perspective === "outgoing" && (
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-400 h-8 px-3"
            onClick={onRevoke}
            disabled={isBusy}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        )}
        {perspective === "accepted" && (
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400 h-8 px-3"
            onClick={onRevoke}
            disabled={isBusy}
          >
            <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}

function DiscoverCard({
  user,
  onConnect,
  isBusy,
}: {
  user: DiscoverUser
  onConnect: () => void
  isBusy?: boolean
}) {
  const displayName = user.full_name || user.username || "Unknown user"
  const alreadyPending = user.outgoing_request?.status === "pending"
  const canConnect = user.can_send_request !== false && !alreadyPending

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-sm bg-slate-800/50 hover:bg-slate-800 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-purple-600/20 text-purple-400">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <AccountTypeBadge accountType={user.account_type} />
          </div>
          {user.location ? (
            <p className="text-slate-400 text-xs truncate">{user.location}</p>
          ) : user.username ? (
            <p className="text-slate-400 text-xs truncate">@{user.username}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-8 px-3" asChild>
          <Link href={`/admin/dashboard/communications?dm=${user.id}`}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
          </Link>
        </Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3"
          onClick={onConnect}
          disabled={isBusy || !canConnect}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          {alreadyPending ? "Pending" : "Connect"}
        </Button>
      </div>
    </div>
  )
}

async function followRequestAction(targetUserId: string, action: string) {
  const res = await fetch("/api/social/follow-request", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, action }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Failed to ${action} connection`)
  return data
}

export default function NetworkPage() {
  const supabase = supabaseClient
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [discoverQuery, setDiscoverQuery] = useState("")
  const [discoverResults, setDiscoverResults] = useState<DiscoverUser[]>([])
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const discoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: rows, error } = await supabase
        .from("follow_requests")
        .select("id, requester_id, target_id, status, created_at")
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) throw error

      const allUserIds = [...new Set([
        ...(rows || []).map((r: FollowRequest) => r.requester_id),
        ...(rows || []).map((r: FollowRequest) => r.target_id),
      ])]

      let profileMap: Record<string, ProfileSnippet> = {}
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, account_type")
          .in("id", allUserIds)
        ;(profiles || []).forEach((p: ProfileSnippet & { id: string }) => {
          profileMap[p.id] = p
        })
      }

      setRequests((rows || []).map((r: FollowRequest) => ({
        ...r,
        requester: profileMap[r.requester_id] || null,
        target: profileMap[r.target_id] || null,
      })))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load connections"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const searchDiscover = useCallback(async (query: string) => {
    setIsDiscoverLoading(true)
    try {
      const params = new URLSearchParams({ limit: "24" })
      if (query.trim()) params.set("q", query.trim())
      const res = await fetch(`/api/social/friend-search?${params}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      setDiscoverResults(data.users || data.results || [])
    } catch {
      toast.error("Failed to search users")
      setDiscoverResults([])
    } finally {
      setIsDiscoverLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    void searchDiscover("")
  }, [searchDiscover])

  useEffect(() => {
    if (discoverTimerRef.current) clearTimeout(discoverTimerRef.current)
    discoverTimerRef.current = setTimeout(() => {
      void searchDiscover(discoverQuery)
    }, 300)
    return () => {
      if (discoverTimerRef.current) clearTimeout(discoverTimerRef.current)
    }
  }, [discoverQuery, searchDiscover])

  async function runAction(
    key: string,
    targetUserId: string,
    action: "send" | "accept" | "reject" | "cancel" | "remove",
    successMessage: string,
  ) {
    setBusyKey(key)
    try {
      await followRequestAction(targetUserId, action)
      toast.success(successMessage)
      if (action === "send") {
        setDiscoverResults((prev) => prev.filter((u) => u.id !== targetUserId))
      }
      await load()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed"
      toast.error(message)
    } finally {
      setBusyKey(null)
    }
  }

  const filtered = requests.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    const requesterName = r.requester?.full_name || r.requester?.username || ""
    const targetName = r.target?.full_name || r.target?.username || ""
    const requesterType = r.requester?.account_type || ""
    const targetType = r.target?.account_type || ""
    return (
      requesterName.toLowerCase().includes(q) ||
      targetName.toLowerCase().includes(q) ||
      requesterType.toLowerCase().includes(q) ||
      targetType.toLowerCase().includes(q)
    )
  })

  const incoming = filtered.filter((r) => r.target_id === currentUserId && r.status === "pending")
  const outgoing = filtered.filter((r) => r.requester_id === currentUserId && r.status === "pending")
  const accepted = filtered.filter((r) => r.status === "accepted")

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Connections"
        subtitle="Discover, connect, and message people across your organizer network"
        icon={Link2}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Incoming Requests" value={incoming.length} icon={Link2} color="purple" size="default" />
        <AdminStatCard title="Outgoing Requests" value={outgoing.length} icon={Link2} color="blue" size="default" />
        <AdminStatCard title="Connections" value={accepted.length} icon={Link2} color="green" size="default" />
        <AdminStatCard title="Discoverable" value={discoverResults.length} icon={UserPlus} color="amber" size="default" />
      </div>

      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter connections by name or account type..."
              className="pl-9 bg-slate-800/50 border-slate-700/50 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="discover">
          <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1 flex-wrap h-auto">
            <TabsTrigger value="discover" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Discover
            </TabsTrigger>
            <TabsTrigger value="incoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Incoming ({incoming.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Outgoing ({outgoing.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Connected ({accepted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3 space-y-3">
                <CardTitle className="text-white text-base">Discover people</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={discoverQuery}
                    onChange={(e) => setDiscoverQuery(e.target.value)}
                    placeholder="Search artists, venues, workers, organizers..."
                    className="pl-9 bg-slate-800/50 border-slate-700/50 text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isDiscoverLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : discoverResults.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">
                    No users found. Try a different search.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {discoverResults.map((user) => (
                      <DiscoverCard
                        key={user.id}
                        user={user}
                        isBusy={busyKey === `send:${user.id}`}
                        onConnect={() =>
                          void runAction(`send:${user.id}`, user.id, "send", "Connection request sent")
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Incoming Connection Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {incoming.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No pending incoming requests.</p>
                ) : (
                  <div className="space-y-2">
                    {incoming.map((r) => (
                      <ConnectionCard
                        key={r.id}
                        request={r}
                        perspective="incoming"
                        currentUserId={currentUserId!}
                        isBusy={busyKey === `accept:${r.requester_id}` || busyKey === `reject:${r.requester_id}`}
                        onApprove={() =>
                          void runAction(`accept:${r.requester_id}`, r.requester_id, "accept", "Connection accepted")
                        }
                        onDecline={() =>
                          void runAction(`reject:${r.requester_id}`, r.requester_id, "reject", "Request declined")
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Outgoing Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {outgoing.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No pending outgoing requests.</p>
                ) : (
                  <div className="space-y-2">
                    {outgoing.map((r) => (
                      <ConnectionCard
                        key={r.id}
                        request={r}
                        perspective="outgoing"
                        currentUserId={currentUserId!}
                        isBusy={busyKey === `cancel:${r.target_id}`}
                        onRevoke={() =>
                          void runAction(`cancel:${r.target_id}`, r.target_id, "cancel", "Request cancelled")
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accepted" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Connections</CardTitle>
              </CardHeader>
              <CardContent>
                {accepted.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No active connections.</p>
                ) : (
                  <div className="space-y-2">
                    {accepted.map((r) => {
                      const otherId =
                        r.requester_id === currentUserId ? r.target_id : r.requester_id
                      return (
                        <ConnectionCard
                          key={r.id}
                          request={r}
                          perspective="accepted"
                          currentUserId={currentUserId!}
                          isBusy={busyKey === `remove:${otherId}`}
                          onRevoke={() =>
                            void runAction(`remove:${otherId}`, otherId, "remove", "Connection removed")
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
