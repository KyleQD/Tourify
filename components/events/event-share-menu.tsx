"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Copy,
  Facebook,
  Link2,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  Twitter,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useActingContext } from "@/hooks/use-acting-context"
import { useAuth } from "@/contexts/auth-context"

interface EventShareMenuProps {
  eventId: string
  eventTitle: string
  eventSlug?: string | null
  /** Optional seed; menu also self-detects via useAuth + /api/profile/current */
  isSignedIn?: boolean
  onClose: () => void
  onExternalShare: (platform: "twitter" | "facebook" | "copy") => void
}

interface SearchUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface GroupThread {
  id: string
  name: string
}

type SharePanel = "main" | "message"

function SectionChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-200/80">
      {label}
    </span>
  )
}

function ShareActionRow({
  icon: Icon,
  iconClassName,
  title,
  description,
  onClick,
}: {
  icon: typeof Twitter
  iconClassName: string
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-left transition-all duration-200 hover:scale-[1.01] hover:border-purple-400/35 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-purple-500/10"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 ${iconClassName}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block truncate text-xs text-white/45">{description}</span>
      </span>
    </button>
  )
}

export function EventShareMenu({
  eventId,
  eventTitle,
  eventSlug,
  isSignedIn: isSignedInSeed = false,
  onClose,
  onExternalShare,
}: EventShareMenuProps) {
  const { actingHeaders } = useActingContext()
  const { user, isAuthenticated } = useAuth()
  const [resolvedSignedIn, setResolvedSignedIn] = useState(
    () => Boolean(isSignedInSeed || user || isAuthenticated),
  )
  const [panel, setPanel] = useState<SharePanel>("main")
  const [feedCaption, setFeedCaption] = useState(`Shared an event: ${eventTitle}`)
  const [messageNote, setMessageNote] = useState("")
  const [isSharingFeed, setIsSharingFeed] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [threads, setThreads] = useState<GroupThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  const isSignedIn = resolvedSignedIn

  // Match Nav: cookie session via /api/profile/current may succeed before useAuth hydrates.
  useEffect(() => {
    if (user || isAuthenticated || isSignedInSeed) {
      setResolvedSignedIn(true)
      return
    }

    let cancelled = false
    async function detectSignedIn() {
      try {
        const response = await fetch("/api/profile/current", {
          credentials: "same-origin",
        })
        if (cancelled) return
        if (response.status === 401) {
          setResolvedSignedIn(false)
          return
        }
        if (!response.ok) return
        const data = await response.json().catch(() => null)
        if (!cancelled && data?.profile?.id) setResolvedSignedIn(true)
      } catch {
        // Keep seed / useAuth state on network failure
      }
    }

    void detectSignedIn()
    return () => {
      cancelled = true
    }
  }, [user, isAuthenticated, isSignedInSeed])

  useEffect(() => {
    if (panel !== "message" || !isSignedIn) return

    let cancelled = false
    async function loadThreads() {
      setIsLoadingThreads(true)
      try {
        const res = await fetch("/api/groups/threads?limit=20", { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          setThreads(
            (data.threads || []).map((thread: GroupThread) => ({
              id: thread.id,
              name: thread.name,
            })),
          )
        }
      } catch {
        if (!cancelled) setThreads([])
      } finally {
        if (!cancelled) setIsLoadingThreads(false)
      }
    }

    void loadThreads()
    return () => {
      cancelled = true
    }
  }, [panel, isSignedIn])

  useEffect(() => {
    if (panel !== "message" || !isSignedIn) return
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/messages/user-search?q=${encodeURIComponent(q)}&limit=8`,
          { credentials: "include" },
        )
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setSearchResults(data.users || [])
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, panel, isSignedIn])

  async function handleShareToFeed() {
    setIsSharingFeed(true)
    try {
      const res = await fetch("/api/posts/share", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        credentials: "include",
        body: JSON.stringify({
          shared_content_type: "event",
          shared_content_id: eventId,
          content: feedCaption.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to share to feed")
      }
      toast.success("Shared to your feed")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share to feed")
    } finally {
      setIsSharingFeed(false)
    }
  }

  async function handleSendMessage() {
    if (!selectedRecipientId && !selectedThreadId) {
      toast.error("Select a person or group")
      return
    }

    setIsSendingMessage(true)
    try {
      const res = await fetch(`/api/events/${eventId}/share-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientId: selectedRecipientId || undefined,
          threadId: selectedThreadId || undefined,
          note: messageNote.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message")
      }
      toast.success(selectedThreadId ? "Sent to group" : "Message sent")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setIsSendingMessage(false)
    }
  }

  function selectUser(userId: string) {
    setSelectedRecipientId(userId)
    setSelectedThreadId(null)
  }

  function selectThread(threadId: string) {
    setSelectedThreadId(threadId)
    setSelectedRecipientId(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-xl font-semibold text-transparent">
            {panel === "message" ? "Send as Message" : "Share Event"}
          </h3>
          <p className="mt-1 truncate text-sm text-white/50">{eventTitle}</p>
        </div>
        {panel === "message" ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanel("main")}
            className="h-9 w-9 shrink-0 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {panel === "main" ? (
        <>
          <div className="space-y-2.5">
            <SectionChip label="External" />
            <div className="space-y-2">
              <ShareActionRow
                icon={Twitter}
                iconClassName="bg-sky-500/15 text-sky-300"
                title="Share on Twitter"
                description="Post to your timeline"
                onClick={() => onExternalShare("twitter")}
              />
              <ShareActionRow
                icon={Facebook}
                iconClassName="bg-blue-500/15 text-blue-300"
                title="Share on Facebook"
                description="Share with friends"
                onClick={() => onExternalShare("facebook")}
              />
              <ShareActionRow
                icon={Copy}
                iconClassName="bg-emerald-500/15 text-emerald-300"
                title="Copy Link"
                description="Copy public event URL"
                onClick={() => onExternalShare("copy")}
              />
            </div>
          </div>

          {isSignedIn ? (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <SectionChip label="Tourify" />
              <Textarea
                value={feedCaption}
                onChange={(e) => setFeedCaption(e.target.value)}
                placeholder="Add a caption for your feed…"
                className="min-h-[80px] rounded-xl border-white/15 bg-black/30 text-white placeholder:text-white/40 focus-visible:border-purple-400/50 focus-visible:ring-purple-500/20"
              />
              <Button
                onClick={() => void handleShareToFeed()}
                disabled={isSharingFeed}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-pink-500"
              >
                {isSharingFeed ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Share to Feed
              </Button>
              <Button
                onClick={() => setPanel("message")}
                variant="outline"
                className="w-full rounded-xl border-white/15 bg-white/5 text-white hover:border-purple-400/30 hover:bg-white/10"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Send as Message
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3.5">
          <Textarea
            value={messageNote}
            onChange={(e) => setMessageNote(e.target.value)}
            placeholder="Optional note…"
            className="min-h-[68px] rounded-xl border-white/15 bg-black/30 text-white placeholder:text-white/40 focus-visible:border-purple-400/50 focus-visible:ring-purple-500/20"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people…"
              className="rounded-xl border-white/15 bg-black/30 pl-9 text-white placeholder:text-white/40 focus-visible:border-purple-400/50"
            />
          </div>

          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-4 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((person) => {
                const label = person.full_name || person.username || "User"
                const isSelected = selectedRecipientId === person.id
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => selectUser(person.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-purple-400/30 bg-purple-600/25 text-white"
                        : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-white/10">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-xs text-white">
                        {label.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{label}</span>
                  </button>
                )
              })
            ) : (
              <p className="px-1 py-3 text-center text-xs text-white/40">
                {searchQuery.trim().length < 2 ? "Type at least 2 characters" : "No people found"}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/50">
              <Users className="h-3.5 w-3.5" />
              Groups
            </p>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
              {isLoadingThreads ? (
                <div className="flex items-center justify-center py-3 text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : threads.length > 0 ? (
                threads.map((thread) => {
                  const isSelected = selectedThreadId === thread.id
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => selectThread(thread.id)}
                      className={`w-full rounded-xl border px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-purple-400/30 bg-purple-600/25 text-white"
                          : "border-transparent hover:bg-white/5"
                      }`}
                    >
                      {thread.name}
                    </button>
                  )
                })
              ) : (
                <p className="px-1 py-3 text-center text-xs text-white/40">No group threads yet</p>
              )}
            </div>
          </div>

          <Button
            onClick={() => void handleSendMessage()}
            disabled={isSendingMessage || (!selectedRecipientId && !selectedThreadId)}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
          >
            {isSendingMessage ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
          {eventSlug ? (
            <p className="flex items-center justify-center gap-1.5 truncate text-[11px] text-white/35">
              <Link2 className="h-3 w-3 shrink-0" />
              /events/{eventSlug}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
