"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { AdminStatCard } from "../components/admin-stat-card"
import { formatDistanceToNow } from "date-fns"

interface FollowRequest {
  id: string
  requester_id: string
  target_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at: string
  requester?: { full_name: string | null; username: string | null; avatar_url: string | null }
  target?: { full_name: string | null; username: string | null; avatar_url: string | null }
}

function ConnectionCard({
  request,
  perspective,
  onApprove,
  onDecline,
  onRevoke,
}: {
  request: FollowRequest
  perspective: 'incoming' | 'outgoing' | 'accepted'
  onApprove?: () => void
  onDecline?: () => void
  onRevoke?: () => void
}) {
  const profile = perspective === 'incoming' ? request.requester : request.target
  const displayName = profile?.full_name || profile?.username || 'Unknown user'
  const avatarUrl = profile?.avatar_url

  return (
    <div className="flex items-center justify-between p-3 rounded-sm bg-slate-800/50 hover:bg-slate-800 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs bg-purple-600/20 text-purple-400">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-white text-sm font-medium">{displayName}</p>
          <p className="text-slate-400 text-xs">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {perspective === 'incoming' && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-3" onClick={onApprove}>
              <Check className="h-3.5 w-3.5 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400 h-8 px-3" onClick={onDecline}>
              <X className="h-3.5 w-3.5 mr-1" /> Decline
            </Button>
          </>
        )}
        {perspective === 'outgoing' && (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-400 h-8 px-3" onClick={onRevoke}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        )}
        {perspective === 'accepted' && (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400 h-8 px-3" onClick={onRevoke}>
            <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}

export default function NetworkPage() {
  const supabase = supabaseClient
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: rows, error } = await supabase
        .from('follow_requests')
        .select('id, requester_id, target_id, status, created_at')
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const allUserIds = [...new Set([
        ...(rows || []).map((r: any) => r.requester_id),
        ...(rows || []).map((r: any) => r.target_id),
      ])]

      let profileMap: Record<string, any> = {}
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', allUserIds)
        ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
      }

      setRequests((rows || []).map((r: any) => ({
        ...r,
        requester: profileMap[r.requester_id] || null,
        target: profileMap[r.target_id] || null,
      })))
    } catch (err: any) {
      toast.error(err.message || 'Failed to load connections')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: 'accepted' | 'rejected' | 'cancelled') {
    const { error } = await supabase
      .from('follow_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error(error.message); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    toast.success(status === 'accepted' ? 'Connection accepted' : 'Connection removed')
  }

  const filtered = requests.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    const requesterName = r.requester?.full_name || r.requester?.username || ''
    const targetName = r.target?.full_name || r.target?.username || ''
    return requesterName.toLowerCase().includes(q) || targetName.toLowerCase().includes(q)
  })

  const incoming = filtered.filter(r => r.target_id === currentUserId && r.status === 'pending')
  const outgoing = filtered.filter(r => r.requester_id === currentUserId && r.status === 'pending')
  const accepted = filtered.filter(r => r.status === 'accepted')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Connections"
        subtitle="Manage your network connections and collaboration requests"
        icon={Link2}
        actions={
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Incoming Requests" value={incoming.length} icon={Link2} color="purple" size="default" />
        <AdminStatCard title="Outgoing Requests" value={outgoing.length} icon={Link2} color="blue" size="default" />
        <AdminStatCard title="Connections" value={accepted.length} icon={Link2} color="green" size="default" />
        <AdminStatCard title="Total" value={requests.length} icon={Link2} color="amber" size="default" />
      </div>

      {/* Search */}
      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search connections by name..."
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
        <Tabs defaultValue="incoming">
          <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1">
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
                    {incoming.map(r => (
                      <ConnectionCard
                        key={r.id}
                        request={r}
                        perspective="incoming"
                        onApprove={() => updateStatus(r.id, 'accepted')}
                        onDecline={() => updateStatus(r.id, 'rejected')}
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
                    {outgoing.map(r => (
                      <ConnectionCard
                        key={r.id}
                        request={r}
                        perspective="outgoing"
                        onRevoke={() => updateStatus(r.id, 'cancelled')}
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
                    {accepted.map(r => (
                      <ConnectionCard
                        key={r.id}
                        request={r}
                        perspective="accepted"
                        onRevoke={() => updateStatus(r.id, 'cancelled')}
                      />
                    ))}
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
