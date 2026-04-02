"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Building2,
  MapPin,
  Users,
  Clock,
  Mail,
  Phone,
  Globe,
  Save,
  Loader2,
  Settings,
  Shield,
  Calendar,
  DollarSign,
  Wifi,
  Car,
  Accessibility,
  Music,
  Coffee
} from "lucide-react"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from "@/contexts/auth-context"

const venueProfileSchema = z.object({
  venue_name: z.string().min(1, 'Venue name is required').max(100),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100000),
  venue_types: z.array(z.string()).min(1, 'Select at least one venue type'),
  
  // Address
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  
  // Contact Information
  contact_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  contact_phone: z.string().max(20).optional(),
  booking_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  manager_name: z.string().max(100).optional(),
  
  // Social Links
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  
  // Technical Specs
  stage_size: z.string().optional(),
  sound_system: z.string().optional(),
  lighting: z.string().optional(),
  curfew: z.string().optional(),
  age_restrictions: z.string().optional(),
  parking_spots: z.number().optional(),
  
  // Amenities
  green_room: z.boolean().default(false),
  loading_dock: z.boolean().default(false),
  wifi: z.boolean().default(true),
  accessibility: z.boolean().default(false),
  alcohol_license: z.boolean().default(false),
  food_service: z.boolean().default(false),
  
  // Business Settings
  accepting_bookings: z.boolean().default(true),
  min_booking_notice: z.string().default('2_weeks'),
  base_rate: z.string().optional(),
  
  // Privacy Settings
  public_profile: z.boolean().default(true),
  show_contact_info: z.boolean().default(false),
  allow_bookings: z.boolean().default(true),
  require_approval: z.boolean().default(false),
})

const venueTypes = [
  'Concert Hall',
  'Club',
  'Bar',
  'Theater',
  'Festival Ground',
  'Warehouse',
  'Stadium',
  'Arena',
  'Intimate Venue',
  'Outdoor Space',
  'Recording Studio',
  'Rehearsal Space',
  'Other'
]

type VenueProfileFormData = z.infer<typeof venueProfileSchema>

export function EnhancedVenueSettings() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [venueProfile, setVenueProfile] = useState<any>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const form = useForm<VenueProfileFormData>({
    resolver: zodResolver(venueProfileSchema),
    defaultValues: {
      venue_name: '',
      description: '',
      capacity: 100,
      venue_types: [],
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      contact_email: '',
      contact_phone: '',
      booking_email: '',
      manager_name: '',
      website: '',
      instagram: '',
      facebook: '',
      twitter: '',
      stage_size: '',
      sound_system: '',
      lighting: '',
      curfew: '',
      age_restrictions: '',
      parking_spots: 0,
      green_room: false,
      loading_dock: false,
      wifi: true,
      accessibility: false,
      alcohol_license: false,
      food_service: false,
      accepting_bookings: true,
      min_booking_notice: '2_weeks',
      base_rate: '',
      public_profile: true,
      show_contact_info: false,
      allow_bookings: true,
      require_approval: false,
    }
  })

  useEffect(() => {
    if (user) {
      loadVenueProfile()
    }
  }, [user])

  const loadVenueProfile = async () => {
    try {
      setIsLoading(true)
      
      const { data: profile, error } = await supabase
        .from('venue_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading venue profile:', error)
        return
      }

      if (profile) {
        setVenueProfile(profile)
        setSelectedTypes(profile.venue_types || [])
        
        // Populate form with existing data
        form.reset({
          venue_name: profile.venue_name || '',
          description: profile.description || '',
          capacity: profile.capacity || 100,
          venue_types: profile.venue_types || [],
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || '',
          postal_code: profile.postal_code || '',
          contact_email: profile.contact_info?.email || '',
          contact_phone: profile.contact_info?.phone || '',
          booking_email: profile.contact_info?.booking_email || '',
          manager_name: profile.contact_info?.manager_name || '',
          website: profile.social_links?.website || '',
          instagram: profile.social_links?.instagram || '',
          facebook: profile.social_links?.facebook || '',
          twitter: profile.social_links?.twitter || '',
          stage_size: profile.technical_specs?.stage_size || '',
          sound_system: profile.technical_specs?.sound_system || '',
          lighting: profile.technical_specs?.lighting || '',
          curfew: profile.technical_specs?.curfew || '',
          age_restrictions: profile.technical_specs?.age_restrictions || '',
          parking_spots: profile.technical_specs?.parking_spots || 0,
          green_room: profile.amenities?.green_room || false,
          loading_dock: profile.amenities?.loading_dock || false,
          wifi: profile.amenities?.wifi ?? true,
          accessibility: profile.amenities?.accessibility || false,
          alcohol_license: profile.amenities?.alcohol_license || false,
          food_service: profile.amenities?.food_service || false,
          accepting_bookings: profile.settings?.allow_bookings ?? true,
          min_booking_notice: profile.settings?.min_booking_notice || '2_weeks',
          base_rate: profile.settings?.base_rate || '',
          public_profile: profile.settings?.public_profile ?? true,
          show_contact_info: profile.settings?.show_contact_info || false,
          allow_bookings: profile.settings?.allow_bookings ?? true,
          require_approval: profile.settings?.require_approval || false,
        })
      }
    } catch (error) {
      console.error('Error loading venue profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: VenueProfileFormData) => {
    try {
      setIsLoading(true)

      const profileData = {
        user_id: user?.id,
        venue_name: data.venue_name,
        url_slug: (data.venue_name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        description: data.description,
        capacity: data.capacity,
        venue_types: selectedTypes,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postal_code: data.postal_code,
        contact_info: {
          email: data.contact_email,
          phone: data.contact_phone,
          booking_email: data.booking_email,
          manager_name: data.manager_name,
        },
        social_links: {
          website: data.website,
          instagram: data.instagram,
          facebook: data.facebook,
          twitter: data.twitter,
        },
        technical_specs: {
          stage_size: data.stage_size,
          sound_system: data.sound_system,
          lighting: data.lighting,
          curfew: data.curfew,
          age_restrictions: data.age_restrictions,
          parking_spots: data.parking_spots,
        },
        amenities: {
          green_room: data.green_room,
          loading_dock: data.loading_dock,
          wifi: data.wifi,
          accessibility: data.accessibility,
          alcohol_license: data.alcohol_license,
          food_service: data.food_service,
        },
        settings: {
          public_profile: data.public_profile,
          show_contact_info: data.show_contact_info,
          allow_bookings: data.allow_bookings,
          require_approval: data.require_approval,
          min_booking_notice: data.min_booking_notice,
          base_rate: data.base_rate,
        },
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('venue_profiles')
        .upsert(profileData, { onConflict: 'user_id' })

      if (error) {
        console.error('Error saving venue profile:', error)
        toast.error('Failed to save profile')
        return
      }

      toast.success('Venue profile saved successfully!')
      await loadVenueProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVenueType = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
      
      form.setValue('venue_types', newTypes)
      return newTypes
    })
  }

  if (isLoading && !venueProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur border border-white/20 p-1 rounded-2xl">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="technical" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Technical
          </TabsTrigger>
          <TabsTrigger 
            value="booking" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Booking
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Venue Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="venue_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="The Music Hall" {...field} />
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
                          <FormLabel>Capacity *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="500" 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your venue, its atmosphere, and what makes it special..."
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Venue Types */}
                  <div className="space-y-3">
                    <Label>Venue Types *</Label>
                    <div className="flex flex-wrap gap-2">
                      {venueTypes.map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={selectedTypes.includes(type) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleVenueType(type)}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                    {selectedTypes.length === 0 && (
                      <p className="text-sm text-red-500">Please select at least one venue type</p>
                    )}
                  </div>

                  <Separator />

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Music Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="United States" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input placeholder="info@venue.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="booking_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Booking Email</FormLabel>
                            <FormControl>
                              <Input placeholder="bookings@venue.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="manager_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manager Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Social Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://venue.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@venuename" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="facebook"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="facebook.com/venue" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="twitter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Twitter/X</FormLabel>
                            <FormControl>
                              <Input placeholder="@venuename" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stage_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage Size</FormLabel>
                          <FormControl>
                            <Input placeholder="24' x 16' x 4' height" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parking_spots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parking Spots</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="25" 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="curfew"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Curfew</FormLabel>
                          <FormControl>
                            <Input placeholder="2:00 AM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age_restrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Restrictions</FormLabel>
                          <FormControl>
                            <Input placeholder="21+" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="sound_system"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sound System</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Meyer Sound with 32-channel Midas console..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lighting"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lighting System</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Full DMX system with moving heads and LED pars..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amenities */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="green_room"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Green Room</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="loading_dock"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Loading Dock</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="wifi"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Wi-Fi</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accessibility"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>ADA Accessible</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="alcohol_license"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Alcohol License</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="food_service"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Food Service</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="accepting_bookings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Accept Bookings</FormLabel>
                          <FormDescription>
                            Allow artists to request bookings
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="min_booking_notice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Booking Notice</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1_week">1 week</SelectItem>
                              <SelectItem value="2_weeks">2 weeks</SelectItem>
                              <SelectItem value="1_month">1 month</SelectItem>
                              <SelectItem value="2_months">2 months</SelectItem>
                              <SelectItem value="3_months">3+ months</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="base_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Rate</FormLabel>
                          <FormControl>
                            <Input placeholder="$500 - $2000" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your typical rental rate range
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="public_profile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Public Profile</FormLabel>
                          <FormDescription>
                            Make your venue discoverable by artists
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="show_contact_info"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Contact Information</FormLabel>
                          <FormDescription>
                            Display email and phone publicly
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="require_approval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Booking Approval</FormLabel>
                          <FormDescription>
                            Review all booking requests before confirming
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}