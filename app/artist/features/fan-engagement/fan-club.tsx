"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Mail, Users, Bell, Send } from "lucide-react"

interface Fan {
  id: string
  name: string
  email: string
  joinDate: string
  tier: "basic" | "premium" | "vip"
  avatar?: string
}

interface Message {
  id: string
  content: string
  timestamp: string
  sender: "artist" | "fan"
  fanId?: string
}

interface Newsletter {
  id: string
  title: string
  content: string
  sentAt?: string
  status: "draft" | "sent"
}

export function FanClubManager() {
  const [fans, setFans] = useState<Fan[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [activeTab, setActiveTab] = useState("members")

  const sendMessage = (content: string, fanId?: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      timestamp: new Date().toISOString(),
      sender: "artist",
      fanId
    }
    setMessages([...messages, newMessage])
  }

  const createNewsletter = (title: string, content: string) => {
    const newNewsletter: Newsletter = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      status: "draft"
    }
    setNewsletters([...newsletters, newNewsletter])
  }

  const sendNewsletter = (id: string) => {
    setNewsletters(newsletters.map(nl => 
      nl.id === id ? { ...nl, status: "sent", sentAt: new Date().toISOString() } : nl
    ))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fan Club Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 gap-4">
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="newsletter">
                <Mail className="w-4 h-4 mr-2" />
                Newsletter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Fan Club Members</h3>
                <Badge variant="secondary">{fans.length} Members</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fans.map(fan => (
                  <Card key={fan.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={fan.avatar} />
                          <AvatarFallback>{fan.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{fan.name}</h4>
                          <p className="text-sm text-gray-500">{fan.email}</p>
                          <Badge variant="outline" className="mt-1">
                            {fan.tier.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Direct Messages</h3>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
              <div className="space-y-4">
                {messages.map(message => (
                  <Card key={message.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {message.sender === "artist" ? "A" : "F"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {message.sender === "artist" ? "You" : "Fan"}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Intl.DateTimeFormat("en-US", {
                                year: "numeric",
                                month: "numeric",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }).format(new Date(message.timestamp))}
                            </span>
                          </div>
                          <p className="mt-1">{message.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="newsletter" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Newsletter</h3>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  New Newsletter
                </Button>
              </div>
              <div className="space-y-4">
                {newsletters.map(newsletter => (
                  <Card key={newsletter.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{newsletter.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {newsletter.status === "sent" 
                              ? `Sent on ${new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(newsletter.sentAt!))}`
                              : "Draft"}
                          </p>
                        </div>
                        {newsletter.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => sendNewsletter(newsletter.id)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </Button>
                        )}
                      </div>
                      <p className="mt-2">{newsletter.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 