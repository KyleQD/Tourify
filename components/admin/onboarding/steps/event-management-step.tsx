"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { 
  Calendar, 
  MapPin,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Plus
} from "lucide-react"
import { formatSafeNumber } from "@/lib/format/number-format"

interface EventManagementStepProps {
  onNext: () => void
}

export function EventManagementStep({ onNext }: EventManagementStepProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl">
            <Calendar className="h-12 w-12 text-green-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Event Management</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Learn how to create and manage events within your tours. Events are the individual shows and performances.
          </p>
        </div>
      </div>

      {/* Event Management Demo */}
      <Card className="border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Event Management Interface</CardTitle>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sample Events */}
          <div className="space-y-4">
            {[
              {
                name: "Summer Music Festival - NYC",
                date: "June 20, 2024",
                time: "7:00 PM",
                venue: "Central Park",
                status: "confirmed",
                capacity: 5000,
                ticketsSold: 4200
              },
              {
                name: "Indie Rock Night - LA",
                date: "July 5, 2024",
                time: "8:00 PM",
                venue: "Hollywood Bowl",
                status: "scheduled",
                capacity: 8000,
                ticketsSold: 1500
              },
              {
                name: "Electronic Showcase - Miami",
                date: "July 15, 2024",
                time: "9:00 PM",
                venue: "Bayfront Park",
                status: "planning",
                capacity: 3000,
                ticketsSold: 0
              }
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-700 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{event.name}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {event.date} at {event.time}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.venue}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatSafeNumber(event.ticketsSold)}/{formatSafeNumber(event.capacity)}
                    </p>
                    <p className="text-xs text-slate-400">tickets sold</p>
                  </div>
                  <Badge variant={
                    event.status === 'confirmed' ? 'default' :
                    event.status === 'scheduled' ? 'secondary' : 'outline'
                  }>
                    {event.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Management Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Event Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Quick event setup wizard</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Venue and date selection</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Capacity and pricing setup</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Automatic tour assignment</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Event Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Real-time status updates</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Ticket sales tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Venue coordination tools</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Team assignment</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-center pt-6">
        <Button size="lg" onClick={onNext} className="px-8">
          Continue to Team Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-slate-500">
          Events are the heart of your tours. Now let's learn how to assemble and manage your team.
        </p>
      </div>
    </div>
  )
} 