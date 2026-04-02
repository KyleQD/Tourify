"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Ticket, Plus, DollarSign, TrendingUp, Users, 
  Calendar, MapPin, ExternalLink, BarChart3, 
  Settings, Download, Share2
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface TicketEvent {
  id: string
  name: string
  date: string
  venue: string
  location: string
  totalTickets: number
  soldTickets: number
  revenue: number
  status: 'active' | 'sold-out' | 'ended'
  ticketTypes: {
    name: string
    price: number
    sold: number
    total: number
  }[]
}

const SAMPLE_EVENTS: TicketEvent[] = [
  {
    id: "1",
    name: "Summer Electronic Fest",
    date: "2024-07-15",
    venue: "Echo Park",
    location: "Los Angeles, CA",
    totalTickets: 500,
    soldTickets: 347,
    revenue: 12450,
    status: 'active',
    ticketTypes: [
      { name: "General Admission", price: 35, sold: 245, total: 350 },
      { name: "VIP", price: 75, sold: 85, total: 100 },
      { name: "Early Bird", price: 25, sold: 17, total: 50 }
    ]
  },
  {
    id: "2",
    name: "Intimate Acoustic Set",
    date: "2024-06-22",
    venue: "The Blue Note",
    location: "New York, NY",
    totalTickets: 150,
    soldTickets: 150,
    revenue: 4500,
    status: 'sold-out',
    ticketTypes: [
      { name: "General Admission", price: 30, sold: 150, total: 150 }
    ]
  }
]

function EventTicketCard({ event }: { event: TicketEvent }) {
  const salesPercentage = (event.soldTickets / event.totalTickets) * 100
  
  return (
    <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a] hover:shadow-2xl transition-all">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white text-lg">{event.name}</CardTitle>
            <CardDescription className="text-gray-400">
              {formatSafeDate(event.date)}
            </CardDescription>
          </div>
          <Badge className={`${
            event.status === 'sold-out' ? 'bg-red-600' :
            event.status === 'ended' ? 'bg-gray-600' :
            'bg-green-600'
          } text-white`}>
            {event.status === 'sold-out' ? 'Sold Out' :
             event.status === 'ended' ? 'Ended' :
             'Active'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="h-4 w-4" />
          <span>{event.venue}, {event.location}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{event.soldTickets}</div>
            <div className="text-xs text-gray-400">Sold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{event.totalTickets - event.soldTickets}</div>
            <div className="text-xs text-gray-400">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{formatSafeCurrency(event.revenue)}</div>
            <div className="text-xs text-gray-400">Revenue</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Sales Progress</span>
            <span className="text-white">{salesPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${salesPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-white font-medium">Ticket Types</h4>
          {event.ticketTypes.map((ticket, index) => (
            <div key={index} className="flex justify-between items-center bg-[#23263a] p-3 rounded-lg">
              <div>
                <div className="text-white font-medium">{ticket.name}</div>
                <div className="text-gray-400 text-sm">${ticket.price}</div>
              </div>
              <div className="text-right">
                <div className="text-white">{ticket.sold}/{ticket.total}</div>
                <div className="text-gray-400 text-sm">
                  {((ticket.sold / ticket.total) * 100).toFixed(0)}% sold
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 border-gray-700 text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-gray-700 text-white">
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-white">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TicketStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardContent className="p-6 text-center">
          <Ticket className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">497</div>
          <div className="text-sm text-gray-400">Total Sold</div>
        </CardContent>
      </Card>
      
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardContent className="p-6 text-center">
          <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">$16,950</div>
          <div className="text-sm text-gray-400">Total Revenue</div>
        </CardContent>
      </Card>
      
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">76%</div>
          <div className="text-sm text-gray-400">Avg. Sales Rate</div>
        </CardContent>
      </Card>
      
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">2</div>
          <div className="text-sm text-gray-400">Active Events</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ArtistTicketsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-[#181b23] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Ticket Sales</h1>
            <p className="text-gray-400">Manage your event tickets and track sales performance</p>
          </div>
          <Button className="bg-purple-600 text-white hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Stats */}
        <TicketStats />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#13151c] border border-gray-800 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg">Active Events</TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg">Past Events</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {SAMPLE_EVENTS.map((event) => (
                <EventTicketCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {SAMPLE_EVENTS.filter(event => event.status === 'active').map((event) => (
                <EventTicketCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="past">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {SAMPLE_EVENTS.filter(event => event.status === 'ended' || event.status === 'sold-out').map((event) => (
                <EventTicketCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-20 text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Advanced analytics and reporting will be available here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 