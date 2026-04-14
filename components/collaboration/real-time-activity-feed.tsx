"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, 
  Users, 
  MessageSquare, 
  CheckCircle, 
  UserPlus,
  Heart,
  Share2,
  Calendar,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useCommunityActivity, type CommunityActivity } from "@/hooks/use-community-activity"

function ActivityIcon({ type, priority }: { type: CommunityActivity['type'], priority: CommunityActivity['priority'] }) {
  const priorityColorMap: Record<string, string> = {
    high: 'text-orange-400',
    medium: 'text-blue-400',
    low: 'text-slate-400',
  }

  const iconMap: Record<string, typeof Bell> = {
    new_follower: UserPlus,
    post_like: Heart,
    post_comment: MessageSquare,
    post_share: Share2,
    message: MessageSquare,
    event: Calendar,
  }

  const Icon = iconMap[type] || Bell

  return (
    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center ${priorityColorMap[priority] || 'text-slate-400'}`}>
      <Icon className="h-3 w-3" />
    </div>
  )
}

function ActivityCard({ activity }: { activity: CommunityActivity }) {
  const isSystem = activity.userId === 'system'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <div className="flex items-start space-x-3 p-4 hover:bg-slate-800/30 rounded-lg transition-colors">
        {isSystem ? (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.userAvatar || undefined} alt={activity.userName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                {activity.userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <ActivityIcon type={activity.type} priority={activity.priority} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-white text-sm">{activity.userName}</span>
            {activity.isVerified && (
              <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
            )}
            {activity.userRole && !isSystem && (
              <Badge variant="outline" className="text-[10px] bg-slate-700/50 text-slate-400 border-slate-600 py-0">
                {activity.userRole}
              </Badge>
            )}
          </div>

          <p className="text-sm text-slate-400">{activity.message}</p>

          {activity.details && (
            <p className="text-xs text-slate-500 truncate">{activity.details}</p>
          )}

          <span className="text-xs text-slate-600 block">
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start space-x-3 p-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-slate-700/50 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-700/50 rounded w-3/4" />
        <div className="h-3 bg-slate-700/50 rounded w-1/2" />
        <div className="h-2 bg-slate-700/30 rounded w-1/4" />
      </div>
    </div>
  )
}

export function RealTimeActivityFeed({ className }: { className?: string }) {
  const { activities, isLoading, error, refetch } = useCommunityActivity(20)
  const [unreadCount, setUnreadCount] = useState(0)
  const [prevCount, setPrevCount] = useState(0)

  useEffect(() => {
    if (activities.length > prevCount && prevCount > 0) {
      setUnreadCount(prev => prev + (activities.length - prevCount))
    }
    setPrevCount(activities.length)
  }, [activities.length, prevCount])

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-400" />
            <CardTitle className="text-white text-base">Activity Feed</CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-1.5 animate-pulse" />
              Live
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">
                {unreadCount}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setUnreadCount(0)}
              className="text-xs text-slate-400 hover:text-white h-7"
            >
              Mark read
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          {isLoading ? (
            <div className="divide-y divide-slate-700/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p>Could not load activity</p>
              <Button variant="ghost" size="sm" onClick={refetch} className="mt-2 text-purple-400">
                Retry
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Follow people and post to see activity here</p>
                  <Link href="/artist/network">
                    <Button variant="outline" size="sm" className="mt-4 border-purple-500/50 text-purple-400">
                      Find People
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
