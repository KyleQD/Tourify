"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Paperclip, Send, Smile, User, Users, MessageSquare } from "lucide-react"

// Mock conversation data
const mockConversations = [
  {
    id: "conv-1",
    name: "Pulse Productions",
    avatar: "/Intersecting Paths.png",
    lastMessage: "Can we discuss the technical requirements for the event?",
    time: "10:32 AM",
    unread: true,
    type: "client",
  },
  {
    id: "conv-2",
    name: "Skyline Records",
    avatar: "/abstract-geometric-sr.png",
    lastMessage: "Looking forward to the album release party!",
    time: "Yesterday",
    unread: false,
    type: "client",
  },
  {
    id: "conv-3",
    name: "TechGiant Inc.",
    avatar: "/abstract-geometric-shapes.png",
    lastMessage: "We need to confirm the catering options for our corporate event.",
    time: "Yesterday",
    unread: false,
    type: "client",
  },
  {
    id: "conv-4",
    name: "Venue Team",
    avatar: "/stylized-vt.png",
    lastMessage: "Michael: The new sound equipment has been installed.",
    time: "2 days ago",
    unread: false,
    type: "team",
  },
]

// Mock messages for a conversation
const mockMessages = [
  {
    id: "msg-1",
    sender: "them",
    name: "Pulse Productions",
    avatar: "/Intersecting Paths.png",
    content: "Hi there! We're interested in booking your venue for our Electronic Music Showcase on July 10th.",
    time: "10:15 AM",
  },
  {
    id: "msg-2",
    sender: "me",
    name: "You",
    content:
      "Hello! Thanks for your interest. We'd be happy to host your event. Could you tell me more about your requirements?",
    time: "10:18 AM",
  },
  {
    id: "msg-3",
    sender: "them",
    name: "Pulse Productions",
    avatar: "/Intersecting Paths.png",
    content:
      "We're expecting around 500 attendees. We'll need a full sound system and lighting setup. Do you have that available?",
    time: "10:22 AM",
  },
  {
    id: "msg-4",
    sender: "me",
    name: "You",
    content:
      "Yes, we have a Meyer Sound system with a 32-channel Midas console, and a full DMX lighting system with moving heads and LED pars. Would that work for your event?",
    time: "10:25 AM",
  },
  {
    id: "msg-5",
    sender: "them",
    name: "Pulse Productions",
    avatar: "/Intersecting Paths.png",
    content: "That sounds perfect! Can we discuss the technical requirements in more detail?",
    time: "10:32 AM",
  },
]

export function MessagingSystem() {
  const [activeTab, setActiveTab] = useState("all")
  const [activeConversation, setActiveConversation] = useState<string | null>("conv-1")
  const [message, setMessage] = useState("")
  const [conversations, setConversations] = useState(mockConversations)
  const [messages, setMessages] = useState(mockMessages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark conversation as read when selected
  useEffect(() => {
    if (activeConversation) {
      setConversations(
        conversations.map((conv) => (conv.id === activeConversation ? { ...conv, unread: false } : conv)),
      )
    }
  }, [activeConversation, conversations])

  // Filter conversations based on active tab
  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === "all") return true
    return conv.type === activeTab
  })

  // Send a message
  const handleSendMessage = () => {
    if (!message.trim()) return

    const newMessage = {
      id: `msg-${messages.length + 1}`,
      sender: "me",
      name: "You",
      content: message,
      time: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    }

    setMessages([...messages, newMessage])
    setMessage("")
  }

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Messaging</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[600px]">
          {/* Conversations sidebar */}
          <div className="w-full md:w-1/3 border-r border-gray-800">
            <div className="p-4">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-800 w-full grid grid-cols-3">
                  <TabsTrigger value="all" className="text-sm">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="client" className="text-sm">
                    <User className="h-4 w-4 mr-1" />
                    Clients
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    Team
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="h-[calc(600px-56px)]">
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      activeConversation === conversation.id ? "bg-gray-800" : "hover:bg-gray-800/50"
                    }`}
                    onClick={() => setActiveConversation(conversation.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.avatar || "/placeholder.svg"} alt={conversation.name} />
                      <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white truncate">{conversation.name}</h4>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{conversation.time}</span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread && (
                      <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="hidden md:flex flex-col w-2/3">
            {activeConversation ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage
                        src={
                          conversations.find((c) => c.id === activeConversation)?.avatar ||
                          "/placeholder.svg?height=40&width=40&query=User" ||
                          "/placeholder.svg"
                        }
                        alt={conversations.find((c) => c.id === activeConversation)?.name || "User"}
                      />
                      <AvatarFallback>
                        {(conversations.find((c) => c.id === activeConversation)?.name || "User").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-white">
                        {conversations.find((c) => c.id === activeConversation)?.name}
                      </h3>
                      <div className="flex items-center">
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-900/20 text-green-400 border-green-800 rounded-full"
                        >
                          Online
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                        <div className="flex items-start gap-2 max-w-[80%]">
                          {msg.sender !== "me" && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={msg.avatar || "/placeholder.svg?height=40&width=40&query=User"}
                                alt={msg.name}
                              />
                              <AvatarFallback>{msg.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div
                              className={`p-3 rounded-lg ${
                                msg.sender === "me" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-200"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{msg.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message input */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1 bg-gray-800 border-gray-700"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-purple-600 hover:bg-purple-700"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
