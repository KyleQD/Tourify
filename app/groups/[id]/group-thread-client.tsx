"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmojiPicker } from "@/components/venue/social/emoji-picker"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { ArrowLeft, Loader2, Search, Send, Settings2, SmilePlus, UserPlus, Users, X } from "lucide-react"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "👀"]

interface GroupMessageSender {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
}

interface MessageReaction {
  emoji: string
  count: number
  user_ids: string[]
}

interface GroupMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string
  message_type: string
  mentions: string[]
  created_at: string
  reactions: MessageReaction[]
  sender?: GroupMessageSender | null
}

interface ThreadSummary {
  id: string
  name: string
  description: string | null
  thread_type: string
  created_by: string
  is_admin_only: boolean
  updated_at: string
}

interface GroupMemberProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url?: string | null
}

interface GroupMember {
  user_id: string
  role: string
  joined_at: string
  profile: GroupMemberProfile | null
}

interface UserSearchResult extends GroupMemberProfile {}

export function GroupThreadClient({ threadId }: { threadId: string }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [thread, setThread] = useState<ThreadSummary | null>(null)
  const [membership, setMembership] = useState<{ role: string } | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [reactionPicker, setReactionPicker] = useState<string | null>(null) // messageId with open picker
  const [members, setMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState("")
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([])
  const [memberAction, setMemberAction] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const canManageMembers = membership?.role === "owner" || membership?.role === "admin"
  const isOwner = membership?.role === "owner"

  const loadThread = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/threads/${threadId}`, { credentials: "include" })
      if (!response.ok) {
        if (response.status === 403 || response.status === 404) router.replace("/groups")
        return
      }
      const data = await response.json()
      setThread(data.thread)
      setMembership(data.membership)
    } catch (error) {
      console.error("Group thread load error:", error)
    }
  }, [threadId, router])

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/groups/threads/${threadId}/messages?limit=50`, {
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Failed to load group messages")
        return
      }
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("Group messages load error:", error)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      // Member reads are still scoped by the database's active-membership RLS policy.
      const { data: memberRows, error: memberError } = await supabase
        .from("thread_members")
        .select("user_id, role, joined_at")
        .eq("thread_id", threadId)
        .is("left_at", null)
        .order("joined_at", { ascending: true })

      if (memberError) throw memberError
      const ids = (memberRows || []).map((member) => member.user_id)
      const { data: profiles, error: profilesError } = ids.length
        ? await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids)
        : { data: [], error: null }
      if (profilesError) throw profilesError

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
      setMembers(
        (memberRows || []).map((member) => ({
          ...member,
          profile: profileMap.get(member.user_id) || null,
        })),
      )
    } catch (error) {
      console.error("Group members load error:", error)
      toast.error("Failed to load group members")
    } finally {
      setMembersLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    if (!isAuthenticated) return
    void loadThread()
    void loadMessages()
    void loadMembers()
  }, [isAuthenticated, loadThread, loadMessages, loadMembers])

  useEffect(() => {
    if (!canManageMembers || !showMembers || memberSearch.trim().length < 2) {
      setMemberResults([])
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/messages/user-search?q=${encodeURIComponent(memberSearch.trim())}`, {
          credentials: "include",
          signal: controller.signal,
        })
        if (!response.ok) return
        const data = await response.json()
        setMemberResults(data.users || [])
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error("Group member search error:", error)
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [canManageMembers, memberSearch, showMembers])

  // Real-time: new messages
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`group-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const incoming = payload.new as GroupMessage
          if (incoming.sender_id === user.id) return
          setMessages((prev) => [...prev, { ...incoming, reactions: incoming.reactions ?? [] }])
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [threadId, user])

  // Real-time: reaction changes (INSERT / DELETE on group_message_reactions)
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`group-reactions-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_message_reactions",
        },
        () => {
          // Re-fetch messages to get fresh aggregated reactions
          void loadMessages()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [threadId, user, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setDraft("")
    try {
      const response = await fetch(`/api/groups/threads/${threadId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || "Failed to send message")
        setDraft(content)
        return
      }
      const data = await response.json()
      setMessages((prev) => [...prev, { ...data.message, reactions: data.message.reactions ?? [] }])
    } catch (error) {
      console.error("Group send error:", error)
      toast.error("Failed to send message")
      setDraft(content)
    } finally {
      setSending(false)
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!user) return

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const reactions = m.reactions ? [...m.reactions] : []
        const idx = reactions.findIndex((r) => r.emoji === emoji)
        if (idx >= 0) {
          const r = reactions[idx]
          if (r.user_ids.includes(user.id)) {
            // Remove
            const newUserIds = r.user_ids.filter((id) => id !== user.id)
            if (newUserIds.length === 0) reactions.splice(idx, 1)
            else reactions[idx] = { ...r, count: r.count - 1, user_ids: newUserIds }
          } else {
            // Add to existing emoji group
            reactions[idx] = { ...r, count: r.count + 1, user_ids: [...r.user_ids, user.id] }
          }
        } else {
          // New emoji
          reactions.push({ emoji, count: 1, user_ids: [user.id] })
        }
        return { ...m, reactions }
      }),
    )

    setReactionPicker(null)

    try {
      const response = await fetch(`/api/groups/threads/${threadId}/messages/${messageId}/reactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!response.ok) throw new Error("Reaction update failed")
    } catch {
      // Revert optimistic update on failure
      void loadMessages()
    }
  }

  async function addMember(member: UserSearchResult) {
    if (!canManageMembers || memberAction) return
    setMemberAction(`add:${member.id}`)
    try {
      const response = await fetch(`/api/groups/threads/${threadId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_ids: [member.id] }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to add member")
      toast.success(`${member.full_name || `@${member.username}`} added to the group`)
      setMemberSearch("")
      setMemberResults([])
      await loadMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member")
    } finally {
      setMemberAction(null)
    }
  }

  async function updateMemberRole(member: GroupMember, role: "owner" | "admin" | "member") {
    if (!isOwner || memberAction || member.role === role) return
    setMemberAction(`role:${member.user_id}`)
    try {
      const response = await fetch(`/api/groups/threads/${threadId}/members`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: member.user_id, role }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to update role")
      toast.success("Member role updated")
      await loadMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    } finally {
      setMemberAction(null)
    }
  }

  async function removeMember(member: GroupMember) {
    const isSelf = member.user_id === user?.id
    if ((!canManageMembers && !isSelf) || memberAction) return
    setMemberAction(`remove:${member.user_id}`)
    try {
      const response = await fetch(`/api/groups/threads/${threadId}/members?user_id=${member.user_id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to leave group")
      if (isSelf) {
        router.push("/groups")
        return
      }
      toast.success("Member removed")
      await loadMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update membership")
    } finally {
      setMemberAction(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <Card className="bg-slate-900/70 border-slate-700/60">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Sign in to view this group</h2>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto h-screen max-w-6xl">
        <div className="flex h-full flex-col bg-slate-900/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/groups")}
              className="text-slate-300 hover:bg-slate-800"
              aria-label="Back to groups"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{thread?.name || "Group thread"}</h1>
              {thread?.description && (
                <p className="text-xs text-slate-400 truncate">{thread.description}</p>
              )}
            </div>
            <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              {thread?.thread_type === "logistics" ? "Logistics" : thread?.thread_type || "group"}
            </Badge>
            {membership?.role && (
              <Badge className="bg-slate-700/60 text-slate-200 text-[10px]">{membership.role}</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMembers((visible) => !visible)}
              className="ml-auto border-slate-600 text-slate-200 hover:bg-slate-800"
              aria-expanded={showMembers}
            >
              <Users className="mr-1.5 h-4 w-4" /> Members {members.length ? `(${members.length})` : ""}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Community feed */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Community feed</p>
                  <p className="text-xs text-slate-500">Share updates, questions, and ideas with the group.</p>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-400">{messages.length} loaded</Badge>
              </div>
              <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Be the first to say something.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id
                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start")}
                    >
                      {!isOwn && (
                        <Avatar className="h-7 w-7 mt-1 shrink-0">
                          <AvatarImage src={message.sender?.avatar_url || ""} />
                          <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                            {(message.sender?.full_name ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={cn("max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                        {!isOwn && (
                          <p className="text-[11px] text-slate-400 mb-0.5">
                            {message.sender?.full_name || `@${message.sender?.username ?? "user"}`}
                          </p>
                        )}

                        <div
                          className={cn(
                            "p-3 rounded-2xl text-sm whitespace-pre-wrap break-words",
                            isOwn
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                              : "bg-slate-700 text-white",
                          )}
                        >
                          {message.content}
                        </div>

                        {/* Reactions row */}
                        <div className={cn("flex flex-wrap items-center gap-1 mt-1", isOwn && "justify-end")}>
                          {(message.reactions ?? []).map((r) => {
                            const myReaction = user && r.user_ids.includes(user.id)
                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={() => toggleReaction(message.id, r.emoji)}
                                className={cn(
                                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] border transition-colors",
                                  myReaction
                                    ? "bg-purple-600/30 border-purple-500/50 text-purple-200"
                                    : "bg-slate-700/60 border-slate-600/40 text-slate-300 hover:bg-slate-700",
                                )}
                                title={r.user_ids.length > 0 ? `${r.user_ids.length} reaction${r.user_ids.length > 1 ? "s" : ""}` : ""}
                              >
                                {r.emoji} <span className="text-slate-400 text-[10px]">{r.count}</span>
                              </button>
                            )
                          })}

                          {/* Add reaction button — visible on hover */}
                          <Popover
                            open={reactionPicker === message.id}
                            onOpenChange={(open) => setReactionPicker(open ? message.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                aria-label="Add reaction"
                              >
                                <SmilePlus className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align={isOwn ? "end" : "start"}
                              className="p-2 border-slate-700 bg-slate-900 w-auto"
                            >
                              {/* Quick reactions */}
                              <div className="flex gap-1 mb-2">
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleReaction(message.id, emoji)}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-700 text-lg transition-colors"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              {/* Full emoji picker */}
                              <EmojiPicker
                                onEmojiSelect={(emoji) => toggleReaction(message.id, emoji)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 text-right">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
            )}
              </ScrollArea>

              {/* Compose */}
              <div className="flex gap-3 border-t border-slate-700/60 p-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder-slate-400 resize-none"
              disabled={sending}
            />
            <Button
              onClick={() => void sendMessage()}
              disabled={sending || !draft.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
              </div>
            </div>

            <aside className={cn("w-full shrink-0 border-l border-slate-700/60 bg-slate-950/20 md:flex md:w-80 md:flex-col", showMembers ? "flex" : "hidden")}>
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-300" />
                  <h2 className="font-medium text-white">Members</h2>
                  <Badge className="ml-auto bg-slate-800 text-slate-300">{members.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">People with access to this community.</p>
              </div>

              {canManageMembers && (
                <div className="border-b border-slate-800 p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="Add someone by name"
                      aria-label="Search for a member to add"
                      className="border-slate-700 bg-slate-900 pl-9 text-sm text-white placeholder:text-slate-500"
                    />
                  </div>
                  {memberResults.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                      {memberResults
                        .filter((result) => !members.some((member) => member.user_id === result.id))
                        .slice(0, 5)
                        .map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => void addMember(result)}
                            disabled={memberAction !== null}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 disabled:opacity-50"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={result.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-xs text-white">{result.full_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{result.full_name || `@${result.username}`}</span>
                            {memberAction === `add:${result.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-300" /> : <UserPlus className="h-3.5 w-3.5 text-slate-500" />}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1 p-3">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
                ) : members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No active members found.</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((member) => {
                      const name = member.profile?.full_name || `@${member.profile?.username || "member"}`
                      const isSelf = member.user_id === user?.id
                      return (
                        <div key={member.user_id} className="rounded-lg p-2 hover:bg-slate-900/70">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-xs text-white">{name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-slate-200">{name}{isSelf ? " (you)" : ""}</p>
                              <p className="truncate text-[11px] text-slate-500">@{member.profile?.username || "member"}</p>
                            </div>
                            {isOwner ? (
                              <select
                                value={member.role}
                                onChange={(event) => void updateMemberRole(member, event.target.value as "owner" | "admin" | "member")}
                                disabled={memberAction !== null}
                                aria-label={`Role for ${name}`}
                                className="max-w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-300"
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>
                            ) : (
                              <Badge variant="outline" className="border-slate-700 text-[10px] text-slate-400">{member.role}</Badge>
                            )}
                          </div>
                          {(isSelf || canManageMembers) && (
                            <button
                              type="button"
                              onClick={() => void removeMember(member)}
                              disabled={memberAction !== null || (member.role === "owner" && members.filter((item) => item.role === "owner").length <= 1)}
                              className="mt-1 flex w-full items-center justify-end gap-1 text-[11px] text-slate-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {memberAction === `remove:${member.user_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                              {isSelf ? "Leave group" : "Remove"}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
              <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
                <div className="flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" /> Owners manage roles; admins manage membership.</div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
