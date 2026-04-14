"use client"

import { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/auth/role-based-auth'
import { useAnnouncements } from '@/hooks/use-real-time-communications'
import { themeUtils } from '@/lib/design-system/theme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { 
  Bell, 
  BellOff, 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Radio,
  MessageSquare,
  Calendar,
  Users
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

interface Notification {
  id: string
  type: 'announcement' | 'message' | 'system' | 'tour' | 'event' | 'task'
  title: string
  content: string
  priority: 'emergency' | 'urgent' | 'important' | 'general'
  isRead: boolean
  timestamp: Date
  actionUrl?: string
  actionLabel?: string
  icon?: any
}

// =============================================================================
// NOTIFICATION CENTER PROPS
// =============================================================================

interface NotificationCenterProps {
  user: UserProfile
}

// =============================================================================
// NOTIFICATION CENTER COMPONENT
// =============================================================================

export function NotificationCenter({ user }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all')

  // Real-time announcements
  const { 
    announcements, 
    urgentAnnouncements,
    acknowledgeAnnouncement 
  } = useAnnouncements()

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Convert announcements to notifications
  useEffect(() => {
    const announcementNotifications: Notification[] = announcements.map(announcement => ({
      id: announcement.id,
      type: 'announcement',
      title: announcement.subject,
      content: announcement.content,
      priority: announcement.priority as any,
      isRead: false, // In real app, track read status
      timestamp: new Date(announcement.created_at),
      icon: announcement.priority === 'emergency' ? AlertTriangle : 
            announcement.priority === 'urgent' ? Clock : 
            Radio
    }))

    // Add some mock system notifications for demo
    const systemNotifications: Notification[] = [
      {
        id: 'sys-1',
        type: 'system',
        title: 'Platform Update',
        content: 'Real-time synchronization is now active across all features',
        priority: 'general',
        isRead: false,
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        icon: CheckCircle
      },
      {
        id: 'tour-1',
        type: 'tour',
        title: 'Tour Schedule Updated',
        content: 'Your tour schedule has been updated with new venue information',
        priority: 'important',
        isRead: true,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        actionUrl: '/tour/schedule',
        actionLabel: 'View Schedule',
        icon: Calendar
      }
    ]

    setNotifications([...announcementNotifications, ...systemNotifications])
  }, [announcements])

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    )

    // If it's an announcement, acknowledge it
    const notification = notifications.find(n => n.id === notificationId)
    if (notification?.type === 'announcement') {
      acknowledgeAnnouncement(notificationId)
    }
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    )
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  // =============================================================================
  // FILTERING
  // =============================================================================

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'important':
        return notification.priority === 'emergency' || notification.priority === 'urgent'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.isRead).length
  const importantCount = notifications.filter(n => 
    !n.isRead && (n.priority === 'emergency' || n.priority === 'urgent')
  ).length

  // =============================================================================
  // NOTIFICATION ITEM COMPONENT
  // =============================================================================

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const priorityClasses = themeUtils.getPriorityClasses(notification.priority)
    const Icon = notification.icon || Bell

    return (
      <div className={`p-4 rounded-lg border transition-colors ${
        notification.isRead
          ? 'bg-slate-800/30 border-slate-700/50'
          : 'bg-slate-800/50 border-slate-600/50'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-1.5 rounded-md ${priorityClasses.split(' ')[1]}`}>
            <Icon className={`h-4 w-4 ${priorityClasses.split(' ')[0]}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className={`text-sm font-medium ${
                notification.isRead ? 'text-slate-300' : 'text-white'
              }`}>
                {notification.title}
              </h4>
              
              <div className="flex items-center space-x-2 ml-2">
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 h-auto text-slate-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <p className={`text-sm mt-1 ${
              notification.isRead ? 'text-slate-400' : 'text-slate-300'
            }`}>
              {notification.content}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </span>
              
              {notification.actionUrl && notification.actionLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    // Handle navigation
                    handleMarkAsRead(notification.id)
                  }}
                >
                  {notification.actionLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-slate-400 hover:text-white p-2"
        >
          {unreadCount > 0 ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          {unreadCount > 0 && (
            <Badge 
              variant="outline" 
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs ${
                importantCount > 0 
                  ? 'bg-red-500 text-white border-red-400' 
                  : 'bg-blue-500 text-white border-blue-400'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-96 bg-slate-900 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {unreadCount} unread
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Stay updated with real-time platform notifications
          </SheetDescription>
        </SheetHeader>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-4 bg-slate-800/50 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'important', label: 'Important', count: importantCount }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(tab.key as any)}
              className="flex-1 text-xs"
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-xs">
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex space-x-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="flex-1 text-xs"
              disabled={unreadCount === 0}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 mb-1">No notifications</p>
                <p className="text-sm text-slate-500">
                  {filter === 'all' 
                    ? "You're all caught up!" 
                    : filter === 'unread'
                    ? "No unread notifications"
                    : "No important notifications"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 group">
                {filteredNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}