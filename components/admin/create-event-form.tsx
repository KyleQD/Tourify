"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Music, MapPin, Users, DollarSign, Clock, Phone, Mail, Mic, Lightbulb, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  tour_id: z.string().optional(),
  venue_name: z.string().min(1, 'Venue name is required'),
  venue_address: z.string().optional(),
  event_date: z.date({
    required_error: "Event date is required",
  }),
  event_time: z.string().optional(),
  doors_open: z.string().optional(),
  duration_minutes: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  capacity: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  ticket_price: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  vip_price: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  expected_revenue: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  sound_requirements: z.string().optional(),
  lighting_requirements: z.string().optional(),
  stage_requirements: z.string().optional(),
  special_requirements: z.string().optional(),
  venue_contact_name: z.string().optional(),
  venue_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  venue_contact_phone: z.string().optional(),
  load_in_time: z.string().optional(),
  sound_check_time: z.string().optional(),
})

type CreateEventFormData = z.infer<typeof createEventSchema>

interface CreateEventFormProps {
  tourId?: string
  onSuccess?: (event: any) => void
  onCancel?: () => void
}

export function CreateEventForm({ tourId, onSuccess, onCancel }: CreateEventFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tours, setTours] = useState<any[]>([])
  const [loadingTours, setLoadingTours] = useState(false)
  const router = useRouter()

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      description: '',
      tour_id: tourId || '',
      venue_name: '',
      venue_address: '',
      event_time: '',
      doors_open: '',
      venue_contact_name: '',
      venue_contact_email: '',
      venue_contact_phone: '',
      sound_requirements: '',
      lighting_requirements: '',
      stage_requirements: '',
      special_requirements: '',
      load_in_time: '',
      sound_check_time: '',
    },
  })

  // Fetch tours for the dropdown
  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoadingTours(true)
        const response = await fetch('/api/tours?status=planning,active')
        if (response.ok) {
          const data = await response.json()
          setTours(data.tours || [])
        }
      } catch (error) {
        console.error('Error fetching tours:', error)
      } finally {
        setLoadingTours(false)
      }
    }

    fetchTours()
  }, [])

  const onSubmit = async (data: CreateEventFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          event_date: data.event_date.toISOString().split('T')[0],
          tour_id: data.tour_id || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }

      const result = await response.json()
      
      if (onSuccess) {
        onSuccess(result.event)
      } else {
        router.push(`/admin/dashboard/events`)
        router.refresh()
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-slate-900/50 border-slate-700/50">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold text-white flex items-center">
          <CalendarIcon className="h-6 w-6 mr-3 text-purple-400" />
          Create New Event
        </CardTitle>
        <p className="text-slate-400">
          {tourId ? 'Add an event to the tour' : 'Create a standalone event or add to an existing tour'}
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Event Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Event Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Summer Music Festival"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!tourId && (
                  <FormField
                    control={form.control}
                    name="tour_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Tour (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                              <SelectValue placeholder="Select a tour or leave blank for standalone event" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Standalone Event</SelectItem>
                            {tours.map((tour) => (
                              <SelectItem key={tour.id} value={tour.id}>
                                {tour.name} ({tour.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="event_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-slate-300">Event Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-800",
                                !field.value && "text-slate-400"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick event date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="event_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Event Time</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="time"
                            className="bg-slate-800/50 border-slate-700/50 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doors_open"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Doors Open</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="time"
                            className="bg-slate-800/50 border-slate-700/50 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the event, performers, and key highlights..."
                        className="bg-slate-800/50 border-slate-700/50 text-white min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Venue Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Venue Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="venue_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Venue Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Madison Square Garden"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="e.g., 20000"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Venue Address</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Full venue address including city and state"
                        className="bg-slate-800/50 border-slate-700/50 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="venue_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Contact Person</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Contact name"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venue_contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder="contact@venue.com"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venue_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Contact Phone</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Phone number"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Ticketing & Revenue */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Ticketing & Revenue</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="ticket_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">General Ticket Price</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 75.00"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vip_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">VIP Ticket Price</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 150.00"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Expected Revenue</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 500000.00"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Mic className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Technical Requirements</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sound_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Sound Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe sound system, microphones, monitors, etc."
                          className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lighting_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Lighting Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe lighting setup, special effects, etc."
                          className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Stage Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe stage size, setup, risers, etc."
                          className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="special_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Special Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Any other special requirements or notes"
                          className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Event Schedule</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="load_in_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Load-in Time</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="time"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sound_check_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Sound Check Time</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="time"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="e.g., 120"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-700/50">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 