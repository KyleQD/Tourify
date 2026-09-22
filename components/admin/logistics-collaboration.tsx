"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageSquare, Send, Loader2, ExternalLink, Users, Clock, Megaphone,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  created_at: string
  reactions: MessageReaction[]
  sender?: {
    id: string
    username?: string
    full_name?: string
    avatar_url?: string | null
  } | null
}

interface LogisticsCollaborationProps {
  eventId?: string
  tourId?: string
  eventName?: string
  /** True when the current user is the event creator */
  isOwner?: boolean
  /** Existing group_threads id for this event, if already provisioned */
  threadId?: string
  /** Called after a new thread is provisioned so the parent can cache the id */
  onThreadProvisioned?: (threadId: string) => void
}

export function LogisticsCollaboration({
  eventId,
  tourId,
  eventName,
  isOwner = false,
  threadId: initialThreadId,
  onThreadProvisioned,
}: LogisticsCollaborationProps) {
  const router = useRouter()
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep threadId in sync if the parent resolves it asynchronously
  useEffect(() => {
    setThreadId(initialThreadId)
  }, [initialThreadId])

  const fetchMessages = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/threads/${id}/messages?limit=5`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setMessages((data.messages ?? []).slice(-5))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (threadId) void fetchMessages(threadId)
    else setMessages([])
  }, [threadId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleProvision() {
    if (!eventId) return
    setProvisioning(true)
    try {
      const res = await fetch("/api/admin/logistics/comms-thread", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, event_name: eventName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to start thread")
      }
      const data = await res.json()
      setThreadId(data.threadId)
      onThreadProvisioned?.(data.threadId)
      toast.success(
        data.isNew
          ? `Thread created — ${data.memberCount} team members added`
          : "Team thread opened",
      )
      void fetchMessages(data.threadId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start thread")
    } finally {
      setProvisioning(false)
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if (!content || !threadId || sending) return
    setSending(true)
    setDraft("")
    try {
      const res = await fetch(`/api/groups/threads/${threadId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, message_type: "announcement" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to send")
      }
      const data = await res.json()
      setMessages((prev) => [...prev.slice(-4), data.message])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message")
      setDraft(content)
    } finally {
      setSending(false)
    }
  }

  // ── No event selected ──────────────────────────────────────────────────────
  if (!eventId) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <MessageSquare className="h-8 w-8 text-slate-600" />
          <p className="text-slate-400 text-sm">Select an event to use Team Comms.</p>
        </CardContent>
      </Card>
    )
  }

  // ── Event selected but no thread yet ──────────────────────────────────────
  if (!threadId) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-purple-400" />
            Team Comms
            {eventName && (
              <span className="text-slate-400 font-normal">— {eventName}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <Users className="h-10 w-10 text-slate-600" />
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium mb-1">No team thread yet</p>
            <p className="text-slate-500 text-xs max-w-xs">
              {isOwner
                ? "Start a thread to broadcast announcements to all assigned team members. They'll see it in their Work tab inbox."
                : "The event owner hasn't started a team thread yet."}
            </p>
          </div>
          {isOwner && (
            <Button
              onClick={handleProvision}
              disabled={provisioning}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
            >
              {provisioning ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Starting…</>
              ) : (
                <><Megaphone className="h-4 w-4 mr-2" />Start Team Comms Thread</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Thread exists — show preview + compose (owners) ───────────────────────
  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-white text-sm flex items-center gap-2 min-w-0">
            <Megaphone className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="truncate">
              {eventName ? `${eventName} — Team Comms` : "Team Comms"}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/groups/${threadId}`)}
            className="text-slate-400 hover:text-white shrink-0 h-7 px-2 text-[11px] gap-1"
          >
            Open Full Chat <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {/* Message preview — last 5 messages */}
      <CardContent className="flex-1 space-y-3 px-4 pb-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-7 w-7 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-xs">
              {isOwner ? "Post the first announcement below." : "No messages yet."}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = false // preview shows all messages the same — full chat handles own styling
            return (
              <div key={m.id} className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.sender?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-purple-600/20 text-purple-300 text-[10px]">
                    {(m.sender?.full_name ?? m.sender?.username ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-300 text-xs font-medium truncate">
                      {m.sender?.full_name ?? m.sender?.username ?? "Team member"}
                    </span>
                    {m.message_type === "announcement" && (
                      <Badge className="bg-purple-500/20 text-purple-300 text-[9px] px-1 py-0 h-4 shrink-0">
                        announcement
                      </Badge>
                    )}
                    <span className="text-slate-600 text-[10px] flex items-center gap-0.5 shrink-0 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                  {m.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.reactions.map((r) => (
                        <span
                          key={r.emoji}
                          className="inline-flex items-center gap-0.5 bg-slate-700/60 rounded-full px-1.5 py-0.5 text-[11px] text-slate-300"
                        >
                          {r.emoji} <span className="text-slate-400">{r.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </CardContent>

      {/* Compose — owners only */}
      {isOwner ? (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Broadcast an announcement to the team…"
              className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSend()
              }}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 self-end h-9 w-9 p-0 shrink-0"
              aria-label="Send announcement"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-slate-600 text-[10px] mt-1">
            Cmd+Enter to send · posts to team thread &amp; all member inboxes
          </p>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1.5",
            )}
            onClick={() => router.push(`/groups/${threadId}`)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Open Full Chat to Reply
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        </div>
      )}
    </Card>
  )
}
