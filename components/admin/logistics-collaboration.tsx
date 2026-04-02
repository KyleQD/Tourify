"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  MessageSquare, 
  Send, 
  Users, 
  Bell, 
  Eye, 
  EyeOff,
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Settings
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface CollaborationMessage {
  id: string
  sender: string
  senderAvatar?: string
  message: string
  timestamp: string
  type: 'message' | 'update' | 'alert' | 'status'
  itemId?: string
  itemTitle?: string
}

interface LogisticsCollaborationProps {
  eventId?: string
  tourId?: string
  teamMembers?: string[]
}

export function LogisticsCollaboration({ 
  eventId, 
  tourId, 
  teamMembers = [] 
}: LogisticsCollaborationProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<CollaborationMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showNotifications, setShowNotifications] = useState(true)

  // Mock real-time updates
  useEffect(() => {
    const mockMessages: CollaborationMessage[] = [
      {
        id: '1',
        sender: 'John Smith',
        senderAvatar: '/avatars/john.jpg',
        message: 'Transportation schedule updated for Aug 14',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        type: 'update',
        itemId: 'transport-1',
        itemTitle: 'Airport Transfer'
      },
      {
        id: '2',
        sender: 'Sarah Johnson',
        senderAvatar: '/avatars/sarah.jpg',
        message: 'Equipment delivery confirmed for tomorrow',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        type: 'status',
        itemId: 'equipment-1',
        itemTitle: 'Sound System Setup'
      },
      {
        id: '3',
        sender: 'Mike Wilson',
        senderAvatar: '/avatars/mike.jpg',
        message: 'Need clarification on catering requirements',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        type: 'alert',
        itemId: 'catering-1',
        itemTitle: 'VIP Catering'
      }
    ]

    setMessages(mockMessages)
    setOnlineUsers(['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Davis'])
  }, [])

  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return

    const message: CollaborationMessage = {
      id: Date.now().toString(),
      sender: 'You',
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'message'
    }

    setMessages(prev => [message, ...prev])
    setNewMessage('')
    
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the team.",
      variant: "default"
    })
  }, [newMessage, toast])

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'update': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'alert': return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'status': return <Clock className="h-4 w-4 text-blue-400" />
      default: return <MessageSquare className="h-4 w-4 text-slate-400" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return "TBD"
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return formatSafeDate(timestamp)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Team Chat */}
      <Card className="bg-slate-900/50 border-slate-700/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Team Communication</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {onlineUsers.length} online
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? <Bell className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.senderAvatar} />
                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                    {message.sender.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{message.sender}</span>
                    <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
                    {getMessageTypeIcon(message.type)}
                    {message.itemTitle && (
                      <Badge variant="outline" className="text-xs">
                        {message.itemTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{message.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Team Status</span>
            <Button variant="ghost" size="sm">
              <UserPlus className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Online Users */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Online Now</h4>
            {onlineUsers.map((user, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                    {user.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-white">{user}</span>
              </div>
            ))}
          </div>

          <Separator className="bg-slate-700" />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Quick Actions</h4>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Team Update
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Bell className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Team Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 