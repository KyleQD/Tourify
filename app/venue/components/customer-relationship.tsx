"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Download, Edit, Filter, Mail, MessageSquare, Phone, Plus, Search, Trash2, Users } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

// Mock customer data
const mockCustomers = [
  {
    id: "cust-1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
    avatar: "/javascript-code-abstract.png",
    type: "promoter",
    lastContact: "2025-05-20",
    events: 8,
    totalSpent: 12450,
    tags: ["VIP", "Frequent"],
    notes: "Prefers email communication. Interested in electronic music events.",
  },
  {
    id: "cust-2",
    name: "Emily Johnson",
    email: "emily.johnson@example.com",
    phone: "(555) 234-5678",
    avatar: "/stylized-ej-initials.png",
    type: "client",
    lastContact: "2025-05-15",
    events: 5,
    totalSpent: 8200,
    tags: ["Corporate"],
    notes: "Looking for corporate event spaces. Prefers phone calls.",
  },
  {
    id: "cust-3",
    name: "Michael Brown",
    email: "michael.brown@example.com",
    phone: "(555) 345-6789",
    avatar: "/abstract-blue-burst.png",
    type: "artist",
    lastContact: "2025-05-10",
    events: 3,
    totalSpent: 0,
    tags: ["Jazz", "Local"],
    notes: "Local jazz musician. Interested in regular performance opportunities.",
  },
  {
    id: "cust-4",
    name: "Sophia Garcia",
    email: "sophia.garcia@example.com",
    phone: "(555) 456-7890",
    avatar: "/abstract-sg.png",
    type: "promoter",
    lastContact: "2025-05-05",
    events: 12,
    totalSpent: 18750,
    tags: ["VIP", "Rock"],
    notes: "Promotes rock concerts. Very responsive and professional.",
  },
  {
    id: "cust-5",
    name: "David Wilson",
    email: "david.wilson@example.com",
    phone: "(555) 567-8901",
    avatar: "/placeholder.svg?height=40&width=40&query=DW",
    type: "client",
    lastContact: "2025-04-28",
    events: 2,
    totalSpent: 3500,
    tags: ["Private"],
    notes: "Booked the venue for private events. Particular about sound quality.",
  },
  {
    id: "cust-6",
    name: "Olivia Martinez",
    email: "olivia.martinez@example.com",
    phone: "(555) 678-9012",
    avatar: "/placeholder.svg?height=40&width=40&query=OM",
    type: "artist",
    lastContact: "2025-04-22",
    events: 1,
    totalSpent: 0,
    tags: ["Pop", "New"],
    notes: "Up-and-coming pop artist. Looking for venues for album release party.",
  },
  {
    id: "cust-7",
    name: "James Taylor",
    email: "james.taylor@example.com",
    phone: "(555) 789-0123",
    avatar: "/placeholder.svg?height=40&width=40&query=JT",
    type: "promoter",
    lastContact: "2025-04-15",
    events: 6,
    totalSpent: 9800,
    tags: ["EDM", "Frequent"],
    notes: "Specializes in EDM events. Prefers weekend bookings.",
  },
]

// Mock interactions data
const mockInteractions = [
  {
    id: "int-1",
    customerId: "cust-1",
    type: "email",
    date: "2025-05-20",
    subject: "Summer Jam Festival Booking",
    content:
      "Discussed potential booking for Summer Jam Festival. John is interested in securing the venue for June 15th.",
    followUp: "2025-05-25",
  },
  {
    id: "int-2",
    customerId: "cust-1",
    type: "call",
    date: "2025-05-10",
    subject: "Initial Inquiry",
    content:
      "John called to inquire about venue availability for summer events. Provided information about capacity and amenities.",
    followUp: null,
  },
  {
    id: "int-3",
    customerId: "cust-2",
    type: "meeting",
    date: "2025-05-15",
    subject: "Venue Tour",
    content:
      "Emily visited the venue for a tour. She was impressed with the space and is considering it for a corporate event in July.",
    followUp: "2025-05-30",
  },
  {
    id: "int-4",
    customerId: "cust-3",
    type: "email",
    date: "2025-05-10",
    subject: "Performance Opportunity",
    content: "Michael inquired about performing at Jazz Night. Shared details about the event and compensation.",
    followUp: "2025-05-20",
  },
  {
    id: "int-5",
    customerId: "cust-4",
    type: "call",
    date: "2025-05-05",
    subject: "Rock Concert Series",
    content:
      "Sophia called to discuss a potential rock concert series for the fall. She's interested in booking multiple dates.",
    followUp: "2025-05-15",
  },
]

export function CustomerRelationship() {
  const [activeTab, setActiveTab] = useState("customers")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>("cust-1")
  const [selectedInteraction, setSelectedInteraction] = useState<string | null>(null)

  // Filter customers based on search query
  const filteredCustomers = mockCustomers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // Get customer by ID
  const getCustomer = (id: string) => {
    return mockCustomers.find((customer) => customer.id === id)
  }

  // Get interactions for a customer
  const getCustomerInteractions = (customerId: string) => {
    return mockInteractions.filter((interaction) => interaction.customerId === customerId)
  }

  // Get interaction icon
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4 text-blue-400" />
      case "call":
        return <Phone className="h-4 w-4 text-green-400" />
      case "meeting":
        return <Users className="h-4 w-4 text-purple-400" />
      case "note":
        return <Edit className="h-4 w-4 text-yellow-400" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-400" />
    }
  }

  // Get customer type badge color
  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "promoter":
        return "bg-purple-900/20 text-purple-400 border-purple-800"
      case "client":
        return "bg-blue-900/20 text-blue-400 border-blue-800"
      case "artist":
        return "bg-green-900/20 text-green-400 border-green-800"
      default:
        return "bg-gray-700 text-gray-300 border-gray-600"
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Customer Relationship Management</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customers" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3 space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCustomer === customer.id
                            ? "bg-gray-800 ring-1 ring-purple-500"
                            : "bg-gray-800/50 hover:bg-gray-800"
                        }`}
                        onClick={() => setSelectedCustomer(customer.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={customer.avatar || "/placeholder.svg"} alt={customer.name} />
                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-white truncate">{customer.name}</h4>
                              <Badge variant="outline" className={getCustomerTypeColor(customer.type)}>
                                {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 truncate">{customer.email}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="bg-gray-700 text-gray-300 border-gray-600 text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="md:w-2/3">
                {selectedCustomer && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage
                              src={getCustomer(selectedCustomer)?.avatar || "/placeholder.svg"}
                              alt={getCustomer(selectedCustomer)?.name}
                            />
                            <AvatarFallback>{(getCustomer(selectedCustomer)?.name ?? "").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-xl font-bold">{getCustomer(selectedCustomer)?.name}</h2>
                            <Badge
                              variant="outline"
                              className={getCustomerTypeColor(getCustomer(selectedCustomer)?.type || "")}
                            >
                              {(() => { const t = getCustomer(selectedCustomer)?.type ?? ""; return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Unknown" })()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                          <Button size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Contact Information</h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-500" />
                                <span>{getCustomer(selectedCustomer)?.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-500" />
                                <span>{getCustomer(selectedCustomer)?.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-1">
                              {getCustomer(selectedCustomer)?.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="bg-gray-700 text-gray-300 border-gray-600"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                            <div className="bg-gray-700 rounded-md p-3 text-sm">
                              {getCustomer(selectedCustomer)?.notes}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Statistics</h3>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-700 rounded-md p-3 text-center">
                                <div className="text-2xl font-bold">{getCustomer(selectedCustomer)?.events}</div>
                                <div className="text-xs text-gray-400">Events</div>
                              </div>
                              <div className="bg-gray-700 rounded-md p-3 text-center">
                                <div className="text-2xl font-bold">
                                  {formatSafeCurrency(getCustomer(selectedCustomer)?.totalSpent || 0)}
                                </div>
                                <div className="text-xs text-gray-400">Total Spent</div>
                              </div>
                              <div className="bg-gray-700 rounded-md p-3 text-center">
                                <div className="text-2xl font-bold">
                                  {formatSafeDate(getCustomer(selectedCustomer)?.lastContact || "")}
                                </div>
                                <div className="text-xs text-gray-400">Last Contact</div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Interactions</h3>
                            <div className="space-y-2">
                              {getCustomerInteractions(selectedCustomer).map((interaction) => (
                                <div key={interaction.id} className="bg-gray-700 rounded-md p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      {getInteractionIcon(interaction.type)}
                                      <span className="font-medium">{interaction.subject}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {formatSafeDate(interaction.date)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300">{interaction.content}</p>
                                  {interaction.followUp && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-yellow-400">
                                      <Calendar className="h-3 w-3" />
                                      <span>Follow-up: {formatSafeDate(interaction.followUp)}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <Button variant="outline" size="sm" className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Interaction
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Recent Interactions</h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Interaction
              </Button>
            </div>

            <div className="space-y-3">
              {mockInteractions.map((interaction) => {
                const customer = getCustomer(interaction.customerId)
                return (
                  <div
                    key={interaction.id}
                    className={`p-4 bg-gray-800 rounded-lg cursor-pointer transition-colors ${
                      selectedInteraction === interaction.id ? "ring-2 ring-purple-500" : "hover:bg-gray-750"
                    }`}
                    onClick={() =>
                      setSelectedInteraction(interaction.id === selectedInteraction ? null : interaction.id)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={customer?.avatar || "/placeholder.svg"} alt={customer?.name} />
                        <AvatarFallback>{(customer?.name ?? "").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{customer?.name}</h4>
                            <Badge variant="outline" className={getCustomerTypeColor(customer?.type || "")}>
                              {(() => { const t = customer?.type ?? ""; return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Unknown" })()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {getInteractionIcon(interaction.type)}
                            <span className="text-sm text-gray-400">
                              {formatSafeDate(interaction.date)}
                            </span>
                          </div>
                        </div>
                        <h5 className="font-medium mt-2">{interaction.subject}</h5>
                        <p className="text-sm text-gray-300 mt-1">{interaction.content}</p>

                        {interaction.followUp && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-yellow-400">
                            <Calendar className="h-3 w-3" />
                            <span>Follow-up: {formatSafeDate(interaction.followUp)}</span>
                          </div>
                        )}

                        {selectedInteraction === interaction.id && (
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-800 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="followups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Upcoming Follow-ups</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar View
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {mockInteractions
                .filter((interaction) => interaction.followUp)
                .sort((a, b) => new Date(a.followUp!).getTime() - new Date(b.followUp!).getTime())
                .map((interaction) => {
                  const customer = getCustomer(interaction.customerId)
                  return (
                    <div key={interaction.id} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-yellow-400" />
                          <span className="font-medium">{formatSafeDate(interaction.followUp!)}</span>
                        </div>
                        <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">
                          Pending
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={customer?.avatar || "/placeholder.svg"} alt={customer?.name} />
                          <AvatarFallback>{customer?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{customer?.name}</h4>
                          <p className="text-xs text-gray-400">{customer?.email}</p>
                        </div>
                      </div>

                      <div className="bg-gray-700 rounded-md p-3">
                        <h5 className="font-medium text-sm">{interaction.subject}</h5>
                        <p className="text-xs text-gray-300 mt-1">{interaction.content}</p>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" className="flex-1">
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Customer Types</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm">Promoters</span>
                      </div>
                      <span className="text-sm">3 (43%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Clients</span>
                      </div>
                      <span className="text-sm">2 (29%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Artists</span>
                      </div>
                      <span className="text-sm">2 (29%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Top Customers</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/abstract-sg.png" alt="Sophia Garcia" />
                          <AvatarFallback>SG</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">Sophia Garcia</span>
                      </div>
                      <span className="text-sm">$18,750</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/javascript-code-abstract.png" alt="John Smith" />
                          <AvatarFallback>JS</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">John Smith</span>
                      </div>
                      <span className="text-sm">$12,450</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/placeholder.svg?height=40&width=40&query=JT" alt="James Taylor" />
                          <AvatarFallback>JT</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">James Taylor</span>
                      </div>
                      <span className="text-sm">$9,800</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Recent Activity</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">Emails Sent</span>
                      </div>
                      <span className="text-sm">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-400" />
                        <span className="text-sm">Calls Made</span>
                      </div>
                      <span className="text-sm">8</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className="text-sm">Meetings</span>
                      </div>
                      <span className="text-sm">3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-medium text-lg mb-4">Customer Engagement</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Response Time</span>
                      <span className="text-sm font-medium">4.2 hours</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Customer Satisfaction</span>
                      <span className="text-sm font-medium">4.8/5</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: "96%" }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Follow-up Completion Rate</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Customer Report
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
