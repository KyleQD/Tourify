"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  PlusCircle,
  Send,
  Paperclip,
  AlertCircle,
  MessageSquare,
  BellRing,
  FileText,
  ImageIcon,
  FileUp,
} from "lucide-react"
import { formatSafeDate, formatSafeDateTime } from "@/lib/events/admin-event-normalization"

// Mock data for messages
const mockMessages = {
  "team-1": [
    {
      id: 1,
      sender: { name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" },
      content: "Hey team, just a reminder that we have a busy weekend ahead. Make sure all stations are fully stocked.",
      timestamp: "2023-12-08T09:30:00Z",
      isAnnouncement: false,
    },
    {
      id: 2,
      sender: { name: "Sam Rivera", avatar: "/placeholder.svg?height=40&width=40&text=SR" },
      content: "Got it. I'll do an inventory check today.",
      timestamp: "2023-12-08T09:35:00Z",
      isAnnouncement: false,
    },
    {
      id: 3,
      sender: { name: "Jamie Lee", avatar: "/placeholder.svg?height=40&width=40&text=JL" },
      content: "I've updated the bar menu with the new seasonal cocktails. Let me know if you have any questions.",
      timestamp: "2023-12-08T10:15:00Z",
      isAnnouncement: false,
    },
    {
      id: 4,
      sender: { name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" },
      content:
        "IMPORTANT: We have a VIP group coming in on Saturday night. They've reserved the back section. Please make sure it's properly set up.",
      timestamp: "2023-12-08T11:00:00Z",
      isAnnouncement: true,
      priority: "high",
    },
    {
      id: 5,
      sender: { name: "Taylor Kim", avatar: "/placeholder.svg?height=40&width=40&text=TK" },
      content: "I'll brief the security team about the VIP guests.",
      timestamp: "2023-12-08T11:05:00Z",
      isAnnouncement: false,
    },
    {
      id: 6,
      sender: { name: "Morgan Smith", avatar: "/placeholder.svg?height=40&width=40&text=MS" },
      content: "Do we have any specific requirements for the VIP section?",
      timestamp: "2023-12-08T11:10:00Z",
      isAnnouncement: false,
    },
    {
      id: 7,
      sender: { name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" },
      content:
        "Yes, they've requested champagne service and our premium spirits menu. I'll send the full details later today.",
      timestamp: "2023-12-08T11:15:00Z",
      isAnnouncement: false,
    },
  ],
  "team-2": [
    {
      id: 8,
      sender: { name: "Jordan Patel", avatar: "/placeholder.svg?height=40&width=40&text=JP" },
      content: "I've finished setting up the new audio equipment. It sounds great!",
      timestamp: "2023-12-08T10:00:00Z",
      isAnnouncement: false,
    },
    {
      id: 9,
      sender: { name: "Casey Wong", avatar: "/placeholder.svg?height=40&width=40&text=CW" },
      content:
        "ANNOUNCEMENT: We're upgrading the lighting software next week. There will be a training session on Tuesday at 2pm.",
      timestamp: "2023-12-08T10:30:00Z",
      isAnnouncement: true,
      priority: "medium",
    },
  ],
  "team-3": [
    {
      id: 10,
      sender: { name: "Quinn Murphy", avatar: "/placeholder.svg?height=40&width=40&text=QM" },
      content:
        "The vendor contracts for next month's festival are ready for review. I've uploaded them to the shared drive.",
      timestamp: "2023-12-08T09:00:00Z",
      isAnnouncement: false,
    },
    {
      id: 11,
      sender: { name: "Quinn Murphy", avatar: "/placeholder.svg?height=40&width=40&text=QM" },
      content: "URGENT: The headliner for Saturday's event just canceled. We need to find a replacement ASAP.",
      timestamp: "2023-12-08T14:00:00Z",
      isAnnouncement: true,
      priority: "high",
    },
  ],
  "team-4": [
    {
      id: 12,
      sender: { name: "Dakota Lee", avatar: "/placeholder.svg?height=40&width=40&text=DL" },
      content:
        "I've scheduled all our social media posts for the upcoming events. Please review when you get a chance.",
      timestamp: "2023-12-08T11:30:00Z",
      isAnnouncement: false,
    },
    {
      id: 13,
      sender: { name: "Skyler Chen", avatar: "/placeholder.svg?height=40&width=40&text=SC" },
      content: "The new promotional graphics are ready. Check them out and let me know what you think!",
      timestamp: "2023-12-08T13:00:00Z",
      isAnnouncement: false,
      attachment: { type: "image", name: "promo-graphics.jpg" },
    },
  ],
  "team-5": [
    {
      id: 14,
      sender: { name: "Reese Johnson", avatar: "/placeholder.svg?height=40&width=40&text=RJ" },
      content: "Tour schedule for next month is finalized. I've attached the itinerary.",
      timestamp: "2023-12-08T10:45:00Z",
      isAnnouncement: false,
      attachment: { type: "file", name: "tour-itinerary.pdf" },
    },
    {
      id: 15,
      sender: { name: "Reese Johnson", avatar: "/placeholder.svg?height=40&width=40&text=RJ" },
      content: "ANNOUNCEMENT: We've added two new cities to the tour. Updated schedule is in the shared folder.",
      timestamp: "2023-12-08T15:00:00Z",
      isAnnouncement: true,
      priority: "medium",
    },
  ],
}

// Mock data for announcements (filtered from messages)
const getMockAnnouncements = (teamId: string) => {
  const messages = mockMessages[teamId as keyof typeof mockMessages] || []
  return messages.filter((message) => message.isAnnouncement)
}

// Mock data for team members (for mentions)
const mockMembers = {
  "team-1": [
    { id: 1, name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" },
    { id: 2, name: "Sam Rivera", avatar: "/placeholder.svg?height=40&width=40&text=SR" },
    { id: 3, name: "Jamie Lee", avatar: "/placeholder.svg?height=40&width=40&text=JL" },
    { id: 4, name: "Taylor Kim", avatar: "/placeholder.svg?height=40&width=40&text=TK" },
    { id: 5, name: "Morgan Smith", avatar: "/placeholder.svg?height=40&width=40&text=MS" },
  ],
  "team-2": [
    { id: 6, name: "Jordan Patel", avatar: "/placeholder.svg?height=40&width=40&text=JP" },
    { id: 7, name: "Casey Wong", avatar: "/placeholder.svg?height=40&width=40&text=CW" },
    { id: 8, name: "Riley Garcia", avatar: "/placeholder.svg?height=40&width=40&text=RG" },
  ],
  "team-3": [
    { id: 9, name: "Quinn Murphy", avatar: "/placeholder.svg?height=40&width=40&text=QM" },
    { id: 10, name: "Avery Wilson", avatar: "/placeholder.svg?height=40&width=40&text=AW" },
  ],
  "team-4": [
    { id: 11, name: "Dakota Lee", avatar: "/placeholder.svg?height=40&width=40&text=DL" },
    { id: 12, name: "Skyler Chen", avatar: "/placeholder.svg?height=40&width=40&text=SC" },
  ],
  "team-5": [
    { id: 13, name: "Reese Johnson", avatar: "/placeholder.svg?height=40&width=40&text=RJ" },
    { id: 14, name: "Parker Davis", avatar: "/placeholder.svg?height=40&width=40&text=PD" },
  ],
}

interface TeamCommunicationProps {
  teamId: string
}

export function TeamCommunication({ teamId }: TeamCommunicationProps) {
  const [messages, setMessages] = useState(mockMessages[teamId as keyof typeof mockMessages] || [])
  const [announcements, setAnnouncements] = useState(getMockAnnouncements(teamId))
  const [newMessage, setNewMessage] = useState("")
  const [activeTab, setActiveTab] = useState("chat")
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    content: "",
    priority: "medium",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const teamMembers = mockMembers[teamId as keyof typeof mockMembers] || []

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const newMessageObj = {
      id: messages.length + 1,
      sender: { name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" }, // Current user
      content: newMessage,
      timestamp: new Date().toISOString(),
      isAnnouncement: false,
    }

    setMessages([...messages, newMessageObj])
    setNewMessage("")
  }

  const handleSendAnnouncement = () => {
    if (!newAnnouncement.content.trim()) return

    const newAnnouncementObj = {
      id: messages.length + 1,
      sender: { name: "Alex Johnson", avatar: "/placeholder.svg?height=40&width=40&text=AJ" }, // Current user
      content: newAnnouncement.content,
      timestamp: new Date().toISOString(),
      isAnnouncement: true,
      priority: newAnnouncement.priority,
    }

    setMessages([...messages, newAnnouncementObj])
    setAnnouncements([...announcements, newAnnouncementObj])
    setIsAddAnnouncementOpen(false)
    setNewAnnouncement({
      content: "",
      priority: "medium",
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date)
  }

  const formatDateHeader = (timestamp: string) => {
    return formatSafeDate(timestamp)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-amber-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-blue-500"
    }
  }

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "file":
        return <FileText className="h-4 w-4" />
      default:
        return <FileUp className="h-4 w-4" />
    }
  }

  // Group messages by date for display
  const groupMessagesByDate = () => {
    const groups: Record<string, typeof messages> = {}

    messages.forEach((message) => {
      const date = formatSafeDate(message.timestamp)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message as any)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Team Communication</h3>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Team Chat
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center">
              <BellRing className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="chat" className="mt-0 space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0 flex flex-col h-[500px]">
            <ScrollArea className="flex-1 p-4">
              {Object.keys(messageGroups).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <div key={date} className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-background px-2 text-muted-foreground">
                            {formatDateHeader(dateMessages[0].timestamp)}
                          </span>
                        </div>
                      </div>
                      {dateMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.isAnnouncement ? "items-start" : ""}`}>
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={message.sender.avatar || "/placeholder.svg"} alt={message.sender.name} />
                            <AvatarFallback>
                              {message.sender.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-medium text-sm">{message.sender.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                            {message.isAnnouncement ? (
                              <div className="mt-1 p-3 bg-muted rounded-md">
                                <div className="flex items-center mb-1">
                                  <div
                                    className={`h-2 w-2 rounded-full mr-2 ${getPriorityColor((message as any).priority || "medium")}`}
                                  />
                                  <span className="text-xs font-medium uppercase">
                                    {(message as any).priority === "high" ? "Important" : "Announcement"}
                                  </span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                              </div>
                            ) : (
                              <p className="text-sm mt-1">{message.content}</p>
                            )}
                            {(message as any).attachment && (
                              <div className="mt-2 flex items-center bg-muted rounded-md p-2 text-sm">
                                                                  {getAttachmentIcon((message as any).attachment.type)}
                                  <span className="ml-2">{(message as any).attachment.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="announcements" className="mt-0 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Important team announcements</h4>
          <Dialog open={isAddAnnouncementOpen} onOpenChange={setIsAddAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Post an important announcement for your team. All team members will be notified.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="announcement">Announcement</Label>
                  <Textarea
                    id="announcement"
                    placeholder="Enter your announcement..."
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={newAnnouncement.priority}
                    onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High - Urgent/Important</SelectItem>
                      <SelectItem value="medium">Medium - Standard</SelectItem>
                      <SelectItem value="low">Low - FYI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAnnouncementOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendAnnouncement}>Post Announcement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsAddAnnouncementOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Announcement
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className={`h-10 w-1 rounded-full ${getPriorityColor((announcement as any).priority || "medium")}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage
                              src={announcement.sender.avatar || "/placeholder.svg"}
                              alt={announcement.sender.name}
                            />
                            <AvatarFallback>
                              {announcement.sender.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm">{announcement.sender.name}</span>
                            <div className="flex items-center">
                              <Badge variant="outline" className="text-xs mr-2">
                                {(announcement as any).priority === "high" ? "Important" : "Announcement"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatSafeDateTime(announcement.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3">{announcement.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </div>
  )
}
