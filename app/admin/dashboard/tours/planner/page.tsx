"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Circle, 
  MapPin, 
  Calendar, 
  Users, 
  Truck, 
  Ticket, 
  DollarSign, 
  Eye,
  Rocket,
  Building2,
  Mic,
  Route,
  Settings,
  FileText,
  CreditCard,
  BarChart3,
  Globe
} from "lucide-react"

// Step components
import { TourInitiationStep } from "./components/tour-initiation-step"
import { RoutingDatesStep } from "./components/routing-dates-step"
import { EventsStep } from "./components/events-step"
import { ArtistsCrewStep } from "./components/artists-crew-step"
import { LogisticsStep } from "./components/logistics-step"
import { TicketingFinancialsStep } from "./components/ticketing-financials-step"
import { ReviewPublishStep } from "./components/review-publish-step"
import { toast } from "@/hooks/use-toast"

interface TourData {
  // Step 1: Tour Initiation
  name: string
  description: string
  mainArtist: string
  genre: string
  coverImage: string
  
  // Step 2: Routing & Dates
  startDate: string
  endDate: string
  route: Array<{
    city: string
    venue: string
    date: string
    coordinates: { lat: number; lng: number }
  }>
  
  // Step 3: Events
  events: Array<{
    id: string
    name: string
    venue: string
    date: string
    time: string
    description: string
    capacity: number
  }>
  
  // Step 4: Artists & Crew
  artists: Array<{
    id: string
    name: string
    role: string
    events: string[]
    team_id?: string
  }>
  crew: Array<{
    id: string
    name: string
    role: string
    events: string[]
    team_id?: string
  }>
  teams: Array<{
    id: string
    name: string
    role: string
    description?: string
    members: Array<{
      id: string
      name: string
      email: string
      role: string
    }>
    created_at: string
  }>
  
  // Step 5: Logistics
  transportation: {
    type: string
    details: string
    cost: number
    departure_city?: string
    arrival_city?: string
    departure_date?: string
    departure_time?: string
    arrival_date?: string
    arrival_time?: string
    flight_number?: string
    airline?: string
    vehicle_type?: string
    driver_name?: string
    driver_phone?: string
  }
  accommodation: {
    type: string
    details: string
    cost: number
    hotel_name?: string
    check_in_date?: string
    check_out_date?: string
    check_in_time?: string
    check_out_time?: string
    room_type?: string
    confirmation_number?: string
    contact_phone?: string
    special_requests?: string
  }
  equipment: Array<{
    id: string
    name: string
    quantity: number
    cost: number
  }>
  
  // Step 6: Ticketing & Financials
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    quantity: number
    description: string
    event_id?: string
    is_third_party?: boolean
    third_party_url?: string
    third_party_fee?: number
    sale_start?: string
    sale_end?: string
    max_per_customer?: number
    benefits?: string[]
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

const steps = [
  {
    id: 1,
    title: "Tour Initiation",
    description: "Basic tour information",
    icon: Rocket,
    component: TourInitiationStep
  },
  {
    id: 2,
    title: "Routing & Dates",
    description: "Plan your tour route",
    icon: Route,
    component: RoutingDatesStep
  },
  {
    id: 3,
    title: "Events",
    description: "Create tour events",
    icon: Calendar,
    component: EventsStep
  },
  {
    id: 4,
    title: "Artists & Crew",
    description: "Assign team members",
    icon: Users,
    component: ArtistsCrewStep
  },
  {
    id: 5,
    title: "Logistics",
    description: "Transport & equipment",
    icon: Truck,
    component: LogisticsStep
  },
  {
    id: 6,
    title: "Ticketing & Financials",
    description: "Pricing & budget",
    icon: DollarSign,
    component: TicketingFinancialsStep
  },
  {
    id: 7,
    title: "Review & Publish",
    description: "Final review",
    icon: Eye,
    component: ReviewPublishStep
  }
]

export default function TourPlannerPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isPublishing, setIsPublishing] = useState(false)
  const [tourData, setTourData] = useState<TourData>({
    name: "",
    description: "",
    mainArtist: "",
    genre: "",
    coverImage: "",
    startDate: "",
    endDate: "",
    route: [],
    events: [],
    artists: [],
    crew: [],
    teams: [],
    transportation: { type: "", details: "", cost: 0 },
    accommodation: { type: "", details: "", cost: 0 },
    equipment: [],
    ticketTypes: [],
    budget: { total: 0, expenses: [] },
    sponsors: []
  })

  const updateTourData = (updates: Partial<TourData>) => {
    setTourData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const isStepComplete = (step: number) => {
    // Basic validation logic - can be enhanced
    switch (step) {
      case 1:
        return tourData.name && tourData.mainArtist && tourData.genre
      case 2:
        return tourData.startDate && tourData.endDate && tourData.route.length > 0
      case 3:
        return tourData.events.length > 0
      case 4:
        return tourData.artists.length > 0
      case 5:
        return tourData.transportation.type && tourData.accommodation.type
      case 6:
        // Allow proceeding with minimal ticketing/financial data
        // Users can add details later or leave some fields blank
        return true // Always allow proceeding to next step
      case 7:
        return true // Always accessible for review
      default:
        return false
    }
  }

  const handlePublishTour = async () => {
    if (!isStepComplete(7)) {
      toast({
        title: "Cannot Publish",
        description: "Please complete all required fields before publishing.",
        variant: "destructive",
      })
      return
    }

    setIsPublishing(true)
    
    try {
      // Transform tour data to match API schema
      const apiData = {
        step1: {
          name: tourData.name,
          description: tourData.description,
          mainArtist: tourData.mainArtist,
          genre: tourData.genre,
          coverImage: tourData.coverImage
        },
        step2: {
          startDate: tourData.startDate,
          endDate: tourData.endDate,
          route: tourData.route
        },
        step3: {
          events: tourData.events
        },
        step4: {
          artists: tourData.artists,
          crew: tourData.crew
        },
        step5: {
          transportation: tourData.transportation,
          accommodation: tourData.accommodation,
          equipment: tourData.equipment
        },
        step6: {
          ticketTypes: tourData.ticketTypes,
          budget: tourData.budget,
          sponsors: tourData.sponsors
        }
      }

      const response = await fetch('/api/tours/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish tour')
      }

      const result = await response.json()
      
      toast({
        title: "🚀 Tour Published Successfully!",
        description: `"${tourData.name}" is now live and ready to go!`,
      })

      // Redirect to tours page after successful publication
      router.push('/admin/dashboard/tours?published=true')

    } catch (error) {
      console.error('Error publishing tour:', error)
      toast({
        title: "Publishing Failed",
        description: error instanceof Error ? error.message : "Failed to publish tour. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const CurrentStepComponent = steps[currentStep - 1].component

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40">
              <Globe className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Tourify</h1>
              <p className="text-slate-400">Plan your perfect tour</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-slate-400">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-slate-950/98 backdrop-blur-xl border border-purple-500/20 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Tour Planning Steps</h3>
              
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isActive = currentStep === step.id
                  const isCompleted = isStepComplete(step.id)
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-purple-500/20 border border-purple-500/40 text-purple-200"
                          : isCompleted
                          ? "bg-green-500/10 border border-green-500/30 text-green-200 hover:bg-green-500/20"
                          : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <step.icon className={`w-5 h-5 ${isActive ? "text-purple-400" : "text-slate-500"}`} />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">{step.title}</div>
                        <div className="text-xs opacity-75">{step.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="p-8 bg-slate-950/98 backdrop-blur-xl border border-purple-500/20 rounded-2xl min-h-[600px]">
              {/* Step Header */}
              <div className="flex items-center space-x-4 mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40">
                  {React.createElement(steps[currentStep - 1].icon, {
                    className: "w-6 h-6 text-purple-400"
                  })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {steps[currentStep - 1].title}
                  </h2>
                  <p className="text-slate-400">
                    {steps[currentStep - 1].description}
                  </p>
                </div>
              </div>

              {/* Step Content */}
              <div className="mb-8">
                <CurrentStepComponent
                  tourData={tourData}
                  updateTourData={updateTourData}
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center space-x-4">
                  {currentStep < steps.length ? (
                    <Button
                      onClick={nextStep}
                      disabled={!isStepComplete(currentStep)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePublishTour}
                      disabled={isPublishing || !isStepComplete(7)}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600 disabled:text-slate-400"
                    >
                      {isPublishing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Publish Tour
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 