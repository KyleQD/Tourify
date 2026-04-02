"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Share2,
  BarChart3,
  Mail,
  Edit3,
  Save,
  Eye,
  Upload,
  Plus,
  X,
  Ticket,
  Loader2,
} from "lucide-react"

// Mock data - in a real app this would come from an API
const mockEvent = {
  id: "event-1",
  title: "Summer Music Festival 2025",
  description: "A three-day outdoor music festival featuring local and international artists across multiple genres.",
  date: new Date("2025-07-15T14:00:00"),
  startTime: "14:00",
  endTime: "23:00",
  setupTime: "08:00",
  soundcheckTime: "12:00",
  type: "festival",
  status: "confirmed",
  capacity: 5000,
  ticketsSold: 3250,
  revenue: 162500,
  isPublic: true,
  venue: "The Echo Lounge",
  organizer: "Festival Productions LLC",
  
  // Extended data for comprehensive management
  ticketTypes: [
    { id: "1", name: "General Admission", price: 45, quantity: 3000, sold: 2100, perks: ["Access to all stages", "Festival wristband"] },
    { id: "2", name: "VIP Pass", price: 120, quantity: 500, sold: 300, perks: ["VIP Area Access", "Meet & Greet", "Free Drinks", "Premium Parking"] },
    { id: "3", name: "Premium", price: 85, quantity: 1000, sold: 850, perks: ["Front Row Access", "Express Entry", "Festival Merchandise"] }
  ],
  
  staff: [
    { id: "1", name: "Alex Johnson", role: "Event Manager", department: "Operations", contact: "alex@eventpro.com", status: "confirmed" },
    { id: "2", name: "Sarah Chen", role: "Sound Engineer", department: "Technical", contact: "sarah@techsound.com", status: "confirmed" },
    { id: "3", name: "Mike Rodriguez", role: "Security Lead", department: "Security", contact: "mike@security.com", status: "pending" },
    { id: "4", name: "Emma Wilson", role: "Stage Manager", department: "Production", contact: "emma@stage.com", status: "confirmed" }
  ],
  
  equipment: [
    { id: "1", name: "Main PA System", category: "Audio", status: "confirmed", vendor: "Pro Sound Rental" },
    { id: "2", name: "Stage Lighting Rig", category: "Lighting", status: "confirmed", vendor: "LightWorks" },
    { id: "3", name: "Video Screens", category: "Visual", status: "pending", vendor: "Visual Pro" },
    { id: "4", name: "Security Barriers", category: "Safety", status: "confirmed", vendor: "SafeEvent Co" }
  ],
  
  documents: [
    { id: "1", name: "Event Insurance", type: "pdf", size: "2.1 MB", uploadDate: "2025-01-10", status: "approved" },
    { id: "2", name: "Stage Plot", type: "pdf", size: "5.3 MB", uploadDate: "2025-01-12", status: "approved" },
    { id: "3", name: "Security Plan", type: "pdf", size: "1.8 MB", uploadDate: "2025-01-15", status: "pending" },
    { id: "4", name: "Vendor Contracts", type: "pdf", size: "8.7 MB", uploadDate: "2025-01-18", status: "approved" }
  ],
  
  promotions: [
    { id: "1", channel: "Social Media", budget: 5000, spent: 3200, reach: 125000, engagement: 8500, status: "active" },
    { id: "2", channel: "Radio Ads", budget: 8000, spent: 8000, reach: 250000, engagement: 12000, status: "completed" },
    { id: "3", channel: "Influencer Partnerships", budget: 3000, spent: 2100, reach: 85000, engagement: 15000, status: "active" }
  ],
  
  guests: [
    { id: "1", name: "John Smith", email: "john@example.com", type: "VIP", status: "confirmed", plus: 2 },
    { id: "2", name: "Lisa Johnson", email: "lisa@example.com", type: "Media", status: "pending", plus: 1 },
    { id: "3", name: "David Wilson", email: "david@example.com", type: "Artist", status: "confirmed", plus: 3 }
  ],
  
  budget: {
    total: 250000,
    spent: 185000,
    categories: [
      { name: "Artist Fees", budgeted: 120000, spent: 115000 },
      { name: "Equipment Rental", budgeted: 45000, spent: 32000 },
      { name: "Staff Costs", budgeted: 35000, spent: 28000 },
      { name: "Marketing", budgeted: 25000, spent: 10000 },
      { name: "Venue Costs", budgeted: 15000, spent: 0 },
      { name: "Miscellaneous", budgeted: 10000, spent: 0 }
    ]
  },
  
  analytics: {
    ticketSales: {
      daily: [120, 145, 89, 234, 567, 445, 332, 289, 445, 667, 789, 556, 334, 223],
      total: 3250,
      revenue: 162500
    },
    demographics: {
      ageGroups: [
        { range: "18-25", count: 1300, percentage: 40 },
        { range: "26-35", count: 975, percentage: 30 },
        { range: "36-45", count: 650, percentage: 20 },
        { range: "46+", count: 325, percentage: 10 }
      ],
      topCities: [
        { city: "Los Angeles", count: 1200 },
        { city: "San Francisco", count: 800 },
        { city: "San Diego", count: 450 },
        { city: "Sacramento", count: 300 }
      ]
    },
    engagement: {
      websiteViews: 45000,
      socialShares: 8500,
      emailOpens: 12000,
      conversionRate: 7.2
    }
  }
}

export default function EventManagementDashboard() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  useEffect(() => {
    // In a real app, fetch event data from API using params.id
    const loadEvent = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setEvent(mockEvent)
        setEditData(mockEvent)
      } catch (error) {
        console.error("Error loading event:", error)
        toast({
          title: "Error",
          description: "Failed to load event data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [params.id, toast])

  const handleSaveChanges = () => {
    setEvent(editData)
    setIsEditing(false)
    toast({
      title: "Changes Saved",
      description: "Event details have been updated successfully",
    })
  }

  const handleCancelEdit = () => {
    setEditData(event)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="mt-4 text-gray-400 animate-pulse">Loading event dashboard...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
        <Card className="max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
            <p className="text-gray-400 mb-4">The event you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/venue")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/venue")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {event.title}
                <Badge variant={event.status === "confirmed" ? "default" : event.status === "pending" ? "secondary" : "destructive"}>
                  {event.status}
                </Badge>
              </h1>
              <p className="text-gray-400 text-sm">{event.type} • {event.venue} • {formatSafeDate(event.date.toISOString())}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Page
                </Button>
                <Button>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{formatSafeNumber(event.ticketsSold)}</div>
            <div className="text-xs text-gray-400">Tickets Sold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{formatSafeCurrency(event.revenue)}</div>
            <div className="text-xs text-gray-400">Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{formatSafeNumber(event.capacity)}</div>
            <div className="text-xs text-gray-400">Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{Math.round((event.ticketsSold / event.capacity) * 100)}%</div>
            <div className="text-xs text-gray-400">Sold Out</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{event.staff.length}</div>
            <div className="text-xs text-gray-400">Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}</div>
            <div className="text-xs text-gray-400">Days Left</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="tickets">Ticketing</TabsTrigger>
            <TabsTrigger value="staff">Staff & Crew</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="guests">Guest List</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Summary */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Event Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-400">Date & Time</Label>
                        <p className="text-sm">{formatSafeDate(event.date.toISOString())} • {event.startTime} - {event.endTime}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-400">Capacity</Label>
                        <p className="text-sm">{formatSafeNumber(event.capacity)} people</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-400">Organizer</Label>
                        <p className="text-sm">{event.organizer}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-400">Venue</Label>
                        <p className="text-sm">{event.venue}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-400">Description</Label>
                      <p className="text-sm text-gray-300">{event.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Sales Progress */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Ticket Sales Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>{formatSafeNumber(event.ticketsSold)} sold</span>
                        <span>{formatSafeNumber(event.capacity - event.ticketsSold)} remaining</span>
                      </div>
                      <Progress value={(event.ticketsSold / event.capacity) * 100} className="h-3" />
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {event.ticketTypes.map((ticket: any) => (
                          <div key={ticket.id} className="space-y-1">
                            <div className="text-xs text-gray-400">{ticket.name}</div>
                            <div className="text-sm font-medium">{ticket.sold}/{ticket.quantity}</div>
                            <div className="text-xs text-green-400">{formatSafeCurrency(ticket.sold * ticket.price)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Staff Member
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Update
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-400">Stage plot approved</span>
                        <span className="text-gray-500 text-xs ml-auto">2h ago</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-400">New staff member added</span>
                        <span className="text-gray-500 text-xs ml-auto">4h ago</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-400">50 tickets sold</span>
                        <span className="text-gray-500 text-xs ml-auto">6h ago</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                        <span className="text-gray-400">Promotion campaign launched</span>
                        <span className="text-gray-500 text-xs ml-auto">1d ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Overview */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Documentation</span>
                        <Badge variant="default" className="text-xs">Complete</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Staff Assignments</span>
                        <Badge variant="secondary" className="text-xs">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Equipment Setup</span>
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Marketing Campaign</span>
                        <Badge variant="default" className="text-xs">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Placeholder for other tabs - you can expand these */}
          <TabsContent value="details">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Manage detailed event information and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Event details management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Ticketing Management</CardTitle>
                <CardDescription>Manage ticket types, pricing, and sales</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Ticketing management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add more tab contents as needed */}
        </Tabs>
      </div>
    </div>
  )
} 