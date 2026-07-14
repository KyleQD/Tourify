"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Bell, Check, X, Settings, Filter, Search, MoreHorizontal, Heart, MessageSquare,
  User, AlertCircle, Calendar, Star, CheckCircle, Sparkles, TrendingUp, Zap,
  Briefcase, ClipboardCheck, UserPlus, Users, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useMultiAccount } from "@/hooks/use-multi-account"
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
} from "@/lib/notifications/fetch-user-notifications"
import { FollowRequestsModal } from "@/components/profile/follow-requests-modal"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  summary?: string
  metadata?: Record<string, any>
  related_user?: {
    id: string
    full_name: string | null
    username: string
    avatar_url: string | null
  } | null
  is_read: boolean
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
}

interface NotificationCenterProps {
  className?: string
}

const notificationIcons: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  like: { icon: <Heart className="h-4 w-4" />, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  comment: { icon: <MessageSquare className="h-4 w-4" />, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" },
  follow: { icon: <User className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  follow_request: { icon: <UserPlus className="h-4 w-4" />, color: "#a855f7", bgColor: "rgba(168, 85, 247, 0.15)" },
  follow_accepted: { icon: <CheckCircle className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  mention: { icon: <span className="text-sm font-bold">@</span>, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
  message: { icon: <MessageSquare className="h-4 w-4" />, color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)" },
  message_request: { icon: <AlertCircle className="h-4 w-4" />, color: "#f97316", bgColor: "rgba(249, 115, 22, 0.1)" },
  event_invite: { icon: <Calendar className="h-4 w-4" />, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)" },
  booking_request: { icon: <Star className="h-4 w-4" />, color: "#84cc16", bgColor: "rgba(132, 204, 22, 0.1)" },
  booking_accepted: { icon: <CheckCircle className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  booking_declined: { icon: <X className="h-4 w-4" />, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  system_alert: { icon: <AlertCircle className="h-4 w-4" />, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
  feature_update: { icon: <Sparkles className="h-4 w-4" />, color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)" },
  job_application: { icon: <TrendingUp className="h-4 w-4" />, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" },
  collaboration_request: { icon: <Zap className="h-4 w-4" />, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)" },
  hiring_application_approved: { icon: <Briefcase className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  hiring_onboarding_invite: { icon: <ClipboardCheck className="h-4 w-4" />, color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)" },
  hiring_onboarding_changes_requested: { icon: <AlertCircle className="h-4 w-4" />, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
  hiring_roster_added: { icon: <Users className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  shift_assignment_invite: { icon: <Clock className="h-4 w-4" />, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)" },
  shift_assignment_updated: { icon: <Clock className="h-4 w-4" />, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
  shift_assignment_cancelled: { icon: <X className="h-4 w-4" />, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  shift_assignment_response: { icon: <CheckCircle className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
}

export function EnhancedNotificationCenter({ className = "" }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isRequestsOpen, setIsRequestsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [inAppDisabled, setInAppDisabled] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const { currentAccount } = useMultiAccount()
  const isOpenRef = useRef(false)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const fetchPendingRequestCount = useCallback(async () => {
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
  }, [])

  const refreshUnreadBadge = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setUnreadCount(0)
        return
      }
      const count = await fetchUnreadNotificationCount({
        supabase,
        userId: session.user.id,
      })
      setUnreadCount(count)
    } catch {
      // keep prior badge
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setHasError(false)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setNotifications([])
        setUnreadCount(0)
        setHasLoaded(true)
        return
      }

      const result = await fetchUserNotifications({
        supabase,
        userId: session.user.id,
        limit: 100,
        targetProfileId: currentAccount?.profile_id,
        accountType: currentAccount?.account_type,
      })

      if (result.error) {
        setHasError(true)
        toast.error("Failed to fetch notifications")
        return
      }

      setInAppDisabled(result.inAppDisabled)
      setNotifications(result.notifications as Notification[])
      setUnreadCount(result.unreadCount)
      setHasLoaded(true)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setHasError(true)
      toast.error("Failed to fetch notifications")
    } finally {
      setIsLoading(false)
    }
  }, [currentAccount?.account_type, currentAccount?.profile_id])

  // Mount: badge + follow requests only (defer full list until panel opens).
  useEffect(() => {
    void refreshUnreadBadge()
    void fetchPendingRequestCount()
    setIsLoading(false)

    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setupSubscription() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      channel = supabase
        .channel(`notifications-${session.user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        }, () => {
          void refreshUnreadBadge()
          if (isOpenRef.current) void fetchNotifications()
        })
        .subscribe()
    }

    void setupSubscription()

    return () => {
      if (channel)
        supabase.removeChannel(channel)
    }
  }, [fetchPendingRequestCount, refreshUnreadBadge, fetchNotifications])

  useEffect(() => {
    if (!isOpen) return
    void fetchNotifications()
    void fetchPendingRequestCount()
  }, [isOpen, fetchNotifications, fetchPendingRequestCount])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        toast.error("Failed to mark notification as read")
        return
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id)
        .eq("is_read", false)

      if (error) {
        toast.error("Failed to mark notifications as read")
        return
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark notifications as read")
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)

      if (error) {
        toast.error("Failed to delete notification")
        return
      }

      setNotifications((prev) => {
        const deleted = prev.find((n) => n.id === id)
        if (deleted && !deleted.is_read)
          setUnreadCount((count) => Math.max(0, count - 1))
        return prev.filter((n) => n.id !== id)
      })
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  function openFriendRequests() {
    setIsOpen(false)
    setIsRequestsOpen(true)
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read)
      await markAsRead(notification.id)

    if (notification.type === "follow_request") {
      openFriendRequests()
      return
    }

    const link = getNotificationLink(notification)
    if (link)
      window.location.href = link
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || notification.type === filterType
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "unread" && !notification.is_read) ||
      (activeTab === "read" && notification.is_read)

    return matchesSearch && matchesType && matchesTab
  })

  const totalUnreadCount = notifications.filter((n) => !n.is_read).length
  const totalReadCount = notifications.length - totalUnreadCount

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toDateString()
    if (!groups[date])
      groups[date] = []
    groups[date].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  function getNotificationIcon(type: string) {
    return notificationIcons[type] || { icon: "🔔", color: "#6b7280", bgColor: "#f9fafb" }
  }

  function getNotificationLink(notification: Notification) {
    if (notification.metadata?.link) return notification.metadata.link as string
    const conversationId = notification.metadata?.conversation_id

    switch (notification.type) {
      case "message":
      case "message_request":
        if (conversationId) return `/messages?conversation=${conversationId}`
        return "/messages"
      case "hiring_onboarding_invite":
      case "hiring_onboarding_changes_requested":
        return (notification.metadata?.onboarding_url as string) ||
          (conversationId ? `/messages?tab=work&conversation=${conversationId}` : "/messages?tab=work")
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
      case "event_invite":
        return `/events/${notification.metadata?.eventId}`
      case "follow":
      case "follow_accepted":
        return notification.related_user?.username
          ? `/profile/${notification.related_user.username}`
          : null
      default:
        return null
    }
  }

  function renderListBody() {
    if (isLoading && !hasLoaded) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      )
    }

    if (hasError) {
      return (
        <div className="px-4 py-10 text-center text-slate-400">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-400/70" />
          <p className="text-sm text-red-300">Couldn&apos;t load notifications</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            className="mt-3 text-purple-300 hover:bg-purple-500/10"
          >
            Try again
          </Button>
        </div>
      )
    }

    if (inAppDisabled) {
      return (
        <div className="px-4 py-10 text-center text-slate-400">
          <Bell className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm">In-app notifications are turned off</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { window.location.href = "/settings/notifications" }}
            className="mt-3 text-purple-300 hover:bg-purple-500/10"
          >
            Open settings
          </Button>
        </div>
      )
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="px-4 py-10 text-center text-slate-400">
          <Bell className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm">No notifications</p>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
          <div key={date}>
            <div className="border-b border-slate-700/30 bg-slate-800/30 px-4 py-2 text-xs font-medium text-slate-400">
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </div>
            {dayNotifications.map((notification) => {
              const icon = getNotificationIcon(notification.type)

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`group cursor-pointer border-l-2 p-4 transition-all duration-200 hover:bg-slate-700/30 ${
                    !notification.is_read
                      ? "border-l-purple-500 bg-purple-500/5"
                      : "border-l-transparent"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-600/30 text-lg backdrop-blur-sm"
                      style={{ backgroundColor: icon.bgColor, color: icon.color }}
                    >
                      {icon.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.is_read ? "text-white" : "text-slate-300"}`}>
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {notification.content}
                          </p>

                          {notification.related_user && (
                            <div className="mt-2 flex items-center gap-2">
                              <Avatar className="h-5 w-5 ring-1 ring-slate-600/30">
                                <AvatarImage src={notification.related_user.avatar_url || undefined} />
                                <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                                  {(notification.related_user.full_name || notification.related_user.username || "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-slate-400">
                                {notification.related_user.full_name || notification.related_user.username}
                              </span>
                            </div>
                          )}

                          {notification.type === "follow_request" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-7 px-2 text-xs text-purple-300 hover:bg-purple-500/10 hover:text-purple-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleNotificationClick(notification)
                              }}
                            >
                              <Users className="mr-1.5 h-3.5 w-3.5" />
                              Review request
                            </Button>
                          )}

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:bg-slate-700/50 hover:text-white group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-slate-700/50 bg-slate-800/95 backdrop-blur-xl">
                            {!notification.is_read && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="text-slate-200 hover:bg-slate-700/50"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full text-slate-300 transition-all duration-300 hover:bg-slate-700/50 hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center border-0 bg-gradient-to-r from-red-500 to-pink-500 p-0 text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] max-h-[600px] sm:w-96"
          >
            <Card className="border border-slate-700/50 bg-gradient-to-b from-slate-900/95 to-slate-800/95 shadow-2xl backdrop-blur-xl">
              <CardHeader className="border-b border-slate-700/50 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Notifications
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs text-purple-300 hover:bg-purple-500/10 hover:text-purple-100"
                      >
                        Mark all read
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:bg-slate-700/50 hover:text-white">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-slate-700/50 bg-slate-800/95 backdrop-blur-xl">
                        <DropdownMenuItem
                          onClick={() => { window.location.href = "/settings/notifications" }}
                          className="text-slate-200 hover:bg-slate-700/50"
                        >
                          Notification Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { window.location.href = "/notifications" }}
                          className="text-slate-200 hover:bg-slate-700/50"
                        >
                          View All Notifications
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={openFriendRequests}
                  className="mt-3 h-9 w-full justify-between rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 text-sm text-purple-200 hover:bg-purple-500/20 hover:text-purple-100"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Friend requests
                  </span>
                  {pendingRequestCount > 0 && (
                    <Badge className="border-0 bg-purple-500/30 text-purple-100">
                      {pendingRequestCount}
                    </Badge>
                  )}
                </Button>

                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 border-slate-700/50 bg-slate-800/50 pl-10 text-white placeholder:text-slate-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border-0 bg-transparent text-sm text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="follow_request">Follow requests</option>
                      <option value="follow_accepted">Follow accepted</option>
                      <option value="like">Likes</option>
                      <option value="comment">Comments</option>
                      <option value="follow">Follows</option>
                      <option value="message">Messages</option>
                      <option value="message_request">Message requests</option>
                      <option value="group_message">Group messages</option>
                      <option value="mention">Mentions</option>
                      <option value="job_application">Applications</option>
                      <option value="booking_request">Bookings</option>
                      <option value="system_alert">System</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 border border-slate-700/50 bg-slate-800/50">
                    <TabsTrigger value="all" className="text-xs text-slate-300 data-[state=active]:border-purple-500/30 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
                      All ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs text-slate-300 data-[state=active]:border-purple-500/30 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
                      Unread ({totalUnreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="read" className="text-xs text-slate-300 data-[state=active]:border-purple-500/30 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
                      Read ({totalReadCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-0">
                    <ScrollArea className="h-[400px]">
                      {renderListBody()}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

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
