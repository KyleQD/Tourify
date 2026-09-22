"use client"

/** Admin Dashboard Builder: Superseded by tours/builder (cmp-create-tour-form wont-fix). */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useApiResponseHandler } from "@/hooks/use-api-response"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Music, MapPin, Users, DollarSign, Truck, Hotel, Wrench } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const createTourSchema = z.object({
  name: z.string().min(1, 'Tour name is required'),
  description: z.string().optional(),
  artist_id: z.string().uuid('Please select an artist'),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date({
    required_error: "End date is required",
  }),
  budget: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  transportation: z.string().optional(),
  accommodation: z.string().optional(),
  equipment_requirements: z.string().optional(),
  crew_size: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"],
})

type CreateTourFormData = z.infer<typeof createTourSchema>

interface CreateTourFormProps {
  onSuccess?: (tour: any) => void
  onCancel?: () => void
}

// Mock artists data - in real app this would come from API
const mockArtists = [
  { id: "1", name: "DJ Luna", email: "djluna@example.com" },
  { id: "2", name: "The Midnight Runners", email: "runners@example.com" },
  { id: "3", name: "Marcus Williams Quartet", email: "marcus@example.com" },
]

export function CreateTourForm({ onSuccess, onCancel }: CreateTourFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { handleApiCall } = useApiResponseHandler()

  const form = useForm<CreateTourFormData>({
    resolver: zodResolver(createTourSchema),
    defaultValues: {
      name: '',
      description: '',
      transportation: '',
      accommodation: '',
      equipment_requirements: '',
    },
  })

  const onSubmit = async (data: CreateTourFormData) => {
    setIsLoading(true)
    
    const result = await handleApiCall(
      async () => {
        const response = await fetch('/api/tours', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            start_date: data.start_date.toISOString().split('T')[0],
            end_date: data.end_date.toISOString().split('T')[0],
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create tour')
        }

        return response.json()
      },
      'Tour created successfully!',
      'Failed to create tour'
    )
    
    setIsLoading(false)
    
    if (result) {
      if (onSuccess) {
        onSuccess(result.tour)
      } else {
        router.push(`/admin/dashboard/tours`)
        router.refresh()
      }
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-slate-900/50 border-slate-700/50">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold text-white flex items-center">
          <Music className="h-6 w-6 mr-3 text-purple-400" />
          Create New Tour
        </CardTitle>
        <p className="text-slate-400">Set up a new tour with multiple events and comprehensive planning</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Tour Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Summer Electronic Tour 2025"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Artist *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                            <SelectValue placeholder="Select an artist" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockArtists.map((artist) => (
                            <SelectItem key={artist.id} value={artist.id}>
                              {artist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        placeholder="Describe the tour concept, theme, and key highlights..."
                        className="bg-slate-800/50 border-slate-700/50 text-white min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tour Dates */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Tour Dates</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-slate-300">Start Date *</FormLabel>
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
                                <span>Pick start date</span>
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

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-slate-300">End Date *</FormLabel>
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
                                <span>Pick end date</span>
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
              </div>
            </div>

            {/* Budget & Logistics */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Budget & Logistics</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Total Budget</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="e.g., 500000"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crew_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Crew Size</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="e.g., 12"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="transportation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        Transportation
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Tour Bus + Truck"
                          className="bg-slate-800/50 border-slate-700/50 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accommodation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 flex items-center">
                        <Hotel className="h-4 w-4 mr-2" />
                        Accommodation
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Hotels, Luxury"
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
                name="equipment_requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Equipment Requirements
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe sound, lighting, stage, and other technical requirements..."
                        className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    Creating Tour...
                  </>
                ) : (
                  'Create Tour'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 