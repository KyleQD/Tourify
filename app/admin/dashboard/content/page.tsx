"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText, CheckCircle, XCircle, Flag, Eye, EyeOff, Loader2, RefreshCw,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type ModerationStatus = 'all' | 'approved' | 'pending' | 'flagged' | 'removed'

interface ContentItem {
  id: string
  content: string | null
  created_at: string
  user_id: string
  moderation_status: string
  is_visible: boolean
  author_name?: string
}

interface MusicItem {
  id: string
  title: string | null
  genre: string | null
  created_at: string
  user_id: string
  moderation_status: string
  is_visible: boolean
  author_name?: string
}

function ModerationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Approved', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { label: 'Pending', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    flagged: { label: 'Flagged', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    removed: { label: 'Removed', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const entry = map[status] || { label: status, cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  return <Badge className={`text-xs ${entry.cls}`}>{entry.label}</Badge>
}

async function moderateItem(id: string, table: 'posts' | 'artist_music', updates: Record<string, any>) {
  const res = await fetch(`/api/admin/content/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, table }),
  })
  if (!res.ok) {
    const d = await res.json()
    throw new Error(d?.error || 'Moderation failed')
  }
  return res.json()
}

export default function ContentPage() {
  const [posts, setPosts] = useState<ContentItem[]>([])
  const [music, setMusic] = useState<MusicItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [moderationFilter, setModerationFilter] = useState<ModerationStatus>('all')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [postsRes, musicRes] = await Promise.allSettled([
        fetch('/api/admin/content/posts', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/content/music', { credentials: 'include', cache: 'no-store' }),
      ])

      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const d = await postsRes.value.json()
        setPosts(d.items || [])
      }
      if (musicRes.status === 'fulfilled' && musicRes.value.ok) {
        const d = await musicRes.value.json()
        setMusic(d.items || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handlePostModeration(id: string, updates: Record<string, any>) {
    try {
      await moderateItem(id, 'posts', updates)
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      toast.success('Post updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleMusicModeration(id: string, updates: Record<string, any>) {
    try {
      await moderateItem(id, 'artist_music', updates)
      setMusic(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
      toast.success('Track updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function filterItems<T extends { moderation_status: string }>(items: T[]): T[] {
    if (moderationFilter === 'all') return items
    return items.filter(i => i.moderation_status === moderationFilter)
  }

  const filteredPosts = filterItems(posts)
  const filteredMusic = filterItems(music)

  const ModerationActions = ({
    id,
    status,
    isVisible,
    table,
    onUpdate,
  }: {
    id: string
    status: string
    isVisible: boolean
    table: 'posts' | 'artist_music'
    onUpdate: (id: string, updates: Record<string, any>) => void
  }) => (
    <div className="flex items-center gap-1 flex-wrap">
      {status !== 'approved' && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs"
          onClick={() => onUpdate(id, { moderation_status: 'approved', is_visible: true })}>
          <CheckCircle className="h-3 w-3 mr-1" /> Approve
        </Button>
      )}
      {status !== 'flagged' && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs"
          onClick={() => onUpdate(id, { moderation_status: 'flagged' })}>
          <Flag className="h-3 w-3 mr-1" /> Flag
        </Button>
      )}
      {status !== 'removed' && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
          onClick={() => onUpdate(id, { moderation_status: 'removed', is_visible: false })}>
          <XCircle className="h-3 w-3 mr-1" /> Remove
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-white text-xs"
        onClick={() => onUpdate(id, { is_visible: !isVisible })}>
        {isVisible ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
        {isVisible ? 'Hide' : 'Show'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Review and moderate feed posts and artist tracks"
        icon={FileText}
        actions={
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <span className="text-slate-400 text-sm">Filter by status:</span>
          <Select value={moderationFilter} onValueChange={v => setModerationFilter(v as ModerationStatus)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({posts.length + music.length})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-500 text-xs ml-auto">
            {filteredPosts.length} posts · {filteredMusic.length} tracks shown
          </span>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="posts">
          <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1">
            <TabsTrigger value="posts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Feed Posts ({filteredPosts.length})
            </TabsTrigger>
            <TabsTrigger value="music" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
              Artist Tracks ({filteredMusic.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Feed Posts</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPosts.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No posts match current filter.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredPosts.map(post => (
                      <div key={post.id} className={`rounded-sm border p-3 transition-colors ${!post.is_visible ? 'opacity-50 border-red-700/30 bg-red-950/10' : 'border-slate-700/50 bg-slate-800/50'}`}>
                        <p className="text-sm text-slate-200 line-clamp-2">{post.content || '(no content)'}</p>
                        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ModerationBadge status={post.moderation_status} />
                            {!post.is_visible && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Hidden</Badge>}
                            <span className="text-xs text-slate-500">
                              {post.author_name || `User ${post.user_id.slice(0, 8)}`} ·{' '}
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <ModerationActions
                            id={post.id}
                            status={post.moderation_status}
                            isVisible={post.is_visible}
                            table="posts"
                            onUpdate={handlePostModeration}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="music" className="mt-4">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Artist Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredMusic.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No tracks match current filter.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMusic.map(track => (
                      <div key={track.id} className={`rounded-sm border p-3 transition-colors ${!track.is_visible ? 'opacity-50 border-red-700/30 bg-red-950/10' : 'border-slate-700/50 bg-slate-800/50'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{track.title || 'Untitled Track'}</p>
                            {track.genre && <p className="text-xs text-slate-400">{track.genre}</p>}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ModerationBadge status={track.moderation_status} />
                            {!track.is_visible && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Hidden</Badge>}
                            <span className="text-xs text-slate-500">
                              {track.author_name || `User ${track.user_id.slice(0, 8)}`} ·{' '}
                              {formatDistanceToNow(new Date(track.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <ModerationActions
                            id={track.id}
                            status={track.moderation_status}
                            isVisible={track.is_visible}
                            table="artist_music"
                            onUpdate={handleMusicModeration}
                          />
                        </div>
                      </div>
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
