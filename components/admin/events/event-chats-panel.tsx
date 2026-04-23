"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageCircle, Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  content: string
  sender_id: string
  created_at: string
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
          { credentials: "include" }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to load messages")
        setMessages((json.messages || []) as MessageRow[])
      } catch {
        setMessages([])
      } finally {
        setMsgLoading(false)
      }
    },
    [eventId]
  )

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId)
  }, [selectedId, loadMessages])

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
      await loadMessages(gid)
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
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === g.id ? "bg-purple-600/30 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="font-medium">{g.name}</span>
              {g.group_type ? <span className="ml-2 text-xs text-slate-500 capitalize">{g.group_type}</span> : null}
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
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-8">No messages yet. Say hello.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-md bg-slate-900/80 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                  <p className="text-slate-200 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
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
