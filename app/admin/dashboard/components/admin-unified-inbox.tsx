"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminEmptyState } from "./admin-empty-state"
import { AdminPageSkeleton } from "./admin-page-skeleton"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  FileText,
  Hash,
  Inbox,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  X,
} from "lucide-react"

interface ThreadItem {
  id: string
  name: string
  type: "group"
  last_message: string | null
  unread_count: number
  member_count: number
  last_activity: string | null
}

interface DmItem {
  id: string
  participant_id: string
  participant_name: string
  participant_avatar: string | null
  last_message: string | null
  unread_count: number
  is_trusted: boolean
  last_activity: string | null
}

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  created_at: string
  attachments?: MessageAttachment[]
  sender?: {
    id: string
    full_name?: string | null
    username?: string | null
    avatar_url?: string | null
  }
}

interface MessageAttachment {
  url: string
  name: string
  type: "image" | "file" | "audio"
  size: number
}

interface InboxSelection {
  kind: "group" | "dm"
  id: string
  label: string
  avatarUrl?: string | null
  recipientId?: string
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
const ACCEPTED_FILE_TYPES = "image/*,application/pdf,audio/*"

function buildFetchInit(input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...(input?.headers || {}),
    },
    ...input,
  }
}

function inferAttachmentType(mime: string): MessageAttachment["type"] {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  return "file"
}

function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  if (!attachments.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => {
        if (attachment.type === "image") {
          return (
            <a key={attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-40 rounded-md border border-slate-700 object-cover"
              />
            </a>
          )
        }

        return (
          <a
            key={attachment.url}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-200 hover:border-purple-500/40"
          >
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="truncate max-w-[160px]">{attachment.name}</span>
            <span className="text-slate-500">{(attachment.size / 1024).toFixed(0)} KB</span>
          </a>
        )
      })}
    </div>
  )
}

export function AdminUnifiedInbox() {
  const [loading, setLoading] = useState(true)
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [dms, setDms] = useState<DmItem[]>([])
  const [selection, setSelection] = useState<InboxSelection | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/messages/list", buildFetchInit())
      if (!res.ok) throw new Error("Failed to load inbox")
      const data = await res.json()
      setThreads(data.threads || [])
      setDms(data.dms || [])
      setLastUpdated(new Date())
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (sel: InboxSelection) => {
    try {
      setMessagesLoading(true)
      if (sel.kind === "group") {
        const res = await fetch(`/api/groups/threads/${sel.id}/messages?limit=80`, buildFetchInit())
        if (!res.ok) throw new Error("Failed to load thread messages")
        const data = await res.json()
        setMessages(data.messages || [])
      } else {
        const res = await fetch(`/api/messages?conversationId=${sel.id}&limit=80`, buildFetchInit())
        if (!res.ok) throw new Error("Failed to load conversation")
        const data = await res.json()
        setMessages(data.messages || [])
      }
      setLastUpdated(new Date())
    } catch {
      toast.error("Failed to load conversation")
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => { void fetchInbox() }, [fetchInbox])

  useEffect(() => {
    if (selection) void fetchMessages(selection)
    else setMessages([])
  }, [selection, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!selection) return

    const table = selection.kind === "group" ? "group_messages" : "messages"
    const filter =
      selection.kind === "group"
        ? `thread_id=eq.${selection.id}`
        : `conversation_id=eq.${selection.id}`

    const channel = supabase
      .channel(`admin-comms-${selection.kind}-${selection.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter },
        (payload) => {
          const incoming = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((message) => message.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          setLastUpdated(new Date())
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [selection])

  async function uploadAttachment(file: File, threadKey: string): Promise<MessageAttachment | null> {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File must be under 25MB")
      return null
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${threadKey}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from("message-attachments").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      toast.error("Failed to upload attachment")
      return null
    }

    const { data } = supabase.storage.from("message-attachments").getPublicUrl(path)
    return {
      url: data.publicUrl,
      name: file.name,
      type: inferAttachmentType(file.type),
      size: file.size,
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !selection) return
    setUploading(true)
    try {
      const attachment = await uploadAttachment(file, selection.id)
      if (attachment) setPendingAttachments((prev) => [...prev, attachment])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function startRecording() {
    if (!selection || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" })
        setUploading(true)
        try {
          const attachment = await uploadAttachment(file, selection.id)
          if (attachment) setPendingAttachments((prev) => [...prev, attachment])
        } finally {
          setUploading(false)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      toast.error("Microphone access denied")
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || !recording) return
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current = null
    setRecording(false)
  }

  async function handleSend() {
    if (!selection) return
    const content = draft.trim()
    if (!content && pendingAttachments.length === 0) return

    setSending(true)
    try {
      if (selection.kind === "group") {
        const res = await fetch(`/api/groups/threads/${selection.id}/messages`, buildFetchInit({
          method: "POST",
          body: JSON.stringify({
            content: content || "(attachment)",
            attachments: pendingAttachments,
          }),
        }))
        if (!res.ok) throw new Error("Failed to send message")
        const data = await res.json()
        if (data.message) {
          setMessages((prev) => [...prev, data.message as ChatMessage])
        }
      } else if (selection.recipientId) {
        const res = await fetch("/api/messages", buildFetchInit({
          method: "POST",
          body: JSON.stringify({
            recipientId: selection.recipientId,
            content: content || "(attachment)",
            attachments: pendingAttachments,
          }),
        }))
        if (!res.ok) throw new Error("Failed to send message")
        const data = await res.json()
        if (data.message) {
          setMessages((prev) => [...prev, data.message as ChatMessage])
        }
      }

      setDraft("")
      setPendingAttachments([])
      setLastUpdated(new Date())
      void fetchInbox()
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  function selectThread(thread: ThreadItem) {
    setSelection({ kind: "group", id: thread.id, label: thread.name })
  }

  function selectDm(dm: DmItem) {
    setSelection({
      kind: "dm",
      id: dm.id,
      label: dm.participant_name,
      avatarUrl: dm.participant_avatar,
      recipientId: dm.participant_id,
    })
  }

  if (loading) return <AdminPageSkeleton />

  const inboxEmpty = threads.length === 0 && dms.length === 0

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] min-h-[560px]">
      <div className="rounded-sm border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <h3 className="text-sm font-medium text-white">Inbox</h3>
          {lastUpdated ? (
            <span className="text-[10px] text-slate-500">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          ) : null}
        </div>
        <ScrollArea className="h-[520px]">
          {inboxEmpty ? (
            <div className="p-6">
              <AdminEmptyState
                icon={Inbox}
                title="No conversations"
                description="Group threads and direct messages will appear here"
              />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectThread(thread)}
                  className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                    selection?.id === thread.id && selection.kind === "group"
                      ? "bg-purple-600/30 text-white"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-purple-400 shrink-0" />
                    <span className="font-medium truncate">{thread.name}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{thread.member_count}</Badge>
                  </div>
                  {thread.last_message ? (
                    <p className="mt-1 text-xs text-slate-500 truncate pl-6">{thread.last_message}</p>
                  ) : null}
                </button>
              ))}
              {dms.map((dm) => (
                <button
                  key={dm.id}
                  type="button"
                  onClick={() => selectDm(dm)}
                  className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                    selection?.id === dm.id && selection.kind === "dm"
                      ? "bg-purple-600/30 text-white"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={dm.participant_avatar || ""} />
                      <AvatarFallback className="bg-slate-700 text-[10px]">
                        {dm.participant_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{dm.participant_name}</span>
                    {!dm.is_trusted ? (
                      <Badge variant="outline" className="ml-auto text-[10px] border-yellow-500/40 text-yellow-400">
                        Request
                      </Badge>
                    ) : null}
                  </div>
                  {dm.last_message ? (
                    <p className="mt-1 text-xs text-slate-500 truncate pl-8">{dm.last_message}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="rounded-sm border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm flex flex-col">
        {!selection ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <AdminEmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a group thread or direct message from the sidebar"
            />
          </div>
        ) : (
          <>
            <div className="border-b border-slate-700/50 px-4 py-3">
              <div className="flex items-center gap-2">
                {selection.kind === "dm" ? (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={selection.avatarUrl || ""} />
                    <AvatarFallback className="bg-slate-700 text-xs">
                      {selection.label.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Hash className="h-5 w-5 text-purple-400" />
                )}
                <h3 className="font-medium text-white">{selection.label}</h3>
              </div>
            </div>

            <ScrollArea className="flex-1 h-[400px] p-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-12">No messages yet. Start the conversation.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const senderName =
                      message.sender?.full_name ||
                      message.sender?.username ||
                      `User ${message.sender_id.slice(0, 6)}`
                    return (
                      <div key={message.id} className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={message.sender?.avatar_url || ""} />
                          <AvatarFallback className="bg-slate-700 text-xs">
                            {senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-300">{senderName}</span>
                            <span className="text-[11px] text-slate-500">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {message.content && message.content !== "(attachment)" ? (
                            <p className="mt-0.5 text-sm text-white whitespace-pre-wrap break-words">{message.content}</p>
                          ) : null}
                          {message.attachments?.length ? (
                            <MessageAttachments attachments={message.attachments} />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {pendingAttachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-700/50 px-3 py-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                  >
                    <span className="truncate max-w-[120px]">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments((prev) => prev.filter((a) => a.url !== attachment.url))}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-2 border-t border-slate-700/50 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-slate-400 hover:text-white shrink-0"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={`shrink-0 ${recording ? "text-red-400" : "text-slate-400 hover:text-white"}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="border-slate-700 bg-slate-800 text-white flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
              />
              <Button
                size="icon"
                onClick={() => void handleSend()}
                disabled={sending || (!draft.trim() && pendingAttachments.length === 0)}
                className="bg-purple-600 hover:bg-purple-700 shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
