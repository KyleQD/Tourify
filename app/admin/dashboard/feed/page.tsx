"use client"

import { useState, useEffect, useCallback } from "react"
import supabaseClient from "@/lib/supabase/client"
import { toast } from "sonner"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Rss, CheckCircle, XCircle, Flag, Pin, PinOff, Plus, Loader2, RefreshCw, BarChart3,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { PollOptionEditor } from "@/components/polls/poll-option-editor"

type ModerationFilter = 'all' | 'flagged' | 'pinned'

interface Post {
  id: string
  user_id: string
  content: string | null
  created_at: string
  moderation_status: string
  is_visible: boolean
  is_pinned: boolean
  author_name?: string
  author_avatar?: string
}

export default function FeedPage() {
  const supabase = supabaseClient
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<ModerationFilter>('all')
  const [isComposing, setIsComposing] = useState(false)
  const [composeText, setComposeText] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [composeMode, setComposeMode] = useState<'announcement' | 'poll'>('announcement')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollDuration, setPollDuration] = useState<'1d' | '3d' | '7d' | '14d'>('7d')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: postRows, error } = await supabase
        .from('posts')
        .select('id, user_id, content, created_at, moderation_status, is_visible, is_pinned')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const rows = (postRows || []) as any[]
      const userIds = [...new Set(rows.map((p: any) => p.user_id).filter(Boolean))]

      let profileMap: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds)
        ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
      }

      setPosts(rows.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        created_at: p.created_at,
        moderation_status: p.moderation_status || 'approved',
        is_visible: p.is_visible ?? true,
        is_pinned: p.is_pinned ?? false,
        author_name: profileMap[p.user_id]?.full_name || profileMap[p.user_id]?.username || 'Unknown',
        author_avatar: profileMap[p.user_id]?.avatar_url || null,
      })))
    } catch (err: any) {
      toast.error(err.message || 'Failed to load feed')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function moderatePost(id: string, updates: Record<string, any>) {
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, table: 'posts' }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error || 'Failed')
      }
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      toast.success('Post updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function composeAnnouncement() {
    if (!composeText.trim()) return
    setIsPosting(true)
    try {
      if (composeMode === 'poll') {
        const validOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
        if (validOptions.length < 2) throw new Error('Add at least two poll options')

        const res = await fetch('/api/posts/create', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: composeText.trim(),
            type: 'poll',
            visibility: 'followers',
            poll_options: validOptions,
            poll_duration: pollDuration,
          }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to create poll')
        toast.success('Poll posted to followers')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { error } = await supabase
          .from('posts')
          .insert({ user_id: user.id, content: composeText.trim(), is_visible: true, moderation_status: 'approved' })
        if (error) throw error
        toast.success('Announcement posted')
      }
      setComposeText("")
      setPollOptions(['', ''])
      setComposeMode('announcement')
      setIsComposing(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to post')
    } finally {
      setIsPosting(false)
    }
  }

  const filteredPosts = posts.filter(p => {
    if (filter === 'flagged') return p.moderation_status === 'flagged'
    if (filter === 'pinned') return p.is_pinned
    return true
  })

  const flaggedCount = posts.filter(p => p.moderation_status === 'flagged').length
  const pinnedCount = posts.filter(p => p.is_pinned).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feed"
        subtitle="Activity from your organizer network"
        icon={Rss}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0" onClick={() => setIsComposing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 text-sm">Filter:</span>
          <Select value={filter} onValueChange={v => setFilter(v as ModerationFilter)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts ({posts.length})</SelectItem>
              <SelectItem value="flagged">Flagged ({flaggedCount})</SelectItem>
              <SelectItem value="pinned">Pinned ({pinnedCount})</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-500 text-xs ml-auto">
            Showing {filteredPosts.length} of {posts.length} posts
          </span>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Rss className="h-10 w-10 text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm">No posts match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <Card key={post.id} className={`bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm transition-opacity ${!post.is_visible ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={post.author_avatar || undefined} />
                    <AvatarFallback className="text-xs bg-purple-600/20 text-purple-400">
                      {(post.author_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{post.author_name}</span>
                      {post.is_pinned && <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                      {post.moderation_status === 'flagged' && <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>}
                      {post.moderation_status === 'removed' && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Removed</Badge>}
                      {!post.is_visible && <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Hidden</Badge>}
                      <span className="text-xs text-slate-500 ml-auto">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {post.content || ''}
                    </p>

                    {/* Moderation actions */}
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-800 flex-wrap">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs"
                        onClick={() => moderatePost(post.id, { is_pinned: !post.is_pinned })}>
                        {post.is_pinned ? <PinOff className="h-3 w-3 mr-1" /> : <Pin className="h-3 w-3 mr-1" />}
                        {post.is_pinned ? 'Unpin' : 'Pin'}
                      </Button>
                      {post.moderation_status !== 'flagged' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs"
                          onClick={() => moderatePost(post.id, { moderation_status: 'flagged' })}>
                          <Flag className="h-3 w-3 mr-1" /> Flag
                        </Button>
                      )}
                      {post.moderation_status !== 'approved' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs"
                          onClick={() => moderatePost(post.id, { moderation_status: 'approved', is_visible: true })}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      )}
                      {post.moderation_status !== 'removed' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                          onClick={() => moderatePost(post.id, { moderation_status: 'removed', is_visible: false })}>
                          <XCircle className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Rss className="h-5 w-5 text-purple-400" />
              {composeMode === 'poll' ? 'Create Follower Poll' : 'Compose Announcement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={composeMode === 'announcement' ? 'secondary' : 'outline'}
                className="border-slate-700"
                onClick={() => setComposeMode('announcement')}
              >
                Announcement
              </Button>
              <Button
                size="sm"
                variant={composeMode === 'poll' ? 'secondary' : 'outline'}
                className="border-slate-700"
                onClick={() => setComposeMode('poll')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Poll
              </Button>
            </div>
            <Textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder={composeMode === 'poll' ? 'Ask your followers a question...' : 'Write an announcement for your network...'}
              className="bg-slate-800/50 border-slate-700/50 text-white min-h-[120px] resize-none"
            />
            {composeMode === 'poll' && (
              <PollOptionEditor
                options={pollOptions}
                duration={pollDuration}
                onOptionsChange={setPollOptions}
                onDurationChange={setPollDuration}
              />
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{composeText.length} characters</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={() => { setComposeText(""); setPollOptions(['', '']); setComposeMode('announcement'); setIsComposing(false) }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !composeText.trim()
                    || isPosting
                    || (composeMode === 'poll' && pollOptions.filter((option) => option.trim()).length < 2)
                  }
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
                  onClick={composeAnnouncement}
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {composeMode === 'poll' ? 'Create Poll' : 'Post Announcement'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
