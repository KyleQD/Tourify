"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  MessageSquare, 
  Heart, 
  Calendar, 
  Users, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface NotificationDemoProps {
  className?: string
}

export function NotificationDemo({ className = "" }: NotificationDemoProps) {
  const [isLoading, setIsLoading] = useState(false)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...(input?.headers || {}),
      },
    }
  }

  const notificationTypes = [
    {
      type: 'like',
      title: 'Like Notification',
      description: 'Someone liked your content',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      type: 'comment',
      title: 'Comment Notification',
      description: 'Someone commented on your post',
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      type: 'booking_request',
      title: 'Booking Request',
      description: 'New venue booking request',
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      type: 'follow',
      title: 'Follow Notification',
      description: 'Someone started following you',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      type: 'system_alert',
      title: 'System Alert',
      description: 'Important system notification',
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      type: 'feature_update',
      title: 'Feature Update',
      description: 'New feature available',
      icon: Zap,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10'
    }
  ]

  const createTestNotification = async (type: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/test', buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({ type })
      }))
      
      if (response.ok) {
        toast.success(`Created ${type} notification!`)
      } else {
        toast.error('Failed to create notification')
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      toast.error('Error creating notification')
    } finally {
      setIsLoading(false)
    }
  }

  const createAllNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/test', buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({ type: 'all' })
      }))
      
      if (response.ok) {
        toast.success('Created all test notifications!')
      } else {
        toast.error('Failed to create notifications')
      }
    } catch (error) {
      console.error('Error creating notifications:', error)
      toast.error('Error creating notifications')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Bell className="h-5 w-5 text-purple-400" />
          <span>Notification System Demo</span>
          <Badge variant="secondary" className="bg-purple-600 text-white">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {notificationTypes.map((notification) => {
            const Icon = notification.icon
            return (
              <Button
                key={notification.type}
                variant="outline"
                size="sm"
                onClick={() => createTestNotification(notification.type)}
                disabled={isLoading}
                className={`h-auto p-3 flex flex-col items-center space-y-2 border-slate-600 hover:border-slate-500 bg-slate-700/30 hover:bg-slate-700/50 ${notification.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${notification.color}`} />
                <div className="text-center">
                  <div className="text-xs font-medium text-white">
                    {notification.title}
                  </div>
                  <div className="text-xs text-slate-400">
                    {notification.description}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div className="text-sm text-slate-400">
            Click any button above to create a test notification
          </div>
          <Button
            onClick={createAllNotifications}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 