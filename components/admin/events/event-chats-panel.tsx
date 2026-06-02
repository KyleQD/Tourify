"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageCircle, Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"

interface EventChatsPanelProps {
  eventId: string
}

interface GroupRow {
  id: string
  name: string
  description?: string | null
  group_type?: string
}

interface MessageRow {
  id: string
  group_id: string
  content: string
  sender_id: string
  created_at: string
}

interface SenderProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function EventChatsPanel({ eventId }: EventChatsPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [senders, setSenders] = useState<Map<string, SenderProfile>>(new Map())
  const sendersRef = useRef(senders)
  sendersRef.current = senders
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const ensureSenderProfile = useCallback(async (senderId: string) => {
    if (sendersRef.current.has(senderId)) return
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", senderId)
      .maybeSingle()
    if (!data) return
    setSenders((prev) => {
      if (prev.has(senderId)) return prev
      const next = new Map(prev)
      next.set(senderId, { id: data.id, full_name: data.full_name, avatar_url: data.avatar_url })
      return next
    })
  }, [])

  const hydrateSenders = useCallback(
    async (rows: MessageRow[]) => {
      const unique = Array.from(new Set(rows.map((row) => row.sender_id))).filter(
        (id) => !sendersRef.current.has(id),
      )
      if (unique.length === 0) return
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", unique)
      if (!data) return
      setSenders((prev) => {
        const next = new Map(prev)
        data.forEach((row: SenderProfile) => next.set(row.id, row))
        return next
      })
    },
    [],
  )

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/group-chats`, { credentials: "include" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load chats")
      const list = (json.groups || []) as GroupRow[]
      setGroups(list)
      setSelectedId((prev) => prev || (list[0]?.id ?? null))
    } catch (e) {
      toast({
        title: "Chats unavailable",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [eventId, toast])

  const loadMessages = useCallback(
    async (groupId: string) => {
      setMsgLoading(true)
      try {
        const res = await fetch(
          `/api/admin/events/${eventId}/group-chats?messages=true&groupId=${encodeURIComponent(groupId)}&limit=80`,
          { credentials: "include" },
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to load messages")
        const list = (json.messages || []) as MessageRow[]
        setMessages(list)
        await hydrateSenders(list)
      } catch {
        setMessages([])
      } finally {
        setMsgLoading(false)
      }
    },
    [eventId, hydrateSenders],
  )

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId)
  }, [selectedId, loadMessages])

  useEffect(() => {
    if (!eventId) return
    // Single user-scoped channel per event covers all of its groups; route messages
    // into the open chat client-side rather than tearing down + re-subscribing each
    // time the user switches groups.
    const channel = supabase
      .channel(`event-${eventId}-group-messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_group_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRow
          setMessages((prev) => {
            if (incoming.group_id !== selectedId) return prev
            if (prev.some((message) => message.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          if (!sendersRef.current.has(incoming.sender_id)) {
            void ensureSenderProfile(incoming.sender_id)
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, selectedId, ensureSenderProfile])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const gid = selectedId
    const text = draft.trim()
    if (!gid || !text) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/group-chats`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: gid, content: text, message_type: "text" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Send failed")
      setDraft("")
      if (json.message) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === json.message.id)) return prev
          return [...prev, json.message as MessageRow]
        })
      }
    } catch (e) {
      toast({
        title: "Message not sent",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const renderedMessages = useMemo(() => messages, [messages])

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-600" />
        <p>No group chats for this event yet.</p>
        <p className="mt-2 text-xs text-slate-500">Create a group from admin event communication settings when available.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-slate-800 bg-slate-900/80 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-200">Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedId(group.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === group.id ? "bg-purple-600/30 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="font-medium">{group.name}</span>
              {group.group_type ? (
                <span className="ml-2 text-xs text-slate-500 capitalize">{group.group_type}</span>
              ) : null}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="border-slate-800 bg-slate-900/80 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-200">Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[280px] flex-col gap-3">
          <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-3 max-h-[360px]">
            {msgLoading ? (
              <div className="flex justify-center py-8 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : renderedMessages.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-8">No messages yet. Say hello.</p>
            ) : (
              renderedMessages.map((message) => {
                const sender = senders.get(message.sender_id)
                const displayName =
                  sender?.full_name?.trim() || `User ${message.sender_id.slice(0, 6)}`
                return (
                  <div key={message.id} className="flex items-start gap-2 rounded-md bg-slate-900/80 px-3 py-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={sender?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-slate-700 text-slate-200 text-[10px]">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200">{displayName}</span>
                        <span className="text-[11px] text-slate-500">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              className="min-h-[72px] flex-1 border-slate-700 bg-slate-950 text-slate-100"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim() || !selectedId}
              className="shrink-0 bg-purple-600 hover:bg-purple-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
