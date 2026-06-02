"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRealTimeCommunications } from '@/hooks/use-real-time-communications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  AlertTriangle, 
  Clock, 
  Users, 
  MessageSquare,
  Megaphone,
  Radio,
  Circle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// =============================================================================
// TYPES
// =============================================================================

interface MessageBoardProps {
  tourId?: string
  eventId?: string
  venueId?: string
  defaultChannelId?: string
  className?: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    username?: string
    full_name?: string
    display_name?: string
    avatar_url?: string
    role?: string
  }
}

interface Channel {
  id: string
  name: string
  channel_type: string
  is_public: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MessageBoard({ 
  tourId, 
  eventId, 
  venueId, 
  defaultChannelId,
  className = "" 
}: MessageBoardProps) {
  // State
  const [selectedChannelId, setSelectedChannelId] = useState<string>(defaultChannelId || '')
  const [messageInput, setMessageInput] = useState('')
  const [isComposeMode, setIsComposeMode] = useState(false)
  const [priority, setPriority] = useState<'general' | 'important' | 'urgent' | 'emergency'>('general')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Memoize the channel array so the realtime hook doesn't tear down
  // subscriptions on every render with a brand-new array reference.
  const channelIds = useMemo(
    () => (selectedChannelId ? [selectedChannelId] : []),
    [selectedChannelId],
  )

  // Real-time communication hook
  const {
    messages,
    announcements,
    channels,
    onlineUsers,
    isConnected,
    isLoading,
    error,
    sendMessage,
    createAnnouncement,
    acknowledgeAnnouncement,
    getConversationMessages,
    getActiveAnnouncements
  } = useRealTimeCommunications({
    channelIds,
    tourId,
    eventId,
    venueId,
    enablePresence: true
  })

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Set default channel if available
  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      const generalChannel = channels.find(ch => ch.channel_type === 'general') || channels[0]
      setSelectedChannelId(generalChannel.id)
    }
  }, [channels, selectedChannelId])

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChannelId) return

    try {
      await sendMessage(selectedChannelId, messageInput.trim(), {
        messageType: 'text'
      })

      setMessageInput('')
      setIsComposeMode(false)
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCreateAnnouncement = async () => {
    if (!messageInput.trim()) return

    try {
      await createAnnouncement({
        subject: `${priority.toUpperCase()}: Quick Announcement`,
        content: messageInput.trim(),
        priority,
        venueId
      })

      setMessageInput('')
      setPriority('general')
      setIsComposeMode(false)
      toast.success('Announcement sent')
    } catch (error) {
      console.error('Failed to create announcement:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send announcement')
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'urgent': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'important': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency': return <AlertTriangle className="h-3 w-3" />
      case 'urgent': return <Clock className="h-3 w-3" />
      case 'important': return <Radio className="h-3 w-3" />
      default: return <MessageSquare className="h-3 w-3" />
    }
  }

  const channelMessages = getConversationMessages(selectedChannelId)
  const activeAnnouncements = getActiveAnnouncements()

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          <span className="ml-3 text-slate-400">Loading communications...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`bg-slate-900/50 border-red-700 ${className}`}>
        <CardContent className="flex items-center justify-center h-64">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <p className="text-red-400 font-semibold">Connection Error</p>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Circle 
            className={`h-3 w-3 ${isConnected ? 'text-green-400 fill-green-400' : 'text-red-400 fill-red-400'}`} 
          />
          <span className="text-sm text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {onlineUsers.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">{onlineUsers.length} online</span>
            </>
          )}
        </div>
        
        {/* Priority Toggle — only relevant in announcement mode */}
        {isComposeMode && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Priority:</span>
            <Badge
              variant="outline"
              role="button"
              tabIndex={0}
              aria-label={`Priority ${priority}. Click to cycle.`}
              className={`cursor-pointer ${getPriorityColor(priority)}`}
              onClick={() => {
                const priorities: Array<typeof priority> = ['general', 'important', 'urgent', 'emergency']
                const currentIndex = priorities.indexOf(priority)
                const nextPriority = priorities[(currentIndex + 1) % priorities.length]
                setPriority(nextPriority)
              }}
            >
              {getPriorityIcon(priority)}
              <span className="ml-1 capitalize">{priority}</span>
            </Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="announcements" className="relative">
            Announcements
            {activeAnnouncements.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeAnnouncements.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {/* Channel Selector */}
          {channels.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto">
              {channels.map(channel => (
                <Button
                  key={channel.id}
                  variant={selectedChannelId === channel.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className="whitespace-nowrap"
                >
                  {channel.name}
                  {channel.channel_type === 'emergency' && (
                    <AlertTriangle className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Messages Display */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                {channels.find(ch => ch.id === selectedChannelId)?.name || 'Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {channelMessages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    channelMessages.map((message: any) => (
                      <div key={message.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-700 text-white text-xs">
                            {message.sender?.display_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">
                              {message.sender?.full_name || message.sender?.username || 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                            {!message.is_read && (
                              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Input */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isComposeMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsComposeMode(!isComposeMode)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                  <Button
                    variant={!isComposeMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsComposeMode(!isComposeMode)}
                  >
                    <Megaphone className="h-4 w-4 mr-1" />
                    Announcement
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Textarea
                    ref={inputRef}
                    placeholder={isComposeMode ? "Create an announcement..." : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-slate-900/50 border-slate-600 text-white resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={isComposeMode ? handleCreateAnnouncement : handleSendMessage}
                    disabled={!messageInput.trim() || (!selectedChannelId && !isComposeMode)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <Megaphone className="mr-2 h-5 w-5" />
                Active Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {activeAnnouncements.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No active announcements</p>
                    </div>
                  ) : (
                    activeAnnouncements.map(announcement => (
                      <Card key={announcement.id} className={`bg-slate-800/50 border ${getPriorityColor(announcement.priority).split(' ').pop()}`}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-white">{announcement.subject}</h4>
                              <Badge className={getPriorityColor(announcement.priority)}>
                                {getPriorityIcon(announcement.priority)}
                                <span className="ml-1 capitalize">{announcement.priority}</span>
                              </Badge>
                            </div>
                            
                            <p className="text-slate-300 text-sm">{announcement.content}</p>
                            
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>
                                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                              </span>
                              
                              {announcement.requires_acknowledgment && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => acknowledgeAnnouncement(announcement.id)}
                                  className="h-6 text-xs"
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}