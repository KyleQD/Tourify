"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Heart,
  Layers3,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { toast } from "sonner"

import { FollowRequestsModal } from "@/components/profile/follow-requests-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useMultiAccount } from "@/hooks/use-multi-account"
import {
  ALL_NOTIFICATION_ACCOUNTS,
  filterNotificationsByAccount,
  findNotificationAccountOption,
  getOwnedNotificationAccountOptions,
  toNotificationAccountScopes,
  type NotificationAccountOption,
} from "@/lib/notifications/account-options"
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAccountNotificationsAsRead,
} from "@/lib/notifications/fetch-user-notifications"
import { supabase } from "@/lib/supabase"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  summary?: string | null
  metadata?: Record<string, unknown> | null
  related_user?: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
  is_read: boolean
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
  target_profile_id?: string | null
  target_account_type?: string | null
}

interface NotificationCenterProps {
  className?: string
}

const notificationIcons: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  like: { icon: <Heart className="h-4 w-4" />, color: "#fb7185", bgColor: "rgba(244, 63, 94, 0.12)" },
  comment: { icon: <MessageSquare className="h-4 w-4" />, color: "#60a5fa", bgColor: "rgba(59, 130, 246, 0.12)" },
  follow: { icon: <User className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  follow_request: { icon: <UserPlus className="h-4 w-4" />, color: "#c084fc", bgColor: "rgba(168, 85, 247, 0.14)" },
  follow_accepted: { icon: <CheckCircle className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  mention: { icon: <span className="text-sm font-bold">@</span>, color: "#fbbf24", bgColor: "rgba(245, 158, 11, 0.12)" },
  message: { icon: <MessageSquare className="h-4 w-4" />, color: "#a78bfa", bgColor: "rgba(139, 92, 246, 0.12)" },
  group_message: { icon: <Users className="h-4 w-4" />, color: "#a78bfa", bgColor: "rgba(139, 92, 246, 0.12)" },
  message_request: { icon: <AlertCircle className="h-4 w-4" />, color: "#fb923c", bgColor: "rgba(249, 115, 22, 0.12)" },
  event_invite: { icon: <Calendar className="h-4 w-4" />, color: "#22d3ee", bgColor: "rgba(6, 182, 212, 0.12)" },
  booking_request: { icon: <Star className="h-4 w-4" />, color: "#a3e635", bgColor: "rgba(132, 204, 22, 0.12)" },
  booking_accepted: { icon: <CheckCircle className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  booking_declined: { icon: <X className="h-4 w-4" />, color: "#fb7185", bgColor: "rgba(239, 68, 68, 0.12)" },
  system_alert: { icon: <AlertCircle className="h-4 w-4" />, color: "#fbbf24", bgColor: "rgba(245, 158, 11, 0.12)" },
  feature_update: { icon: <Sparkles className="h-4 w-4" />, color: "#c084fc", bgColor: "rgba(139, 92, 246, 0.12)" },
  job_application: { icon: <TrendingUp className="h-4 w-4" />, color: "#60a5fa", bgColor: "rgba(59, 130, 246, 0.12)" },
  collaboration_request: { icon: <Zap className="h-4 w-4" />, color: "#22d3ee", bgColor: "rgba(6, 182, 212, 0.12)" },
  collaboration_invite: { icon: <Users className="h-4 w-4" />, color: "#c084fc", bgColor: "rgba(168, 85, 247, 0.14)" },
  hiring_application_approved: { icon: <Briefcase className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  hiring_onboarding_invite: { icon: <ClipboardCheck className="h-4 w-4" />, color: "#a78bfa", bgColor: "rgba(139, 92, 246, 0.12)" },
  hiring_onboarding_changes_requested: { icon: <AlertCircle className="h-4 w-4" />, color: "#fbbf24", bgColor: "rgba(245, 158, 11, 0.12)" },
  hiring_roster_added: { icon: <Users className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  shift_assignment_invite: { icon: <Clock className="h-4 w-4" />, color: "#22d3ee", bgColor: "rgba(6, 182, 212, 0.12)" },
  shift_assignment_updated: { icon: <Clock className="h-4 w-4" />, color: "#fbbf24", bgColor: "rgba(245, 158, 11, 0.12)" },
  shift_assignment_cancelled: { icon: <X className="h-4 w-4" />, color: "#fb7185", bgColor: "rgba(239, 68, 68, 0.12)" },
  shift_assignment_response: { icon: <CheckCircle className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  achievement_unlocked: { icon: <Trophy className="h-4 w-4" />, color: "#34d399", bgColor: "rgba(16, 185, 129, 0.12)" },
  badge_granted: { icon: <Award className="h-4 w-4" />, color: "#fbbf24", bgColor: "rgba(245, 158, 11, 0.12)" },
  endorsement_received: { icon: <ThumbsUp className="h-4 w-4" />, color: "#38bdf8", bgColor: "rgba(56, 189, 248, 0.12)" },
}

function getDateHeading(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMMM d")
}

function getMetadataString(notification: Notification, key: string): string | null {
  const value = notification.metadata?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

function AccountAvatar({ option, className = "h-6 w-6" }: {
  option: NotificationAccountOption
  className?: string
}) {
  return (
    <Avatar className={`${className} border border-white/10`}>
      <AvatarImage src={option.avatarUrl || undefined} alt="" />
      <AvatarFallback className="bg-white/10 text-[10px] text-slate-200">
        {option.initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function EnhancedNotificationCenter({ className = "" }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isRequestsOpen, setIsRequestsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [inAppDisabled, setInAppDisabled] = useState(false)
  const [selectedAccountKey, setSelectedAccountKey] = useState(ALL_NOTIFICATION_ACCOUNTS)
  const [newlyViewedIds, setNewlyViewedIds] = useState<Set<string>>(new Set())
  const { userAccounts, isAccountsReady } = useMultiAccount()
  const notificationCenterRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(false)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ownedAccountOptions = useMemo(
    () => getOwnedNotificationAccountOptions(userAccounts),
    [userAccounts],
  )
  const hasPersonalAccount = ownedAccountOptions.some((option) => option.accountType === "general")
  const selectedAccount = ownedAccountOptions.find((option) => option.key === selectedAccountKey) ?? null

  const getAccountScopes = useCallback(
    (userId: string) => toNotificationAccountScopes(userId, ownedAccountOptions),
    [ownedAccountOptions],
  )

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setNewlyViewedIds(new Set())
  }, [])

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (
      selectedAccountKey !== ALL_NOTIFICATION_ACCOUNTS
      && !ownedAccountOptions.some((option) => option.key === selectedAccountKey)
    ) {
      setSelectedAccountKey(ALL_NOTIFICATION_ACCOUNTS)
    }
  }, [ownedAccountOptions, selectedAccountKey])

  const fetchPendingRequestCount = useCallback(async () => {
    if (!hasPersonalAccount) {
      setPendingRequestCount(0)
      return
    }

    try {
      const response = await fetch("/api/social/follow-request?action=pending", {
        credentials: "include",
      })
      if (!response.ok) {
        setPendingRequestCount(0)
        return
      }
      const data = await response.json()
      setPendingRequestCount(Array.isArray(data.requests) ? data.requests.length : 0)
    } catch {
      setPendingRequestCount(0)
    }
  }, [hasPersonalAccount])

  const refreshUnreadBadge = useCallback(async () => {
    if (!isAccountsReady) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setViewerId(null)
        setUnreadCount(0)
        return
      }

      setViewerId(session.user.id)
      const count = await fetchUnreadNotificationCount({
        supabase,
        userId: session.user.id,
        accountScopes: getAccountScopes(session.user.id),
      })
      setUnreadCount(count)
    } catch {
      // Preserve the last known count when the lightweight refresh fails.
    }
  }, [getAccountScopes, isAccountsReady])

  const acknowledgeUnread = useCallback(async (
    userId: string,
    visibleNotifications: Notification[],
  ) => {
    const unreadIds = visibleNotifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.id)

    if (unreadIds.length > 0) {
      setNewlyViewedIds((current) => new Set([...current, ...unreadIds]))
    }
    setUnreadCount(0)

    const { error } = await markAccountNotificationsAsRead({
      supabase,
      userId,
      accountScopes: getAccountScopes(userId),
    })

    if (!error) return

    const count = await fetchUnreadNotificationCount({
      supabase,
      userId,
      accountScopes: getAccountScopes(userId),
    })
    setUnreadCount(count)
    toast.error("Couldn’t reset the notification count")
  }, [getAccountScopes])

  const fetchNotifications = useCallback(async (options?: {
    acknowledge?: boolean
    quiet?: boolean
  }) => {
    if (!isAccountsReady) return

    try {
      if (!options?.quiet) setIsLoading(true)
      setHasError(false)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setViewerId(null)
        setNotifications([])
        setUnreadCount(0)
        setHasLoaded(true)
        return
      }

      const userId = session.user.id
      setViewerId(userId)
      const result = await fetchUserNotifications({
        supabase,
        userId,
        limit: 100,
        accountScopes: getAccountScopes(userId),
      })

      if (result.error) {
        setHasError(true)
        if (!options?.quiet) toast.error("Failed to fetch notifications")
        return
      }

      const nextNotifications = result.notifications as Notification[]
      setInAppDisabled(result.inAppDisabled)
      setNotifications(nextNotifications)
      setUnreadCount(result.unreadCount)
      setHasLoaded(true)

      if (options?.acknowledge && result.unreadCount > 0 && !result.inAppDisabled) {
        await acknowledgeUnread(userId, nextNotifications)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setHasError(true)
      if (!options?.quiet) toast.error("Failed to fetch notifications")
    } finally {
      setIsLoading(false)
    }
  }, [acknowledgeUnread, getAccountScopes, isAccountsReady])

  useEffect(() => {
    if (!isAccountsReady) return

    void refreshUnreadBadge()
    void fetchPendingRequestCount()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let disposed = false

    async function setupSubscription() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id || disposed) return

      channel = supabase
        .channel(`notifications-${session.user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          const updatedRow = payload.new as { is_read?: boolean }
          if (payload.eventType === "UPDATE" && updatedRow?.is_read === true) return

          if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
          realtimeTimerRef.current = setTimeout(() => {
            if (isOpenRef.current)
              void fetchNotifications({ acknowledge: true, quiet: true })
            else
              void refreshUnreadBadge()
          }, 120)
        })
        .subscribe()
    }

    void setupSubscription()

    return () => {
      disposed = true
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [fetchNotifications, fetchPendingRequestCount, isAccountsReady, refreshUnreadBadge])

  useEffect(() => {
    if (!isOpen) return
    void fetchNotifications({ acknowledge: true })
    void fetchPendingRequestCount()
  }, [fetchNotifications, fetchPendingRequestCount, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (notificationCenterRef.current?.contains(target)) return
      if (target instanceof Element && target.closest("[data-notification-center-portal]")) return

      closePanel()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [closePanel, isOpen])

  const markAsRead = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", session.user.id)

      if (error) {
        toast.error("Failed to mark notification as read")
        return
      }

      setNotifications((current) => current.map((notification) => (
        notification.id === id ? { ...notification, is_read: true } : notification
      )))
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id)

      if (error) {
        toast.error("Failed to delete notification")
        return
      }

      setNotifications((current) => {
        const deleted = current.find((notification) => notification.id === id)
        if (deleted && !deleted.is_read && !newlyViewedIds.has(id))
          setUnreadCount((count) => Math.max(0, count - 1))
        return current.filter((notification) => notification.id !== id)
      })
      setNewlyViewedIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  function openFriendRequests() {
    closePanel()
    setIsRequestsOpen(true)
  }

  function getNotificationLink(notification: Notification): string | null {
    const directLink = getMetadataString(notification, "link")
    if (directLink) return directLink
    const conversationId = getMetadataString(notification, "conversation_id")

    switch (notification.type) {
      case "message":
      case "message_request":
      case "group_message":
        return conversationId ? `/messages?conversation=${conversationId}` : "/messages"
      case "hiring_onboarding_invite":
      case "hiring_onboarding_changes_requested":
        return getMetadataString(notification, "onboarding_url")
          || (conversationId ? `/messages?tab=work&conversation=${conversationId}` : "/messages?tab=work")
      case "hiring_application_approved":
      case "hiring_roster_added":
        return conversationId ? `/messages?tab=work&conversation=${conversationId}` : "/messages?tab=work"
      case "shift_assignment_invite":
      case "shift_assignment_updated":
      case "shift_assignment_cancelled":
        return "/messages?tab=work"
      case "shift_assignment_response":
        return "/admin/dashboard/staff?tab=scheduling"
      case "booking_request":
        return "/bookings/requests"
      case "event_invite": {
        const eventId = getMetadataString(notification, "eventId")
        return eventId ? `/events/${eventId}` : "/events"
      }
      case "follow":
      case "follow_accepted":
        return notification.related_user?.username
          ? `/profile/${notification.related_user.username}`
          : null
      case "achievement_unlocked": {
        const achievementId = getMetadataString(notification, "achievement_id")
        return achievementId
          ? `/achievements?tab=achievements&highlight=${achievementId}`
          : "/achievements?tab=achievements"
      }
      case "badge_granted": {
        const badgeId = getMetadataString(notification, "badge_id")
        return badgeId
          ? `/achievements?tab=badges&highlight=${badgeId}`
          : "/achievements?tab=badges"
      }
      case "endorsement_received":
        return "/achievements?tab=endorsements"
      default:
        return null
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read && !newlyViewedIds.has(notification.id))
      await markAsRead(notification.id)

    if (notification.type === "follow_request") {
      openFriendRequests()
      return
    }

    const link = getNotificationLink(notification)
    if (link) window.location.href = link
  }

  const filteredNotifications = useMemo(() => filterNotificationsByAccount(
    notifications,
    selectedAccountKey,
    viewerId || ownedAccountOptions.find((option) => option.accountType === "general")?.profileId || "",
    ownedAccountOptions,
  ), [notifications, ownedAccountOptions, selectedAccountKey, viewerId])

  const groupedNotifications = useMemo(() => filteredNotifications.reduce((groups, notification) => {
    const key = format(new Date(notification.created_at), "yyyy-MM-dd")
    if (!groups[key]) groups[key] = []
    groups[key].push(notification)
    return groups
  }, {} as Record<string, Notification[]>), [filteredNotifications])

  function renderLoadingState() {
    return (
      <div className="space-y-1 p-2" aria-label="Loading notifications">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-3 rounded-xl px-3 py-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3 bg-white/10" />
              <Skeleton className="h-3 w-full bg-white/[0.07]" />
              <Skeleton className="h-3 w-1/3 bg-white/[0.07]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderListBody() {
    if (isLoading && !hasLoaded) return renderLoadingState()

    if (hasError) {
      return (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-100">Couldn’t load notifications</p>
          <p className="mt-1 text-xs text-slate-500">Check your connection and try again.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchNotifications({ acknowledge: true })}
            className="mt-3 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
          >
            Try again
          </Button>
        </div>
      )
    }

    if (inAppDisabled) {
      return (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-slate-400">
            <Bell className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-100">In-app notifications are off</p>
          <p className="mt-1 text-xs text-slate-500">Turn them back on from notification settings.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { window.location.href = "/settings/notifications" }}
            className="mt-3 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
          >
            Open settings
          </Button>
        </div>
      )
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400">
            <Bell className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-100">
            {selectedAccount ? `No notifications for ${selectedAccount.displayName}` : "You’re all caught up"}
          </p>
          <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">
            {selectedAccount
              ? "New activity for this account will appear here."
              : "Recent activity across your accounts will appear here."}
          </p>
        </div>
      )
    }

    return (
      <div className="pb-2">
        {Object.entries(groupedNotifications).map(([dateKey, dayNotifications]) => (
          <section key={dateKey} aria-labelledby={`notification-day-${dateKey}`}>
            <div
              id={`notification-day-${dateKey}`}
              className="sticky top-0 z-10 border-y border-white/[0.06] bg-[#0d1424]/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl"
            >
              {getDateHeading(new Date(dayNotifications[0].created_at))}
            </div>

            {dayNotifications.map((notification) => {
              const icon = notificationIcons[notification.type]
                || { icon: <Bell className="h-4 w-4" />, color: "#94a3b8", bgColor: "rgba(148, 163, 184, 0.1)" }
              const account = viewerId
                ? findNotificationAccountOption(notification, viewerId, ownedAccountOptions)
                : null
              const newlyViewed = newlyViewedIds.has(notification.id)
              const unread = !notification.is_read && !newlyViewed
              const emphasized = unread || newlyViewed
              const link = getNotificationLink(notification)

              return (
                <div
                  key={notification.id}
                  role={link || notification.type === "follow_request" ? "link" : "group"}
                  tabIndex={link || notification.type === "follow_request" ? 0 : undefined}
                  aria-label={`${notification.title}. ${notification.content}`}
                  onClick={() => void handleNotificationClick(notification)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      void handleNotificationClick(notification)
                    }
                  }}
                  className={`group relative flex cursor-pointer gap-3 border-b border-white/[0.055] px-4 py-3.5 outline-none transition-colors last:border-b-0 hover:bg-white/[0.045] focus-visible:bg-white/[0.06] ${
                    emphasized ? "bg-purple-500/[0.055]" : "bg-transparent"
                  }`}
                >
                  {emphasized && <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-purple-400" />}

                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                    style={{ backgroundColor: icon.bgColor, color: icon.color }}
                  >
                    {icon.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${emphasized ? "text-white" : "text-slate-200"}`}>
                          {notification.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {notification.content}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${notification.title}`}
                            className="h-7 w-7 shrink-0 text-slate-500 opacity-100 hover:bg-white/[0.06] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent data-notification-center-portal align="end" className="border-white/10 bg-[#111827]/95 text-slate-200 shadow-2xl backdrop-blur-xl">
                          {unread && (
                            <DropdownMenuItem
                              onSelect={() => void markAsRead(notification.id)}
                              className="focus:bg-white/10 focus:text-white"
                            >
                              <Check className="h-4 w-4" />
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => void deleteNotification(notification.id)}
                            className="text-red-300 focus:bg-red-500/10 focus:text-red-200"
                          >
                            <X className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {notification.related_user && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Avatar className="h-4 w-4 border border-white/10">
                          <AvatarImage src={notification.related_user.avatar_url || undefined} alt="" />
                          <AvatarFallback className="bg-white/10 text-[8px]">
                            {(notification.related_user.full_name || notification.related_user.username || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {notification.related_user.full_name || notification.related_user.username}
                        </span>
                      </div>
                    )}

                    {notification.type === "follow_request" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 px-2 text-xs text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleNotificationClick(notification)
                        }}
                      >
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        Review request
                      </Button>
                    )}

                    <div className="mt-2.5 flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-[10px] text-slate-600">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {account && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-1.5 py-1 text-[10px] text-slate-400">
                            <AccountAvatar option={account} className="h-4 w-4" />
                            <span className="max-w-28 truncate">{account.displayName}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        ))}

        <div className="px-4 py-4 text-center text-[10px] uppercase tracking-[0.16em] text-slate-600">
          You’re up to date
        </div>
      </div>
    )
  }

  return (
    <div ref={notificationCenterRef} className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="notification-center-panel"
        className="relative rounded-full text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        onClick={() => {
          if (isOpen) closePanel()
          else setIsOpen(true)
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border-2 border-[#0b1020] bg-gradient-to-r from-rose-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/20">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="notification-center-panel"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[26rem]"
          >
            <Card className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111a2e]/[0.98] to-[#0a101d]/[0.98] text-white shadow-2xl shadow-black/50 backdrop-blur-2xl">
              <div className="border-b border-white/[0.07] px-4 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold tracking-tight text-white">Notifications</h2>
                        <p className="text-[11px] text-slate-500">Latest activity across your accounts</p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Notification settings"
                        className="h-8 w-8 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent data-notification-center-portal align="end" className="border-white/10 bg-[#111827]/95 text-slate-200 shadow-2xl backdrop-blur-xl">
                      <DropdownMenuItem
                        onSelect={() => { window.location.href = "/settings/notifications" }}
                        className="focus:bg-white/10 focus:text-white"
                      >
                        <Settings className="h-4 w-4" />
                        Notification settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-3 h-11 w-full justify-between rounded-xl border-white/[0.09] bg-white/[0.035] px-3 text-left text-slate-200 hover:border-purple-400/20 hover:bg-white/[0.055] hover:text-white"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {selectedAccount ? (
                          <AccountAvatar option={selectedAccount} className="h-7 w-7" />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15">
                            <Layers3 className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">
                            {selectedAccount?.displayName || "All accounts"}
                          </span>
                          <span className="block truncate text-[10px] text-slate-500">
                            {selectedAccount?.typeLabel || `${ownedAccountOptions.length} owned account${ownedAccountOptions.length === 1 ? "" : "s"}`}
                          </span>
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-notification-center-portal
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 border-white/10 bg-[#111827]/[0.98] p-1.5 text-slate-200 shadow-2xl backdrop-blur-xl"
                  >
                    <DropdownMenuLabel className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      View notifications for
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={selectedAccountKey} onValueChange={setSelectedAccountKey}>
                      <DropdownMenuRadioItem
                        value={ALL_NOTIFICATION_ACCOUNTS}
                        className="gap-2.5 rounded-lg py-2 pl-8 focus:bg-white/[0.07] focus:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-purple-300">
                          <Layers3 className="h-3.5 w-3.5" />
                        </span>
                        <span>
                          <span className="block text-xs font-medium">All accounts</span>
                          <span className="block text-[10px] text-slate-500">Combined activity feed</span>
                        </span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator className="my-1.5 bg-white/[0.07]" />
                      {ownedAccountOptions.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.key}
                          value={option.key}
                          className="gap-2.5 rounded-lg py-2 pl-8 focus:bg-white/[0.07] focus:text-white"
                        >
                          <AccountAvatar option={option} className="h-7 w-7" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{option.displayName}</span>
                            <span className="block text-[10px] text-slate-500">{option.typeLabel}</span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {pendingRequestCount > 0 && (
                  <Button
                    variant="ghost"
                    onClick={openFriendRequests}
                    className="mt-2 h-8 w-full justify-between rounded-lg px-2.5 text-xs text-purple-200 hover:bg-purple-500/10 hover:text-purple-100"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Friend requests
                    </span>
                    <Badge className="h-5 border-0 bg-purple-500/20 px-1.5 text-[10px] text-purple-100">
                      {pendingRequestCount}
                    </Badge>
                  </Button>
                )}
              </div>

              <CardContent className="p-0">
                <ScrollArea className="h-[min(60vh,30rem)]">
                  {renderListBody()}
                </ScrollArea>
                <div className="border-t border-white/[0.07] bg-black/10 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { window.location.href = "/notifications" }}
                    className="h-8 w-full justify-center gap-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  >
                    View all notifications
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <FollowRequestsModal
        isOpen={isRequestsOpen}
        onClose={() => {
          setIsRequestsOpen(false)
          void fetchPendingRequestCount()
          void fetchNotifications()
        }}
        onRequestsChanged={() => {
          void fetchPendingRequestCount()
          void fetchNotifications()
        }}
      />
    </div>
  )
}
