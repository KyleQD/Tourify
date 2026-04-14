"use client"

import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { 
  MessageSquare, 
  Send, 
  Search, 
  MoreHorizontal,
  ArrowLeft,
  Users,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  ExternalLink,
  Shield,
  ClipboardCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from 'date-fns'
interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
  updated_at: string
  participant_1_profile?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
  participant_2_profile?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
  last_message?: {
    id: string
    content: string
    created_at: string
    sender_id: string
  }
}

interface TaskCardData {
  title: string
  description?: string
  actionUrl?: string
  actionLabel?: string
  isSensitive?: boolean
}

function parseTaskCard(content: string): TaskCardData | null {
  if (!content.startsWith('[TASK:')) return null
  try {
    const jsonStr = content.slice(6, content.lastIndexOf(']'))
    const parsed = JSON.parse(jsonStr)
    if (parsed.title && parsed.action_url) {
      return {
        title: parsed.title,
        description: parsed.description,
        actionUrl: parsed.action_url,
        actionLabel: parsed.action_label,
        isSensitive: parsed.is_sensitive,
      }
    }
  } catch { /* not a task card */ }
  return null
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  const { user, isAuthenticated } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time messaging setup
  useEffect(() => {
    if (!user || !isAuthenticated) return
    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`
      }, (payload) => {
        const newMessage = payload.new as any
        // Only add if it's not from current user (to avoid duplicates)
        if (newMessage.sender_id !== user.id) {
          setMessages(prev => [...prev, {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            created_at: newMessage.created_at,
            sender: {
              id: newMessage.sender_id,
              username: 'Loading...',
              full_name: 'Loading...',
              avatar_url: ''
            }
          }])

          // Fetch sender details
          fetchSenderDetails(newMessage.sender_id)
        }
      })
      .subscribe()

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        const updatedConversation = payload.new as any
        setConversations(prev => 
          prev.map(conv => 
            conv.id === updatedConversation.id
              ? { ...conv, updated_at: updatedConversation.updated_at }
              : conv
          )
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(conversationsChannel)
    }
  }, [user, isAuthenticated, selectedConversation])

  const fetchSenderDetails = async (senderId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', senderId)
        .single()

      if (profile) {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender_id === senderId && msg.sender.username === 'Loading...'
              ? { ...msg, sender: { id: profile.id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url } }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Error fetching sender details:', error)
    }
  }

  const fetchConversations = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/messages', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        toast.error('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const response = await fetch(`/api/messages?conversationId=${conversationId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        toast.error('Failed to load messages')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage("")

    try {
      const conversation = conversations.find(c => c.id === selectedConversation)
      if (!conversation) return

      const recipientId = conversation.participant_1 === user.id 
        ? conversation.participant_2 
        : conversation.participant_1

      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          content: messageContent
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMessages(prev => [...prev, result.message])
        
        // Update conversation in the list
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation 
              ? { 
                  ...conv, 
                  last_message: {
                    id: result.message.id,
                    content: messageContent,
                    created_at: result.message.created_at,
                    sender_id: user.id
                  },
                  updated_at: new Date().toISOString()
                }
              : conv
          )
        )
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send message')
        setNewMessage(messageContent) // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return null
    
    return conversation.participant_1 === user.id 
      ? conversation.participant_2_profile 
      : conversation.participant_1_profile
  }

  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = getOtherParticipant(conversation)
    if (!otherParticipant) return false
    
    const searchLower = searchQuery.toLowerCase()
    return (
      otherParticipant.full_name.toLowerCase().includes(searchLower) ||
      otherParticipant.username.toLowerCase().includes(searchLower)
    )
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign in Required</h2>
            <p className="text-gray-400 mb-6">Please sign in to access your messages</p>
            <Button 
              onClick={() => window.location.href = '/login'} 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto h-screen max-w-6xl">
        <div className="flex h-full gap-4">
          {/* Conversations Sidebar */}
          <div className="w-full md:w-1/3 bg-slate-900 rounded-2xl border border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h1 className="text-2xl font-bold text-white mb-4">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a conversation by messaging someone from their profile</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation)
                    if (!otherParticipant) return null

                    const isSelected = selectedConversation === conversation.id
                    const lastMessage = conversation.last_message
                    const isUnread = lastMessage && lastMessage.sender_id !== user?.id

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                          isSelected 
                            ? 'bg-purple-600/20 border border-purple-500/50' 
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={otherParticipant.avatar_url || ''} />
                            <AvatarFallback>
                              {otherParticipant.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white truncate">
                                {otherParticipant.full_name}
                              </h3>
                              {lastMessage && (
                                <span className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 truncate">
                              @{otherParticipant.username}
                            </p>
                            {lastMessage && (
                              <p className={`text-sm truncate mt-1 ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                                {lastMessage.sender_id === user?.id ? 'You: ' : ''}{lastMessage.content}
                              </p>
                            )}
                          </div>
                          {isUnread && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {(() => {
                      const conversation = conversations.find(c => c.id === selectedConversation)
                      const otherParticipant = conversation ? getOtherParticipant(conversation) : null
                      
                      return otherParticipant ? (
                        <>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={otherParticipant.avatar_url || ''} />
                            <AvatarFallback>
                              {otherParticipant.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-white">{otherParticipant.full_name}</h3>
                            <p className="text-sm text-gray-400">@{otherParticipant.username}</p>
                          </div>
                        </>
                      ) : null
                    })()}
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages List */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id
                        const taskCard = parseTaskCard(message.content)
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                              <div className="flex items-start gap-2">
                                {!isOwnMessage && (
                                  <Avatar className="h-6 w-6 mt-1">
                                    <AvatarImage src={message.sender.avatar_url || ''} />
                                    <AvatarFallback>
                                      {message.sender.full_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="flex-1">
                                  {taskCard ? (
                                    <div className={`p-3 rounded-2xl border ${taskCard.isSensitive ? 'border-amber-500/30 bg-amber-500/5' : 'border-purple-500/30 bg-purple-500/5'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <ClipboardCheck className={`h-4 w-4 ${taskCard.isSensitive ? 'text-amber-400' : 'text-purple-400'}`} />
                                        <span className="text-xs font-medium text-slate-300">Task Assignment</span>
                                        {taskCard.isSensitive && (
                                          <Badge className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0">
                                            <Shield className="h-2.5 w-2.5 mr-0.5" /> Sensitive
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-semibold text-white">{taskCard.title}</p>
                                      {taskCard.description && (
                                        <p className="text-xs text-slate-400 mt-1">{taskCard.description}</p>
                                      )}
                                      {taskCard.actionUrl && (
                                        <Button
                                          size="sm"
                                          onClick={() => window.location.href = taskCard.actionUrl!}
                                          className="mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs h-7"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {taskCard.actionLabel || 'Go to Task'}
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={`p-3 rounded-2xl ${
                                      isOwnMessage 
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                                        : 'bg-slate-700 text-white'
                                    }`}>
                                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1 text-right">
                                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-700">
                  <div className="flex gap-3">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 bg-slate-800 border-slate-600 text-white placeholder-gray-400 resize-none"
                      rows={1}
                      disabled={sending}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                  <p className="text-gray-400">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
