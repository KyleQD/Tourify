"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  job_id: string | null
  content: string
  read: boolean
  created_at: string
  sender: {
    full_name: string
    avatar_url: string | null
  }
  receiver: {
    full_name: string
    avatar_url: string | null
  }
  job?: {
    title: string
  }
}

interface Conversation {
  user_id: string
  full_name: string
  avatar_url: string | null
  last_message: string
  unread_count: number
  job_title?: string
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchConversations()
    // Set up real-time subscription
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
        if (selectedConversation) {
          fetchMessages(selectedConversation)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation])

  const fetchConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(full_name, avatar_url),
        receiver:profiles(full_name, avatar_url),
        job:staff_jobs(title)
      `)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to fetch conversations")
      return
    }

    // Group messages by conversation
    const conversationMap = new Map<string, Conversation>()
    data?.forEach((message) => {
      const otherUserId = message.sender_id === session.user.id ? message.receiver_id : message.sender_id
      const otherUser = message.sender_id === session.user.id ? message.receiver : message.sender

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user_id: otherUserId,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url,
          last_message: message.content,
          unread_count: message.receiver_id === session.user.id && !message.read ? 1 : 0,
          job_title: message.job?.title
        })
      } else {
        const conversation = conversationMap.get(otherUserId)!
        if (message.receiver_id === session.user.id && !message.read) {
          conversation.unread_count++
        }
      }
    })

    setConversations(Array.from(conversationMap.values()))
  }

  const fetchMessages = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(full_name, avatar_url),
        receiver:profiles(full_name, avatar_url),
        job:staff_jobs(title)
      `)
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${session.user.id})`)
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("Failed to fetch messages")
      return
    }

    setMessages(data || [])
    markMessagesAsRead(userId)
  }

  const markMessagesAsRead = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", session.user.id)
      .eq("sender_id", userId)
      .eq("read", false)

    if (error) {
      toast.error("Failed to mark messages as read")
      return
    }

    fetchConversations()
  }

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from("messages")
      .insert([{
        sender_id: session.user.id,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
        read: false
      }])

    if (error) {
      toast.error("Failed to send message")
      return
    }

    setNewMessage("")
    fetchMessages(selectedConversation)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageSquare className="h-5 w-5" />
        {conversations.some(c => c.unread_count > 0) && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
          >
            {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-[600px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.user_id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-muted ${
                    selectedConversation === conversation.user_id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={conversation.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium truncate">{conversation.full_name}</p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                      {conversation.job_title && (
                        <p className="text-xs text-muted-foreground">
                          Re: {conversation.job_title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedConversation && (
              <div className="border-t pt-4">
                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === selectedConversation ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_id === selectedConversation
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="min-h-[40px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <Button size="icon" onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 