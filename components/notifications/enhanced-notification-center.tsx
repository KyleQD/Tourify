"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Check, X, Settings, Filter, Search, MoreHorizontal, Heart, MessageSquare, User, AlertCircle, Calendar, Star, CheckCircle, Sparkles, TrendingUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
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
    full_name: string
    username: string
    avatar_url: string
  }
  is_read: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}

interface NotificationCenterProps {
  className?: string
}

const notificationIcons: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  like: { icon: <Heart className="h-4 w-4" />, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  comment: { icon: <MessageSquare className="h-4 w-4" />, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" },
  follow: { icon: <User className="h-4 w-4" />, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
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
  collaboration_request: { icon: <Zap className="h-4 w-4" />, color: "#06b6d4", bgColor: "rgba(6, 182, 212, 0.1)" }
}

export function EnhancedNotificationCenter({ className = "" }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  // NOTE: account-scoped filtering is intentionally disabled — the `account_id` column
  // doesn't exist on the `notifications` table yet, so the previous filter was a no-op.

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: prefsRow } = await supabase
        .from("notification_preferences")
        .select("in_app_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (prefsRow && prefsRow.in_app_enabled === false) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          related_user:profiles!notifications_related_user_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        toast.error("Failed to fetch notifications")
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)

    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast.error("Failed to fetch notifications")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    fetchNotifications()

    // Get current user ID for filtering
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const channel = supabase
        .channel(`notifications-${session.user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, () => {
          fetchNotifications()
        })
        .subscribe()

      return channel
    }

    let channel: any
    setupSubscription().then(ch => {
      channel = ch
    })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchNotifications])

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) {
        toast.error("Failed to mark notification as read")
        return
      }

      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from("notifications")
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq("user_id", session.user.id)
        .eq("is_read", false)

      if (error) {
        toast.error("Failed to mark notifications as read")
        return
      }

      fetchNotifications()
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark notifications as read")
    }
  }

  // Delete notification
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

      fetchNotifications()
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || notification.type === filterType
    const matchesTab = activeTab === "all" ||
                      (activeTab === "unread" && !notification.is_read) ||
                      (activeTab === "read" && notification.is_read)

    return matchesSearch && matchesType && matchesTab
  })

  // Counts must be computed from the full notification set, not the search/type-filtered
  // view, so tab badges remain stable while the user types in the search box.
  const totalUnreadCount = notifications.filter((notification) => !notification.is_read).length
  const totalReadCount = notifications.length - totalUnreadCount

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    return notificationIcons[type] || { icon: "🔔", color: "#6b7280", bgColor: "#f9fafb" }
  }

  // Get notification link
  const getNotificationLink = (notification: Notification) => {
    if (notification.metadata?.link) return notification.metadata.link
    const conversationId = notification.metadata?.conversation_id
    
    switch (notification.type) {
      case 'message':
      case 'message_request':
        if (conversationId) return `/messages?conversation=${conversationId}`
        return '/messages'
      case 'booking_request':
        return `/bookings/requests`
      case 'event_invite':
        return `/events/${notification.metadata?.eventId}`
      case 'follow':
        return `/profile/${notification.related_user?.username}`
      default:
        return null
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-full transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-red-500 to-pink-500 border-0 animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-96 max-h-[600px] z-50"
          >
            <Card className="shadow-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Notifications
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={markAllAsRead}
                        className="text-xs text-purple-300 hover:text-purple-100 hover:bg-purple-500/10"
                      >
                        Mark all read
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700/50">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800/95 border border-slate-700/50 backdrop-blur-xl">
                        <DropdownMenuItem 
                          onClick={() => window.location.href = '/settings/notifications'}
                          className="text-slate-200 hover:bg-slate-700/50"
                        >
                          Notification Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => window.location.href = '/notifications'}
                          className="text-slate-200 hover:bg-slate-700/50"
                        >
                          View All Notifications
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="text-sm border-0 bg-transparent focus:outline-none text-slate-300"
                    >
                      <option value="all">All Types</option>
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
                  <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50">
                    <TabsTrigger value="all" className="text-xs text-slate-300 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30">
                      All ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs text-slate-300 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30">
                      Unread ({totalUnreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="read" className="text-xs text-slate-300 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30">
                      Read ({totalReadCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-0">
                    <ScrollArea className="h-[400px]">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                        </div>
                      ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                            <div key={date}>
                              <div className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800/30 border-b border-slate-700/30">
                                {formatDistanceToNow(new Date(date), { addSuffix: true })}
                              </div>
                              {dayNotifications.map((notification) => {
                                const icon = getNotificationIcon(notification.type)
                                const link = getNotificationLink(notification)
                                
                                return (
                                  <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-4 hover:bg-slate-700/30 transition-all duration-200 cursor-pointer border-l-2 ${
                                      !notification.is_read ? 'bg-purple-500/5 border-l-purple-500' : 'border-l-transparent'
                                    }`}
                                    onClick={() => {
                                      if (!notification.is_read) {
                                        markAsRead(notification.id)
                                      }
                                      if (link) {
                                        window.location.href = link
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Notification Icon */}
                                      <div 
                                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg backdrop-blur-sm border border-slate-600/30"
                                        style={{ backgroundColor: icon.bgColor, color: icon.color }}
                                      >
                                        {icon.icon}
                                      </div>

                                      {/* Notification Content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <p className={`text-sm font-medium ${!notification.is_read ? 'text-white' : 'text-slate-300'}`}>
                                              {notification.title}
                                            </p>
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                              {notification.content}
                                            </p>
                                            
                                            {/* Related User */}
                                            {notification.related_user && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <Avatar className="h-5 w-5 ring-1 ring-slate-600/30">
                                                  <AvatarImage src={notification.related_user.avatar_url} />
                                                  <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
                                                    {notification.related_user.full_name?.charAt(0) || notification.related_user.username?.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-slate-400">
                                                  {notification.related_user.full_name || notification.related_user.username}
                                                </span>
                                              </div>
                                            )}

                                            {/* Timestamp */}
                                            <p className="text-xs text-slate-500 mt-2">
                                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                          </div>

                                          {/* Actions */}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white hover:bg-slate-700/50"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <MoreHorizontal className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-800/95 border border-slate-700/50 backdrop-blur-xl">
                                              {!notification.is_read && (
                                                <DropdownMenuItem 
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    markAsRead(notification.id)
                                                  }}
                                                  className="text-slate-200 hover:bg-slate-700/50"
                                                >
                                                  <Check className="h-4 w-4 mr-2" />
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
                                                <X className="h-4 w-4 mr-2" />
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
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 