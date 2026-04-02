"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  Rocket, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Truck,
  Ticket,
  CreditCard,
  FileText
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface ReviewPublishStepProps {
  tourData: {
    name: string
    description: string
    mainArtist: string
    genre: string
    coverImage: string
    startDate: string
    endDate: string
    route: Array<{
      city: string
      venue: string
      date: string
      coordinates: { lat: number; lng: number }
    }>
    events: Array<{
      id: string
      name: string
      venue: string
      date: string
      time: string
      description: string
      capacity: number
    }>
    artists: Array<{
      id: string
      name: string
      role: string
      events: string[]
    }>
    crew: Array<{
      id: string
      name: string
      role: string
      events: string[]
    }>
    transportation: {
      type: string
      details: string
      cost: number
    }
    accommodation: {
      type: string
      details: string
      cost: number
    }
    equipment: Array<{
      id: string
      name: string
      quantity: number
      cost: number
    }>
    ticketTypes: Array<{
      name: string
      price: number
      quantity: number
      description: string
    }>
    budget: {
      total: number
      expenses: Array<{
        category: string
        amount: number
        description: string
      }>
    }
    sponsors: Array<{
      name: string
      contribution: number
      type: string
    }>
  }
  updateTourData: (updates: any) => void
}

export function ReviewPublishStep({ tourData }: ReviewPublishStepProps) {
  const totalTicketRevenue = tourData.ticketTypes.reduce((sum, ticket) => 
    sum + (ticket.price * ticket.quantity), 0
  )

  const totalExpenses = tourData.budget.expenses.reduce((sum, expense) => 
    sum + expense.amount, 0
  )

  const totalSponsorContributions = tourData.sponsors.reduce((sum, sponsor) => 
    sum + sponsor.contribution, 0
  )

  const totalLogisticsCost = 
    tourData.transportation.cost + 
    tourData.accommodation.cost + 
    tourData.equipment.reduce((sum, item) => sum + item.cost, 0)

  const netProfit = totalTicketRevenue + totalSponsorContributions - totalExpenses

  const getValidationStatus = () => {
    const issues: string[] = []
    
    if (!tourData.name) issues.push("Tour name is required")
    if (!tourData.mainArtist) issues.push("Main artist is required")
    if (!tourData.genre) issues.push("Genre is required")
    if (!tourData.startDate) issues.push("Start date is required")
    if (!tourData.endDate) issues.push("End date is required")
    if (tourData.route.length === 0) issues.push("At least one venue is required")
    if (tourData.events.length === 0) issues.push("At least one event is required")
    if (tourData.artists.length === 0) issues.push("At least one artist is required")
    if (!tourData.transportation.type) issues.push("Transportation is required")
    if (!tourData.accommodation.type) issues.push("Accommodation is required")
    // Ticketing and financials are optional - removed validation requirements
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }

  const validation = getValidationStatus()

  const handlePublishTour = () => {
    if (validation.isValid) {
      // In a real app, this would save to the database
      alert("Tour published successfully!")
    }
  }

  return (
    <div className="space-y-8">
      {/* Validation Status */}
      <Card className={`p-6 ${validation.isValid ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
        <div className="flex items-center space-x-3 mb-4">
          {validation.isValid ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          )}
          <h3 className={`text-lg font-semibold ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
            {validation.isValid ? 'Ready to Publish' : 'Issues Found'}
          </h3>
        </div>
        
        {validation.isValid ? (
          <p className="text-green-300">All required information has been completed. Your tour is ready to be published!</p>
        ) : (
          <div>
            <p className="text-red-300 mb-3">Please fix the following issues before publishing:</p>
            <ul className="space-y-1">
              {validation.issues.map((issue, index) => (
                <li key={index} className="text-red-300 text-sm flex items-center space-x-2">
                  <div className="w-1 h-1 bg-red-400 rounded-full" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Tour Overview */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Tour Overview</h3>
        </div>

        {/* Basic Info */}
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 text-sm">Tour Name:</span>
                  <p className="text-white font-medium">{tourData.name || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Main Artist:</span>
                  <p className="text-white font-medium">{tourData.mainArtist || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Genre:</span>
                  <Badge variant="secondary" className="ml-2">{tourData.genre || "Not specified"}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Description:</span>
                  <p className="text-white text-sm mt-1">{tourData.description || "No description provided"}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Tour Dates</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">Start Date:</span>
                  <span className="text-white">{formatSafeDate(tourData.startDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">End Date:</span>
                  <span className="text-white">{formatSafeDate(tourData.endDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">Venues:</span>
                  <span className="text-white">{tourData.route.length} venue{tourData.route.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">Team:</span>
                  <span className="text-white">{tourData.artists.length + tourData.crew.length} members</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Route & Events */}
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4">Route & Events</h4>
          <div className="space-y-3">
            {tourData.route.map((stop, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40">
                  <span className="text-xs font-medium text-purple-400">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{stop.city}</div>
                  <div className="text-sm text-slate-400">{stop.venue}</div>
                </div>
                <div className="text-sm text-slate-400">
                  {formatSafeDate(stop.date)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Team */}
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4">Team</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-purple-300 font-medium mb-3">Artists ({tourData.artists.length})</h5>
              <div className="space-y-2">
                {tourData.artists.map((artist, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-white">{artist.name}</span>
                    <Badge variant="outline" className="text-xs">{artist.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-blue-300 font-medium mb-3">Crew ({tourData.crew.length})</h5>
              <div className="space-y-2">
                {tourData.crew.map((crew, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-white">{crew.name}</span>
                    <Badge variant="outline" className="text-xs">{crew.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Logistics */}
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4">Logistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-sm">Transportation:</span>
              </div>
              <p className="text-white">{tourData.transportation.type || "Not specified"}</p>
              <p className="text-slate-400 text-sm">{formatSafeCurrency(tourData.transportation.cost)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-green-400" />
                <span className="text-slate-400 text-sm">Accommodation:</span>
              </div>
              <p className="text-white">{tourData.accommodation.type || "Not specified"}</p>
              <p className="text-slate-400 text-sm">{formatSafeCurrency(tourData.accommodation.cost)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400 text-sm">Equipment:</span>
              </div>
              <p className="text-white">{tourData.equipment.length} items</p>
              <p className="text-slate-400 text-sm">{formatSafeCurrency(tourData.equipment.reduce((sum, item) => sum + item.cost, 0))}</p>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Financial Summary</h4>
            {(tourData.ticketTypes.length === 0 && tourData.budget.expenses.length === 0 && tourData.sponsors.length === 0) && (
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                Optional - Can be completed later
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Ticket className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400">Ticket Types:</span>
                <span className="text-white">{tourData.ticketTypes.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-slate-400">Potential Revenue:</span>
                <span className="text-white">{formatSafeCurrency(totalTicketRevenue)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Sponsors:</span>
                <span className="text-white">{tourData.sponsors.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Sponsor Contributions:</span>
                <span className="text-white">{formatSafeCurrency(totalSponsorContributions)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-red-400" />
                <span className="text-slate-400">Total Expenses:</span>
                <span className="text-red-400">{formatSafeCurrency(totalExpenses)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <span className="text-slate-400">Logistics Cost:</span>
                <span className="text-orange-400">{formatSafeCurrency(totalLogisticsCost)}</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-slate-400 font-medium">Net Profit/Loss:</span>
                  <span className={`font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSafeCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Publish Button */}
      <div className="flex justify-center">
        <Button
          onClick={handlePublishTour}
          disabled={!validation.isValid}
          size="lg"
          className={`px-8 py-3 text-lg ${
            validation.isValid 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Rocket className="w-5 h-5 mr-2" />
          {validation.isValid ? 'Publish Tour' : 'Complete Required Fields'}
        </Button>
      </div>
    </div>
  )
} 