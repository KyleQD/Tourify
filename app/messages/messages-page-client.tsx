"use client"

import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Send,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Shield,
  ClipboardCheck,
  Check,
  X,
  Lock,
  Users,
  Inbox,
  Briefcase,
  Paperclip,
  FileText,
  Hash,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GroupCreateDialog } from '@/components/messages/group-create-dialog'
import { InboxAccountSelector } from '@/components/messages/inbox-account-selector'
import { ComposeNewMessageDialog } from '@/components/messages/compose-new-message-dialog'
import { MessageAttachments } from '@/components/messages/message-attachments'
import { MessageEmojiPicker } from '@/components/messages/message-emoji-picker'
import { useActingContext } from '@/hooks/use-acting-context'
import {
  MESSAGE_ATTACHMENT_BUCKET,
  MESSAGE_ATTACHMENT_MAX_BYTES,
  buildAttachmentStoragePath,
  inferAttachmentType,
  isAllowedAttachmentMime,
  type MessageAttachment,
} from '@/lib/messaging/attachments'
import { MessagesSkeleton } from './messages-skeleton'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  attachments?: MessageAttachment[]
  sender: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

interface ConversationProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
}

interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  participant_1_profile_id?: string | null
  participant_1_account_type?: string | null
  participant_2_profile_id?: string | null
  participant_2_account_type?: string | null
  created_at: string
  updated_at: string
  trust_tier?: 'open' | 'request' | 'context'
  context_type?: string | null
  context_id?: string | null
  accepted_at?: string | null
  participant_1_profile?: ConversationProfile
  participant_2_profile?: ConversationProfile
  last_message?: {
    id: string
    content: string
    created_at: string
    sender_id: string
  } | null
}

interface ConversationChip {
  key: string
  label: string
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

interface UnifiedListItem {
  id: string
  source: 'direct' | 'group' | 'event_group' | 'task' | 'bulletin' | 'document' | 'work_mode'
  badge: string
  name?: string | null
  last_message: string | null
  last_activity: string | null
  event_id?: string | null
  action_url?: string | null
  priority?: string | null
  status?: string | null
}

type WorkSectionId = 'all' | 'messages' | 'channels' | 'tasks' | 'docs'

interface ViewerCapability {
  role: 'member' | 'viewer' | 'admin' | string
  canSend: boolean
}

interface TaskCardData {
  title: string
  description?: string
  actionUrl?: string
  actionLabel?: string
  isSensitive?: boolean
}

type TabId = 'primary' | 'requests' | 'work'

function parseTaskCard(content: string): TaskCardData | null {
  if (!content.startsWith('[TASK:')) return null
  try {
    const jsonStr = content.slice(6, content.lastIndexOf(']'))
    const parsed = JSON.parse(jsonStr)
    if (parsed.title && parsed.action_url) {
      return {
        title: parsed.title,
        description: parsed.description,
        actionUrl: parsed.action_url,
        actionLabel: parsed.action_label,
        isSensitive: parsed.is_sensitive,
      }
    }
  } catch {
    /* not a task card */
  }
  return null
}

const TAB_DEFINITIONS: Array<{ id: TabId; label: string; icon: typeof Inbox }> = [
  { id: 'primary', label: 'Primary', icon: Inbox },
  { id: 'requests', label: 'Requests', icon: MessageSquare },
  { id: 'work', label: 'Work', icon: Briefcase },
]

const EMPTY_COPY: Record<TabId, { title: string; body: string }> = {
  primary: {
    title: 'No conversations yet',
    body: 'Messages from friends and from people who follow this account appear here.',
  },
  requests: {
    title: 'No pending requests',
    body: 'Non-friends and people who do not follow this account land here until you accept.',
  },
  work: {
    title: 'No work threads yet',
    body: 'Event channels, team chats, tasks, and docs from your dashboards appear here.',
  },
}

interface PendingRecipient {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
}

interface MessagesPageClientProps {
  serverUserId?: string
}

export function MessagesPageClient({ serverUserId }: MessagesPageClientProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabId>('primary')
  const [conversationChips, setConversationChips] = useState<ConversationChip[]>([])
  const [unifiedList, setUnifiedList] = useState<UnifiedListItem[]>([])
  const [viewer, setViewer] = useState<ViewerCapability>({ role: 'member', canSend: true })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [workSection, setWorkSection] = useState<WorkSectionId>('all')
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [inboxEpoch, setInboxEpoch] = useState(0)
  const [pendingRecipient, setPendingRecipient] = useState<PendingRecipient | null>(null)

  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { actingHeaders, actingAccount } = useActingContext()
  const hasServerSession = Boolean(serverUserId)
  const effectiveUserId = user?.id ?? serverUserId ?? null
  const canAccessMessages = Boolean(effectiveUserId) && (isAuthenticated || hasServerSession)
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const profileCacheRef = useRef<Map<string, ConversationProfile>>(new Map())

  const tabParam = searchParams.get('tab') as TabId | null
  const conversationParam = searchParams.get('conversation')

  useEffect(() => {
    if (tabParam === 'requests' || tabParam === 'work' || tabParam === 'primary')
      setActiveTab(tabParam)
  }, [tabParam])

  const fetchConversations = useCallback(async () => {
    if (!effectiveUserId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/messages?tab=${activeTab}`, {
        credentials: 'include',
        headers: { ...actingHeaders },
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        if (data.viewer) {
          setViewer({
            role: data.viewer.role || 'member',
            canSend: data.viewer.canSend !== false,
          })
        }
      } else {
        toast.error('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, activeTab, actingHeaders])

  useEffect(() => {
    if (canAccessMessages) {
      void fetchConversations()
    }
  }, [canAccessMessages, fetchConversations, inboxEpoch, actingAccount?.profile_id, actingAccount?.account_type])

  const loadUnifiedList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ section: workSection })
      const response = await fetch(`/api/messages/unified-list?${params.toString()}`, {
        credentials: 'include',
        headers: { ...actingHeaders },
      })
      if (!response.ok) return
      const data = await response.json()
      setUnifiedList(data.data || [])
    } catch (error) {
      console.error('Error loading unified list:', error)
    }
  }, [actingHeaders, workSection])

  useEffect(() => {
    if (!canAccessMessages || activeTab !== 'work') {
      setUnifiedList([])
      return
    }
    void loadUnifiedList()
  }, [canAccessMessages, activeTab, loadUnifiedList, inboxEpoch])

  useEffect(() => {
    if (!conversationParam || conversations.length === 0) return
    const hasConversation = conversations.some((conversation) => conversation.id === conversationParam)
    if (hasConversation) setSelectedConversation(conversationParam)
  }, [conversationParam, conversations])

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const response = await fetch(`/api/messages?conversationId=${conversationId}`, {
        credentials: 'include',
        headers: { ...actingHeaders },
      })

      if (response.ok) {
        const data = await response.json()
        const fetched = (data.messages || []) as Message[]
        for (const m of fetched) {
          if (m.sender) profileCacheRef.current.set(m.sender.id, m.sender)
        }
        setMessages(fetched)
      } else {
        toast.error('Failed to load messages')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }, [actingHeaders])

  const fetchConversationContext = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}/context`, {
        credentials: 'include',
        headers: { ...actingHeaders },
      })
      if (!response.ok) return
      const data = await response.json()
      setConversationChips(data.chips || [])
    } catch (error) {
      console.error('Error loading conversation context chips:', error)
    }
  }, [actingHeaders])

  useEffect(() => {
    if (selectedConversation) {
      void fetchMessages(selectedConversation)
      void fetchConversationContext(selectedConversation)
    } else {
      setMessages([])
      setConversationChips([])
    }
  }, [selectedConversation, fetchMessages, fetchConversationContext])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSenderDetails = useCallback(async (senderId: string) => {
    if (profileCacheRef.current.has(senderId)) {
      const cached = profileCacheRef.current.get(senderId)!
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender_id === senderId && msg.sender.username === 'Loading...'
            ? { ...msg, sender: cached }
            : msg,
        ),
      )
      return
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', senderId)
        .single()

      if (profile) {
        const next: ConversationProfile = {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        }
        profileCacheRef.current.set(senderId, next)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender_id === senderId && msg.sender.username === 'Loading...'
              ? { ...msg, sender: next }
              : msg,
          ),
        )
      }
    } catch (error) {
      console.error('Error fetching sender details:', error)
    }
  }, [])

  useEffect(() => {
    if (!effectiveUserId || !canAccessMessages || !selectedConversation) return

    const messagesChannel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const incoming = payload.new as any
          if (incoming.sender_id === effectiveUserId) return

          const cached = profileCacheRef.current.get(incoming.sender_id)
          const senderShell: ConversationProfile = cached || {
            id: incoming.sender_id,
            username: 'Loading...',
            full_name: 'Loading...',
            avatar_url: '',
          }

          setMessages((prev) => [
            ...prev,
            {
              id: incoming.id,
              content: incoming.content,
              sender_id: incoming.sender_id,
              created_at: incoming.created_at,
              sender: senderShell,
            },
          ])

          if (!cached) void fetchSenderDetails(incoming.sender_id)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(messagesChannel)
    }
  }, [effectiveUserId, canAccessMessages, selectedConversation, fetchSenderDetails])

  useEffect(() => {
    if (!effectiveUserId || !canAccessMessages) return

    const conversationsChannel = supabase
      .channel(`conversations-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const updated = payload.new as any
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === updated.id
                ? {
                    ...conv,
                    updated_at: updated.updated_at,
                    trust_tier: updated.trust_tier ?? conv.trust_tier,
                    accepted_at: updated.accepted_at ?? conv.accepted_at,
                    last_message: conv.last_message,
                  }
                : conv,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(conversationsChannel)
    }
  }, [effectiveUserId, canAccessMessages])

  const acceptConversationRequest = useCallback(async () => {
    if (!selectedConversation) return
    setRespondingTo('accept')
    const previous = conversations
    const nowIso = new Date().toISOString()
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? { ...conv, trust_tier: 'open', accepted_at: nowIso }
          : conv,
      ),
    )

    try {
      const response = await fetch(`/api/messages/${selectedConversation}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...actingHeaders },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Failed to accept request')
        setConversations(previous)
        return
      }
      toast.success('Request accepted')
      await fetchConversationContext(selectedConversation)
    } catch (error) {
      console.error('Error accepting request:', error)
      toast.error('Failed to accept request')
      setConversations(previous)
    } finally {
      setRespondingTo(null)
    }
  }, [selectedConversation, conversations, fetchConversationContext, actingHeaders])

  const declineConversationRequest = useCallback(async () => {
    if (!selectedConversation) return
    setRespondingTo('decline')
    const previous = conversations
    setConversations((prev) => prev.filter((conv) => conv.id !== selectedConversation))

    try {
      const response = await fetch(`/api/messages/${selectedConversation}/decline`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...actingHeaders },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Failed to decline request')
        setConversations(previous)
        return
      }
      toast.success('Request declined')
      setSelectedConversation(null)
      setMessages([])
      setConversationChips([])
    } catch (error) {
      console.error('Error declining request:', error)
      toast.error('Failed to decline request')
      setConversations(previous)
    } finally {
      setRespondingTo(null)
    }
  }, [selectedConversation, conversations, actingHeaders])

  const uploadAttachment = useCallback(async (file: File): Promise<MessageAttachment | null> => {
    if (!effectiveUserId) return null
    if (file.size > MESSAGE_ATTACHMENT_MAX_BYTES) {
      toast.error('File must be under 25MB')
      return null
    }
    if (!isAllowedAttachmentMime(file.type)) {
      toast.error('Unsupported file type')
      return null
    }

    const path = buildAttachmentStoragePath({
      userId: effectiveUserId,
      threadKey: selectedConversation || 'compose',
      fileName: file.name,
    })

    const { error } = await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) {
      toast.error('Failed to upload attachment')
      return null
    }

    const { data } = supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).getPublicUrl(path)
    return {
      url: data.publicUrl,
      name: file.name,
      type: inferAttachmentType(file.type),
      size: file.size,
    }
  }, [effectiveUserId, selectedConversation])

  const handleAttachmentPick = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingAttachment(true)
    try {
      const uploaded: MessageAttachment[] = []
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachment(file)
        if (attachment) uploaded.push(attachment)
      }
      if (uploaded.length)
        setPendingAttachments((prev) => [...prev, ...uploaded])
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [uploadAttachment])

  const sendMessage = useCallback(async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !effectiveUserId) return
    if (!selectedConversation && !pendingRecipient) return

    let recipientId: string
    let recipientProfileId: string | undefined
    let recipientAccountType: string | undefined

    if (pendingRecipient && !selectedConversation) {
      recipientId = pendingRecipient.id
      recipientProfileId = pendingRecipient.id
      recipientAccountType = 'general'
    } else {
      const conversation = conversations.find((c) => c.id === selectedConversation)
      if (!conversation) return
      recipientId =
        conversation.participant_1 === effectiveUserId
          ? conversation.participant_2
          : conversation.participant_1
      recipientProfileId =
        conversation.participant_1 === effectiveUserId
          ? conversation.participant_2_profile_id || undefined
          : conversation.participant_1_profile_id || undefined
      recipientAccountType =
        conversation.participant_1 === effectiveUserId
          ? conversation.participant_2_account_type || undefined
          : conversation.participant_1_account_type || undefined
    }

    setSending(true)
    const messageContent = newMessage.trim()
    const attachmentsToSend = [...pendingAttachments]
    setNewMessage('')
    setPendingAttachments([])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({
          recipientId,
          recipientProfileId,
          recipientAccountType,
          content: messageContent || undefined,
          attachments: attachmentsToSend,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const conversationId = result.conversationId as string | undefined
        setPendingRecipient(null)
        if (conversationId) {
          setSelectedConversation(conversationId)
          await fetchConversations()
          setMessages((prev) => {
            if (selectedConversation && conversationId === selectedConversation)
              return [...prev, { ...result.message, attachments: attachmentsToSend }]
            return [{ ...result.message, attachments: attachmentsToSend }]
          })
        }
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || 'Failed to send message')
        setNewMessage(messageContent)
        setPendingAttachments(attachmentsToSend)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      setNewMessage(messageContent)
      setPendingAttachments(attachmentsToSend)
    } finally {
      setSending(false)
    }
  }, [
    newMessage,
    pendingAttachments,
    selectedConversation,
    pendingRecipient,
    effectiveUserId,
    conversations,
    actingHeaders,
    fetchConversations,
  ])

  const handleComposeFriendSelected = useCallback((friend: PendingRecipient) => {
    const existing = conversations.find((conversation) =>
      conversation.participant_1 === friend.id || conversation.participant_2 === friend.id,
    )
    if (existing) {
      setPendingRecipient(null)
      setActiveTab('primary')
      setSelectedConversation(existing.id)
      return
    }

    setActiveTab('primary')
    setSelectedConversation(null)
    setMessages([])
    setConversationChips([])
    setNewMessage('')
    setPendingAttachments([])
    setPendingRecipient({
      id: friend.id,
      username: friend.username,
      full_name: friend.full_name || friend.username,
      avatar_url: friend.avatar_url,
    })
  }, [conversations])

  const clearPendingCompose = useCallback(() => {
    setPendingRecipient(null)
    setNewMessage('')
    setPendingAttachments([])
  }, [])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const getOtherParticipant = useCallback(
    (conversation: Conversation): ConversationProfile | undefined => {
      if (!effectiveUserId) return undefined
      return conversation.participant_1 === effectiveUserId
        ? conversation.participant_2_profile
        : conversation.participant_1_profile
    },
    [effectiveUserId],
  )

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const otherParticipant = getOtherParticipant(conversation)
      if (!otherParticipant) return false
      const searchLower = searchQuery.toLowerCase()
      return (
        otherParticipant.full_name.toLowerCase().includes(searchLower) ||
        otherParticipant.username.toLowerCase().includes(searchLower)
      )
    })
  }, [conversations, getOtherParticipant, searchQuery])

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversation),
    [conversations, selectedConversation],
  )

  const firstMessageSenderId = messages[0]?.sender_id ?? null
  const viewerIsRequestSender = Boolean(
    selected &&
      selected.trust_tier === 'request' &&
      !selected.accepted_at &&
      firstMessageSenderId === effectiveUserId,
  )
  const viewerIsRequestRecipient = Boolean(
    selected &&
      selected.trust_tier === 'request' &&
      !selected.accepted_at &&
      firstMessageSenderId &&
      firstMessageSenderId !== effectiveUserId,
  )

  const handleTabChange = (next: TabId) => {
    setActiveTab(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    if (selectedConversation) params.set('conversation', selectedConversation)
    router.replace(`/messages?${params.toString()}`)
  }

  const handleSelectConversation = (id: string) => {
    setPendingRecipient(null)
    setSelectedConversation(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('conversation', id)
    params.set('tab', activeTab)
    router.replace(`/messages?${params.toString()}`)
  }

  const composerPlaceholder = (() => {
    if (!viewer.canSend) return 'Viewer accounts cannot send messages'
    if (pendingRecipient) return `Message ${pendingRecipient.full_name || pendingRecipient.username}…`
    if (viewerIsRequestSender) return 'Waiting for them to accept your request'
    if (selected?.trust_tier === 'request') return 'Introduce yourself…'
    if (selected?.context_type === 'job_application') return 'Reply about the application'
    if (selected?.context_type === 'event_team') return 'Message the event team'
    return 'Type your message…'
  })()

  const isComposerDisabled =
    !viewer.canSend
    || sending
    || uploadingAttachment
    || (!pendingRecipient && (viewerIsRequestSender || viewerIsRequestRecipient))

  const showThreadPane = Boolean((selectedConversation && selected) || pendingRecipient)

  if (authLoading && !user && !hasServerSession) {
    return <MessagesSkeleton />
  }

  if (!user && !hasServerSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign in Required</h2>
            <p className="text-gray-400 mb-6">Please sign in to access your messages</p>
            <Button
              onClick={() => {
                window.location.href = '/login'
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto h-screen max-w-6xl">
        <div className="flex h-full gap-4">
          {/* Conversations Sidebar */}
          <div
            className={cn(
              'w-full md:w-1/3 bg-slate-900/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex-col',
              showThreadPane ? 'hidden md:flex' : 'flex',
            )}
          >
            <div className="p-4 border-b border-slate-700/60 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold text-white">Messages</h1>
                <ComposeNewMessageDialog
                  onSelected={(friend) => handleComposeFriendSelected(friend)}
                  disabled={!viewer.canSend}
                />
              </div>
              <InboxAccountSelector
                onInboxChange={() => {
                  setSelectedConversation(null)
                  clearPendingCompose()
                  setInboxEpoch((value) => value + 1)
                }}
              />
              <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabId)}>
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 backdrop-blur-sm p-1 rounded-xl border border-slate-700/30">
                  {TAB_DEFINITIONS.map(({ id, label }) => (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="text-xs text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-lg transition-all"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {activeTab === 'work' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">Channels, tasks, and docs</p>
                    <GroupCreateDialog onCreated={loadUnifiedList} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {([
                      ['all', 'All'],
                      ['messages', 'Messages'],
                      ['channels', 'Channels'],
                      ['tasks', 'Tasks'],
                      ['docs', 'Docs'],
                    ] as Array<[WorkSectionId, string]>).map(([id, label]) => (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant={workSection === id ? 'default' : 'outline'}
                        className={cn(
                          'h-7 px-2 text-[11px]',
                          workSection === id
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'border-slate-600 bg-transparent text-slate-300',
                        )}
                        onClick={() => setWorkSection(id)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {activeTab === 'work' && unifiedList.length > 0 && (
                <div className="px-3 pt-3 space-y-2">
                  {unifiedList
                    .filter((item) => item.source !== 'direct' || workSection === 'messages' || workSection === 'all')
                    .slice(0, 24)
                    .map((item) => (
                      <button
                        key={`${item.source}-${item.id}`}
                        type="button"
                        onClick={() => {
                          if (item.source === 'direct') {
                            handleSelectConversation(item.id)
                            return
                          }
                          if (item.action_url) {
                            router.push(item.action_url)
                            return
                          }
                          if (item.source === 'group') router.push(`/groups/${item.id}`)
                          else if (item.source === 'event_group' && item.event_id)
                            router.push(`/events/${item.event_id}?group=${item.id}`)
                        }}
                        className="block w-full rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-left transition-all hover:border-purple-500/40 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                            {item.source === 'event_group' || item.source === 'group' ? (
                              <Hash className="h-3.5 w-3.5 text-slate-400" />
                            ) : item.source === 'task' ? (
                              <ClipboardCheck className="h-3.5 w-3.5 text-purple-400" />
                            ) : item.source === 'document' || item.source === 'bulletin' || item.source === 'work_mode' ? (
                              <FileText className="h-3.5 w-3.5 text-sky-400" />
                            ) : null}
                            {item.name || item.id}
                          </p>
                          <Badge variant="outline" className="border-slate-600 text-[10px] text-slate-300">
                            {item.badge}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 truncate">
                          {item.last_message || 'No updates yet'}
                        </p>
                      </button>
                    ))}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                <div className="p-2">
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation)
                    if (!otherParticipant) return null

                    const isSelected = selectedConversation === conversation.id
                    const lastMessage = conversation.last_message
                    const isUnread = lastMessage && lastMessage.sender_id !== effectiveUserId

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl transition-all duration-200 mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                          isSelected
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'hover:bg-slate-800/50 border border-transparent',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={otherParticipant.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {otherParticipant.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-medium text-white truncate">
                                {otherParticipant.full_name}
                              </h3>
                              {lastMessage && (
                                <span className="shrink-0 text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 truncate">@{otherParticipant.username}</p>
                            {lastMessage && (
                              <p
                                className={cn(
                                  'text-sm truncate mt-1',
                                  isUnread ? 'text-white font-medium' : 'text-gray-400',
                                )}
                              >
                                {lastMessage.sender_id === effectiveUserId ? 'You: ' : ''}
                                {lastMessage.content}
                              </p>
                            )}
                            {conversation.trust_tier === 'request' && !conversation.accepted_at && (
                              <Badge variant="outline" className="mt-1 border-amber-500/40 text-amber-300 text-[10px]">
                                Pending request
                              </Badge>
                            )}
                          </div>
                          {isUnread && <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div
            className={cn(
              'flex-1 bg-slate-900/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex flex-col',
              !showThreadPane && 'hidden md:flex',
            )}
          >
            {showThreadPane ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedConversation(null)
                        clearPendingCompose()
                      }}
                      className="md:hidden text-slate-300 hover:bg-slate-800/60"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {(() => {
                      const otherParticipant = pendingRecipient
                        ? {
                            id: pendingRecipient.id,
                            username: pendingRecipient.username,
                            full_name: pendingRecipient.full_name,
                            avatar_url: pendingRecipient.avatar_url || undefined,
                          }
                        : selected
                          ? getOtherParticipant(selected)
                          : undefined
                      return otherParticipant ? (
                        <>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={otherParticipant.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {otherParticipant.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white truncate">{otherParticipant.full_name}</h3>
                            <p className="text-xs text-slate-400 truncate">@{otherParticipant.username}</p>
                            {pendingRecipient ? (
                              <p className="mt-1 text-[11px] text-slate-500">New conversation — nothing sent yet</p>
                            ) : null}
                            {!pendingRecipient && conversationChips.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {conversationChips.map((chip) => (
                                  <Badge
                                    key={chip.key}
                                    variant={chip.variant || 'secondary'}
                                    className="border-slate-600 text-[10px]"
                                  >
                                    {chip.label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : null
                    })()}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pendingRecipient ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400"
                        onClick={clearPendingCompose}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    {!pendingRecipient && viewerIsRequestRecipient && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={declineConversationRequest}
                          disabled={respondingTo === 'decline'}
                          className="border-slate-600 text-slate-200 hover:bg-slate-800/60"
                        >
                          {respondingTo === 'decline' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" /> Decline
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={acceptConversationRequest}
                          disabled={respondingTo === 'accept'}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {respondingTo === 'accept' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" /> Accept
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {!pendingRecipient && viewerIsRequestSender && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                        Waiting for response
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800/60">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages List */}
                <ScrollArea className="flex-1 p-4">
                  {pendingRecipient ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Write a message below to start the conversation.</p>
                    </div>
                  ) : loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === effectiveUserId
                        const taskCard = parseTaskCard(message.content)

                        return (
                          <div
                            key={message.id}
                            className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}
                          >
                            <div className={cn('max-w-[70%]', isOwnMessage ? 'order-2' : 'order-1')}>
                              <div className="flex items-start gap-2">
                                {!isOwnMessage && (
                                  <Avatar className="h-6 w-6 mt-1">
                                    <AvatarImage src={message.sender.avatar_url || ''} />
                                    <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                                      {message.sender.full_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="flex-1">
                                  {taskCard ? (
                                    <div
                                      className={cn(
                                        'p-3 rounded-2xl border',
                                        taskCard.isSensitive
                                          ? 'border-amber-500/30 bg-amber-500/5'
                                          : 'border-purple-500/30 bg-purple-500/5',
                                      )}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <ClipboardCheck
                                          className={cn(
                                            'h-4 w-4',
                                            taskCard.isSensitive ? 'text-amber-400' : 'text-purple-400',
                                          )}
                                        />
                                        <span className="text-xs font-medium text-slate-300">Task Assignment</span>
                                        {taskCard.isSensitive && (
                                          <Badge className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0">
                                            <Shield className="h-2.5 w-2.5 mr-0.5" /> Sensitive
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-semibold text-white">{taskCard.title}</p>
                                      {taskCard.description && (
                                        <p className="text-xs text-slate-400 mt-1">{taskCard.description}</p>
                                      )}
                                      {taskCard.actionUrl && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            window.location.href = taskCard.actionUrl!
                                          }}
                                          className="mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs h-7"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {taskCard.actionLabel || 'Go to Task'}
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        'p-3 rounded-2xl',
                                        isOwnMessage
                                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                                          : 'bg-slate-700 text-white',
                                      )}
                                    >
                                      {message.content && message.content !== '(attachment)' ? (
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                      ) : null}
                                      <MessageAttachments attachments={message.attachments || []} />
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1 text-right">
                                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Banners + Composer */}
                <div className="p-4 border-t border-slate-700/60 space-y-3">
                  {!viewer.canSend && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Viewer accounts can read messages but cannot send new messages.
                    </div>
                  )}
                  {!pendingRecipient && viewerIsRequestRecipient && (
                    <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-200 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Accept this request to start replying.
                    </div>
                  )}
                  {!pendingRecipient && viewerIsRequestSender && (
                    <div className="rounded-md border border-slate-600 bg-slate-800/40 px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Only one intro message is allowed until they accept your request.
                    </div>
                  )}
                  {pendingAttachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pendingAttachments.map((attachment) => (
                        <div
                          key={attachment.url}
                          className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/70 px-2 py-1 text-xs text-slate-200"
                        >
                          <span className="max-w-[140px] truncate">{attachment.name}</span>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-white"
                            onClick={() =>
                              setPendingAttachments((prev) => prev.filter((item) => item.url !== attachment.url))
                            }
                            aria-label={`Remove ${attachment.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,text/plain,audio/*"
                      onChange={(event) => void handleAttachmentPick(event.target.files)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="border-slate-600 bg-slate-800"
                      disabled={isComposerDisabled}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach file"
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <MessageEmojiPicker
                      disabled={isComposerDisabled}
                      onEmojiSelect={(emoji) => setNewMessage((prev) => `${prev}${emoji}`)}
                    />
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={composerPlaceholder}
                      className="flex-1 bg-slate-800 border-slate-600 text-white placeholder-gray-400 resize-none"
                      rows={1}
                      disabled={isComposerDisabled}
                    />
                    <Button
                      onClick={() => void sendMessage()}
                      disabled={isComposerDisabled || (!newMessage.trim() && pendingAttachments.length === 0)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                    <MessageSquare className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                  <p className="text-slate-400 max-w-sm">
                    Choose a thread from the left to start messaging. Use the tabs to find requests or work
                    conversations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: TabId }) {
  const Icon = TAB_DEFINITIONS.find((definition) => definition.id === tab)?.icon ?? MessageSquare
  const copy = EMPTY_COPY[tab]
  return (
    <div className="px-6 py-12 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{copy.title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mx-auto">{copy.body}</p>
    </div>
  )
}
