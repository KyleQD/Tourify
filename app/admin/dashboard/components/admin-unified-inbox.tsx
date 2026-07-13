"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Check,
  FileText,
  Hash,
  Inbox,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Search,
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
  isTrusted?: boolean
  isPendingCompose?: boolean
}

interface SearchUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const dmParam = searchParams.get("dm")

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
  const [showCompose, setShowCompose] = useState(false)
  const [composeQuery, setComposeQuery] = useState("")
  const [composeResults, setComposeResults] = useState<SearchUser[]>([])
  const [composeLoading, setComposeLoading] = useState(false)
  const [requestActionBusy, setRequestActionBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const composeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handledDmRef = useRef<string | null>(null)

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/messages/list", buildFetchInit())
      if (!res.ok) throw new Error("Failed to load inbox")
      const data = await res.json()
      setThreads(data.threads || [])
      setDms(data.dms || [])
      setLastUpdated(new Date())
      return { threads: data.threads || [], dms: (data.dms || []) as DmItem[] }
    } catch {
      toast.error("Failed to load messages")
      return { threads: [], dms: [] as DmItem[] }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (sel: InboxSelection) => {
    if (sel.isPendingCompose) {
      setMessages([])
      return
    }

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

  const openDmWithUser = useCallback(async (userId: string, profile?: SearchUser | null) => {
    const existing = dms.find((dm) => dm.participant_id === userId)
    if (existing) {
      setSelection({
        kind: "dm",
        id: existing.id,
        label: existing.participant_name,
        avatarUrl: existing.participant_avatar,
        recipientId: existing.participant_id,
        isTrusted: existing.is_trusted,
      })
      setShowCompose(false)
      return
    }

    let resolved = profile
    if (!resolved) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle()
      resolved = data as SearchUser | null
    }

    const label = resolved?.full_name || resolved?.username || "New conversation"
    setSelection({
      kind: "dm",
      id: `pending:${userId}`,
      label,
      avatarUrl: resolved?.avatar_url || null,
      recipientId: userId,
      isTrusted: true,
      isPendingCompose: true,
    })
    setMessages([])
    setShowCompose(false)
  }, [dms])

  useEffect(() => {
    void fetchInbox()
  }, [fetchInbox])

  useEffect(() => {
    if (!dmParam || handledDmRef.current === dmParam || loading) return

    handledDmRef.current = dmParam
    void (async () => {
      await openDmWithUser(dmParam)
      router.replace("/admin/dashboard/communications", { scroll: false })
    })()
  }, [dmParam, loading, openDmWithUser, router])

  useEffect(() => {
    if (selection) void fetchMessages(selection)
    else setMessages([])
  }, [selection, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!selection || selection.isPendingCompose) return

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

  useEffect(() => {
    if (!showCompose) return
    if (composeTimerRef.current) clearTimeout(composeTimerRef.current)

    composeTimerRef.current = setTimeout(async () => {
      const q = composeQuery.trim()
      if (q.length < 1) {
        setComposeResults([])
        return
      }

      setComposeLoading(true)
      try {
        const res = await fetch(`/api/messages/user-search?q=${encodeURIComponent(q)}&limit=10`, buildFetchInit())
        if (!res.ok) throw new Error("Search failed")
        const data = await res.json()
        setComposeResults(data.users || [])
      } catch {
        toast.error("Failed to search users")
        setComposeResults([])
      } finally {
        setComposeLoading(false)
      }
    }, 250)

    return () => {
      if (composeTimerRef.current) clearTimeout(composeTimerRef.current)
    }
  }, [composeQuery, showCompose])

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
      const threadKey = selection.isPendingCompose
        ? `pending-${selection.recipientId}`
        : selection.id
      const attachment = await uploadAttachment(file, threadKey)
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
          const threadKey = selection.isPendingCompose
            ? `pending-${selection.recipientId}`
            : selection.id
          const attachment = await uploadAttachment(file, threadKey)
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
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to send message")
        }
        const data = await res.json()
        if (data.message) {
          setMessages((prev) => [...prev, data.message as ChatMessage])
        }

        if (selection.isPendingCompose || data.conversation?.id) {
          const inbox = await fetchInbox()
          const created = inbox.dms.find((dm) => dm.participant_id === selection.recipientId)
          if (created) {
            setSelection({
              kind: "dm",
              id: created.id,
              label: created.participant_name,
              avatarUrl: created.participant_avatar,
              recipientId: created.participant_id,
              isTrusted: created.is_trusted,
            })
          } else if (data.conversation?.id) {
            setSelection((prev) =>
              prev
                ? {
                    ...prev,
                    id: data.conversation.id,
                    isPendingCompose: false,
                    isTrusted: data.conversation.trust_tier !== "request",
                  }
                : prev,
            )
          }
        }
      }

      setDraft("")
      setPendingAttachments([])
      setLastUpdated(new Date())
      void fetchInbox()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message"
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  async function handleAcceptRequest() {
    if (!selection || selection.kind !== "dm" || selection.isPendingCompose) return
    setRequestActionBusy(true)
    try {
      const res = await fetch(`/api/messages/${selection.id}/accept`, buildFetchInit({ method: "POST" }))
      if (!res.ok) throw new Error("Failed to accept request")
      toast.success("Message request accepted")
      setSelection((prev) => (prev ? { ...prev, isTrusted: true } : prev))
      void fetchInbox()
    } catch {
      toast.error("Failed to accept request")
    } finally {
      setRequestActionBusy(false)
    }
  }

  async function handleDeclineRequest() {
    if (!selection || selection.kind !== "dm" || selection.isPendingCompose) return
    setRequestActionBusy(true)
    try {
      const res = await fetch(`/api/messages/${selection.id}/decline`, buildFetchInit({ method: "POST" }))
      if (!res.ok) throw new Error("Failed to decline request")
      toast.success("Message request declined")
      setSelection(null)
      setMessages([])
      void fetchInbox()
    } catch {
      toast.error("Failed to decline request")
    } finally {
      setRequestActionBusy(false)
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
      isTrusted: dm.is_trusted,
    })
  }

  if (loading) return <AdminPageSkeleton />

  const inboxEmpty = threads.length === 0 && dms.length === 0
  const selectedIsRequest =
    selection?.kind === "dm" &&
    !selection.isPendingCompose &&
    selection.isTrusted === false

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] min-h-[560px]">
      <div className="rounded-sm border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3 gap-2">
          <h3 className="text-sm font-medium text-white">Inbox</h3>
          <div className="flex items-center gap-2">
            {lastUpdated ? (
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-slate-600 text-slate-300 px-2"
              onClick={() => {
                setShowCompose((prev) => !prev)
                setComposeQuery("")
                setComposeResults([])
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>

        {showCompose ? (
          <div className="border-b border-slate-700/50 p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={composeQuery}
                onChange={(e) => setComposeQuery(e.target.value)}
                placeholder="Search people to message..."
                className="pl-8 h-9 bg-slate-800/50 border-slate-700 text-white text-sm"
                autoFocus
              />
            </div>
            {composeLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : composeResults.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {composeResults.map((user) => {
                  const name = user.full_name || user.username || "Unknown"
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => void openDmWithUser(user.id, user)}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-slate-700 text-[10px]">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{name}</span>
                    </button>
                  )
                })}
              </div>
            ) : composeQuery.trim() ? (
              <p className="text-xs text-slate-500 text-center py-2">No users found</p>
            ) : (
              <p className="text-xs text-slate-500 text-center py-2">Type a name to start a DM</p>
            )}
          </div>
        ) : null}

        <ScrollArea className="h-[520px]">
          {inboxEmpty && !showCompose ? (
            <div className="p-6">
              <AdminEmptyState
                icon={Inbox}
                title="No conversations"
                description="Start a new message or wait for group threads and DMs"
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
              description="Choose a group thread or direct message, or start a new one"
            />
          </div>
        ) : (
          <>
            <div className="border-b border-slate-700/50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
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
                  <div className="min-w-0">
                    <h3 className="font-medium text-white truncate">{selection.label}</h3>
                    {selection.isPendingCompose ? (
                      <p className="text-[11px] text-slate-500">New conversation</p>
                    ) : null}
                  </div>
                </div>
                {selectedIsRequest ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700"
                      disabled={requestActionBusy}
                      onClick={() => void handleAcceptRequest()}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-slate-600 text-slate-300"
                      disabled={requestActionBusy}
                      onClick={() => void handleDeclineRequest()}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <ScrollArea className="flex-1 h-[400px] p-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-12">
                  {selection.isPendingCompose
                    ? "Send a message to start the conversation."
                    : "No messages yet. Start the conversation."}
                </p>
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
