"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { ArrowLeft, Loader2, Send, Users } from "lucide-react"

interface GroupMessageSender {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
}

interface GroupMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string
  message_type: string
  mentions: string[]
  created_at: string
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

export function GroupThreadClient({ threadId }: { threadId: string }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [thread, setThread] = useState<ThreadSummary | null>(null)
  const [membership, setMembership] = useState<{ role: string } | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadThread = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/threads/${threadId}`, { credentials: "include" })
      if (!response.ok) {
        if (response.status === 403) router.replace("/messages?tab=work")
        else if (response.status === 404) router.replace("/messages?tab=work")
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

  useEffect(() => {
    if (!isAuthenticated) return
    void loadThread()
    void loadMessages()
  }, [isAuthenticated, loadThread, loadMessages])

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
          setMessages((prev) => [...prev, incoming])
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [threadId, user])

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
      setMessages((prev) => [...prev, data.message])
    } catch (error) {
      console.error("Group send error:", error)
      toast.error("Failed to send message")
      setDraft(content)
    } finally {
      setSending(false)
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
      <div className="container mx-auto h-screen max-w-4xl">
        <div className="flex h-full flex-col bg-slate-900/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-4 border-b border-slate-700/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/messages?tab=work")}
              className="text-slate-300 hover:bg-slate-800"
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
              <Users className="h-3 w-3 mr-1" /> {thread?.thread_type || "group"}
            </Badge>
            {membership?.role && (
              <Badge className="bg-slate-700/60 text-slate-200 text-[10px]">{membership.role}</Badge>
            )}
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
                      className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
                    >
                      {!isOwn && (
                        <Avatar className="h-7 w-7 mt-1">
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

          <div className="p-4 border-t border-slate-700/60 flex gap-3">
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
      </div>
    </div>
  )
}
