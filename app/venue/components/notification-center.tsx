"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Clock, MessageSquare, Star } from "lucide-react"

// Mock notification data
const mockNotifications = {
  bookings: [
    {
      id: "notif-1",
      title: "New Booking Request",
      message: "Electronic Music Showcase by Pulse Productions",
      time: "2 hours ago",
      read: false,
      type: "booking",
      link: "/venue/bookings",
    },
    {
      id: "notif-2",
      title: "Booking Reminder",
      message: "Summer Jam Festival is in 3 days",
      time: "5 hours ago",
      read: true,
      type: "booking",
      link: "/venue/events/event-1",
    },
  ],
  messages: [
    {
      id: "notif-3",
      title: "New Message",
      message: "Sarah Williams: Can we discuss the technical requirements?",
      time: "1 hour ago",
      read: false,
      type: "message",
      link: "/messages/msg-1",
    },
  ],
  system: [
    {
      id: "notif-4",
      title: "Profile Views Increased",
      message: "Your venue profile views increased by 15% this week",
      time: "1 day ago",
      read: true,
      type: "system",
      link: "/venue/analytics",
    },
    {
      id: "notif-5",
      title: "New Review",
      message: "You received a 5-star review from Jazz Night",
      time: "2 days ago",
      read: false,
      type: "system",
      link: "/reviews",
    },
  ],
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState(mockNotifications)

  // Count unread notifications
  const unreadCount = Object.values(notifications)
    .flat()
    .filter((notif) => !notif.read).length

  // Get notifications based on active tab
  const getFilteredNotifications = () => {
    if (activeTab === "all") {
      return [...notifications.bookings, ...notifications.messages, ...notifications.system].sort((a, b) => {
        // Sort by read status (unread first) and then by time
        if (a.read !== b.read) return a.read ? 1 : -1
        return 0 // In a real app, we would parse the time and sort
      })
    }
    return notifications[activeTab as keyof typeof notifications] || []
  }

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications({
      bookings: notifications.bookings.map((n) => ({ ...n, read: true })),
      messages: notifications.messages.map((n) => ({ ...n, read: true })),
      system: notifications.system.map((n) => ({ ...n, read: true })),
    })
  }

  // Mark a single notification as read
  const markAsRead = (id: string) => {
    setNotifications({
      bookings: notifications.bookings.map((n) => (n.id === id ? { ...n, read: true } : n)),
      messages: notifications.messages.map((n) => (n.id === id ? { ...n, read: true } : n)),
      system: notifications.system.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })
  }

  // Render icon based on notification type
  const renderIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Clock className="h-5 w-5 text-blue-400" />
      case "message":
        return <MessageSquare className="h-5 w-5 text-green-400" />
      case "system":
        return <Star className="h-5 w-5 text-purple-400" />
      default:
        return <Bell className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-gray-900 border-gray-800">
        <SheetHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white">Notifications</SheetTitle>
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-sm">
              Mark all as read
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-gray-800 w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-sm">
              All
              {unreadCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-purple-900/20 text-purple-400 border-purple-800">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="system" className="text-sm">
              <Bell className="h-4 w-4 mr-1" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {getFilteredNotifications().length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notifications</p>
              </div>
            ) : (
              getFilteredNotifications().map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg flex items-start gap-3 cursor-pointer transition-colors ${
                    notification.read ? "bg-gray-800/50" : "bg-gray-800"
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="mt-1">{renderIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-white">{notification.title}</h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{notification.time}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
                  </div>
                  {!notification.read && <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
