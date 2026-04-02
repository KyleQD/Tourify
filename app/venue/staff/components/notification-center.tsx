"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDateTime } from "@/lib/events/admin-event-normalization"
import {
  Bell,
  AlertTriangle,
  Calendar,
  Users,
  MessageSquare,
  Check,
  X,
  Clock,
  Star,
  Briefcase,
  Settings
} from "lucide-react"

interface Notification {
  id: string
  type: 'alert' | 'message' | 'schedule' | 'performance' | 'system'
  title: string
  message: string
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  actionRequired?: boolean
  from?: string
}

export default function NotificationCenter() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")

  const notifications: Notification[] = [
    {
      id: "notif-1",
      type: "alert",
      title: "Urgent: Staff Coverage Needed",
      message: "Security shift on Feb 15th needs immediate coverage. 2 staff members called in sick.",
      timestamp: "2024-02-10T09:30:00",
      priority: "urgent",
      read: false,
      actionRequired: true
    },
    {
      id: "notif-2",
      type: "performance",
      title: "Performance Review Due",
      message: "Maya Rodriguez's quarterly performance review is due in 3 days.",
      timestamp: "2024-02-10T08:15:00",
      priority: "medium",
      read: false,
      actionRequired: true
    },
    {
      id: "notif-3",
      type: "message",
      title: "New Shift Trade Request",
      message: "Alex Chen has requested to trade his Saturday evening shift.",
      timestamp: "2024-02-09T16:45:00",
      priority: "medium",
      read: true,
      actionRequired: true,
      from: "Alex Chen"
    },
    {
      id: "notif-4",
      type: "schedule",
      title: "Schedule Updated",
      message: "Your work schedule for next week has been updated.",
      timestamp: "2024-02-09T14:20:00",
      priority: "low",
      read: true
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return AlertTriangle
      case 'message': return MessageSquare
      case 'schedule': return Calendar
      case 'performance': return Star
      case 'system': return Settings
      default: return Bell
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const markAsRead = (notificationId: string) => {
    toast({
      title: "Notification marked as read",
    })
  }

  const handleAction = (notificationId: string, action: string) => {
    toast({
      title: "Action completed",
      description: `Notification ${action} successfully`,
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Notification Center
          </h1>
          <p className="text-slate-400 mt-1">Stay updated with important alerts and messages</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-red-500/20 border-red-500/30 text-red-400">
            {urgentCount} Urgent
          </Badge>
          <Badge variant="outline" className="bg-blue-500/20 border-blue-500/30 text-blue-400">
            {unreadCount} Unread
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: notifications.length, icon: Bell, color: "from-blue-500 to-cyan-500" },
          { label: "Unread", value: unreadCount, icon: MessageSquare, color: "from-purple-500 to-pink-500" },
          { label: "Action Required", value: notifications.filter(n => n.actionRequired).length, icon: AlertTriangle, color: "from-orange-500 to-red-500" },
          { label: "Today", value: notifications.filter(n => n.timestamp.startsWith('2024-02-10')).length, icon: Clock, color: "from-green-500 to-emerald-500" }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notifications.map((notification) => {
            const IconComponent = getTypeIcon(notification.type)
            
            return (
              <Card key={notification.id} className={`bg-slate-800/30 border-slate-700/50 ${
                !notification.read ? 'ring-1 ring-blue-500/20' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${
                      notification.type === 'alert' ? 'from-red-500 to-orange-500' :
                      notification.type === 'message' ? 'from-blue-500 to-purple-500' :
                      notification.type === 'schedule' ? 'from-green-500 to-emerald-500' :
                      notification.type === 'performance' ? 'from-yellow-500 to-orange-500' :
                      'from-gray-500 to-slate-500'
                    } flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className={`font-semibold ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                            {notification.title}
                          </h3>
                          {notification.from && (
                            <p className="text-slate-400 text-sm">From: {notification.from}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatSafeDateTime(notification.timestamp)}</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          {!notification.read && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-slate-600"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          
                          {notification.actionRequired && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(notification.id, 'approved')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-600 text-red-400"
                                onClick={() => handleAction(notification.id, 'dismissed')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Dismiss
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {notifications.filter(n => !n.read).map((notification) => {
            const IconComponent = getTypeIcon(notification.type)
            
            return (
              <Card key={notification.id} className="bg-slate-800/30 border-slate-700/50 ring-1 ring-blue-500/20">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${
                      notification.type === 'alert' ? 'from-red-500 to-orange-500' :
                      notification.type === 'message' ? 'from-blue-500 to-purple-500' :
                      notification.type === 'schedule' ? 'from-green-500 to-emerald-500' :
                      notification.type === 'performance' ? 'from-yellow-500 to-orange-500' :
                      'from-gray-500 to-slate-500'
                    } flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{notification.title}</h3>
                          {notification.from && (
                            <p className="text-slate-400 text-sm">From: {notification.from}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatSafeDateTime(notification.timestamp)}</span>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-600"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          {notifications.filter(n => n.priority === 'urgent').map((notification) => {
            const IconComponent = getTypeIcon(notification.type)
            
            return (
              <Card key={notification.id} className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                        <Badge variant="outline" className="text-red-400 bg-red-500/10 border-red-500/20">
                          URGENT
                        </Badge>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatSafeDateTime(notification.timestamp)}</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {notifications.filter(n => n.actionRequired).map((notification) => {
            const IconComponent = getTypeIcon(notification.type)
            
            return (
              <Card key={notification.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${
                      notification.type === 'alert' ? 'from-red-500 to-orange-500' :
                      notification.type === 'message' ? 'from-blue-500 to-purple-500' :
                      notification.type === 'schedule' ? 'from-green-500 to-emerald-500' :
                      notification.type === 'performance' ? 'from-yellow-500 to-orange-500' :
                      'from-gray-500 to-slate-500'
                    } flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                        <Badge variant="outline" className="text-orange-400 bg-orange-500/10 border-orange-500/20">
                          Action Required
                        </Badge>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-400 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatSafeDateTime(notification.timestamp)}</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction(notification.id, 'approved')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-600 text-red-400"
                            onClick={() => handleAction(notification.id, 'dismissed')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-blue-400">System Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No system notifications at this time</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 