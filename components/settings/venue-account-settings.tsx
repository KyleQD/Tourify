"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { 
  Building, 
  MapPin, 
  Users, 
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  Globe,
  Phone,
  Mail,
  Save,
  Loader2,
  Shield,
  Bell,
  Settings,
  CheckCircle,
  Star,
  Wifi,
  Car,
  Camera,
  Music,
  Palette
} from 'lucide-react'

import { PostStylesSettingsPanel } from '@/components/settings/post-styles-settings-panel'

interface VenueAccountSettingsProps {
  activeTab: string
}

const venueProfileSchema = z.object({
  venue_name: z.string().min(1, 'Venue name is required').max(100),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  tagline: z.string().max(150, 'Tagline must be less than 150 characters').optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  coordinates: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  capacity_standing: z.number().min(1).optional(),
  capacity_seated: z.number().min(1).optional(),
  capacity_total: z.number().min(1, 'Total capacity must be at least 1').optional(),
  venue_types: z.array(z.string()).min(1, 'Select at least one venue type'),
  age_restrictions: z.string().optional(),
  operating_hours: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  }).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  linkedin: z.string().optional(),
})

const bookingPolicySchema = z.object({
  accept_bookings: z.boolean().default(true),
  min_advance_booking: z.string().default('2_weeks'),
  max_advance_booking: z.string().default('1_year'),
  auto_approve_bookings: z.boolean().default(false),
  require_deposit: z.boolean().default(false),
  deposit_percentage: z.number().min(0).max(100).optional(),
  cancellation_policy: z.string().optional(),
  house_rules: z.string().optional(),
  age_restriction: z.string().default('all_ages'),
})

const amenitiesSchema = z.object({
  // Audio/Visual
  sound_system: z.boolean().default(false),
  lighting_system: z.boolean().default(false),
  stage: z.boolean().default(false),
  recording_capabilities: z.boolean().default(false),
  live_streaming: z.boolean().default(false),
  projection_screen: z.boolean().default(false),
  dj_booth: z.boolean().default(false),
  
  // Facilities
  green_room: z.boolean().default(false),
  dressing_rooms: z.boolean().default(false),
  storage_space: z.boolean().default(false),
  load_in_dock: z.boolean().default(false),
  merchandise_space: z.boolean().default(false),
  office_space: z.boolean().default(false),
  
  // Services
  bar_service: z.boolean().default(false),
  food_service: z.boolean().default(false),
  catering_kitchen: z.boolean().default(false),
  security: z.boolean().default(false),
  coat_check: z.boolean().default(false),
  valet_parking: z.boolean().default(false),
  event_planning: z.boolean().default(false),
  photography_services: z.boolean().default(false),
  
  // Accessibility & Comfort
  accessible: z.boolean().default(false),
  elevator: z.boolean().default(false),
  air_conditioning: z.boolean().default(false),
  heating: z.boolean().default(false),
  outdoor_space: z.boolean().default(false),
  smoking_area: z.boolean().default(false),
  
  // Parking & Transportation
  parking: z.boolean().default(false),
  parking_spaces: z.number().optional(),
  valet_available: z.boolean().default(false),
  public_transport_nearby: z.boolean().default(false),
  uber_dropoff: z.boolean().default(false),
  
  // Technology
  wifi: z.boolean().default(false),
  high_speed_internet: z.boolean().default(false),
  power_outlets: z.boolean().default(false),
  charging_stations: z.boolean().default(false),
})

const technicalSpecsSchema = z.object({
  stage_dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  sound_system_details: z.string().optional(),
  lighting_details: z.string().optional(),
  power_specifications: z.string().optional(),
  internet_speed: z.string().optional(),
  load_in_details: z.string().optional(),
  acoustic_treatment: z.string().optional(),
  ceiling_height: z.number().optional(),
  noise_restrictions: z.string().optional(),
})

const operationalSchema = z.object({
  setup_time_required: z.string().optional(),
  breakdown_time_required: z.string().optional(),
  staff_provided: z.boolean().default(false),
  security_required: z.boolean().default(false),
  insurance_required: z.boolean().default(false),
  permits_required: z.boolean().default(false),
  union_venue: z.boolean().default(false),
  preferred_vendors: z.string().optional(),
  house_rules: z.string().optional(),
  noise_curfew: z.string().optional(),
  alcohol_policy: z.string().optional(),
})

const paymentSettingsSchema = z.object({
  base_rental_rate: z.string().optional(),
  hourly_rate: z.string().optional(),
  security_deposit: z.string().optional(),
  accepted_payment_methods: z.array(z.string()).default([]),
  payment_terms: z.string().default('50_50'),
  late_fee_percentage: z.number().min(0).max(100).optional(),
  currency: z.string().default('USD'),
})

const venueTypes = [
  'Concert Hall', 'Theater', 'Music Venue', 'Nightclub', 'Bar', 'Pub', 'Lounge',
  'Restaurant', 'Cafe', 'Art Gallery', 'Recording Studio', 'Rehearsal Studio',
  'Warehouse', 'Loft Space', 'Outdoor Venue', 'Festival Ground', 'Park',
  'Beach Venue', 'Rooftop', 'Terrace', 'Courtyard', 'Garden',
  'Church', 'Community Center', 'Convention Center', 'Hotel', 'Resort',
  'Private Residence', 'Mansion', 'Estate', 'Farm', 'Barn',
  'Sports Venue', 'Stadium', 'Arena', 'Gymnasium', 'Ballroom',
  'Conference Room', 'Corporate Space', 'Co-working Space', 'Pop-up Space',
  'Food Truck', 'Mobile Venue', 'Boat/Yacht', 'Historic Building', 'Museum',
  'Library', 'University', 'School', 'Other'
]

const paymentMethods = [
  'Cash', 'Check', 'Bank Transfer', 'Credit Card', 'PayPal', 'Venmo', 'Stripe'
]

type VenueProfileFormData = z.infer<typeof venueProfileSchema>
type BookingPolicyFormData = z.infer<typeof bookingPolicySchema>
type AmenitiesFormData = z.infer<typeof amenitiesSchema>
type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>

export function VenueAccountSettings({ activeTab }: VenueAccountSettingsProps) {
  const { currentAccount } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [venueProfile, setVenueProfile] = useState<any>(null)

  const profileForm = useForm<VenueProfileFormData>({
    resolver: zodResolver(venueProfileSchema),
    defaultValues: {
      venue_name: '',
      description: '',
      tagline: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      neighborhood: '',
      capacity_standing: undefined,
      capacity_seated: undefined,
      capacity_total: undefined,
      venue_types: [],
      age_restrictions: '',
      phone: '',
      email: '',
      website: '',
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      linkedin: '',
    }
  })

  const bookingForm = useForm<BookingPolicyFormData>({
    resolver: zodResolver(bookingPolicySchema),
    defaultValues: {
      accept_bookings: true,
      min_advance_booking: '2_weeks',
      max_advance_booking: '1_year',
      auto_approve_bookings: false,
      require_deposit: false,
      deposit_percentage: undefined,
      cancellation_policy: '',
      house_rules: '',
      age_restriction: 'all_ages',
    }
  })

  const amenitiesForm = useForm<AmenitiesFormData>({
    resolver: zodResolver(amenitiesSchema),
    defaultValues: {
      sound_system: false,
      lighting_system: false,
      stage: false,
      green_room: false,
      parking: false,
      wifi: false,
      bar_service: false,
      food_service: false,
      security: false,
      coat_check: false,
      accessible: false,
      air_conditioning: false,
    }
  })

  const paymentForm = useForm<PaymentSettingsFormData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      base_rental_rate: '',
      hourly_rate: '',
      security_deposit: '',
      accepted_payment_methods: [],
      payment_terms: '50_50',
      late_fee_percentage: undefined,
      currency: 'USD',
    }
  })

  useEffect(() => {
    if (currentAccount) {
      loadVenueProfile()
    }
  }, [currentAccount])

  const loadVenueProfile = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('venue_profiles')
        .select('*')
        .eq('user_id', currentAccount?.profile_data?.user_id || currentAccount?.profile_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setVenueProfile(data)
        
        // Update profile form
        profileForm.reset({
          venue_name: data.venue_name || '',
          description: data.description || '',
          tagline: data.tagline || '',
          address: data.address || '',
          city: data.contact_info?.city || '',
          state: data.contact_info?.state || '',
          country: data.contact_info?.country || '',
          postal_code: data.contact_info?.postal_code || '',
          neighborhood: data.neighborhood || '',
          capacity_standing: data.capacity_standing || undefined,
          capacity_seated: data.capacity_seated || undefined,
          capacity_total: data.capacity_total || data.capacity || undefined,
          venue_types: data.venue_types || [],
          age_restrictions: data.age_restrictions || '',
          phone: data.contact_info?.phone || '',
          email: data.contact_info?.email || '',
          website: data.social_links?.website || '',
          instagram: data.social_links?.instagram || '',
          facebook: data.social_links?.facebook || '',
          twitter: data.social_links?.twitter || '',
          tiktok: data.social_links?.tiktok || '',
          youtube: data.social_links?.youtube || '',
          linkedin: data.social_links?.linkedin || '',
        })

        // Update booking form
        const bookingSettings = data.settings?.booking || {}
        bookingForm.reset({
          accept_bookings: bookingSettings.accept_bookings ?? true,
          min_advance_booking: bookingSettings.min_advance_booking || '2_weeks',
          max_advance_booking: bookingSettings.max_advance_booking || '1_year',
          auto_approve_bookings: bookingSettings.auto_approve_bookings ?? false,
          require_deposit: bookingSettings.require_deposit ?? false,
          deposit_percentage: bookingSettings.deposit_percentage || undefined,
          cancellation_policy: bookingSettings.cancellation_policy || '',
          house_rules: bookingSettings.house_rules || '',
          age_restriction: bookingSettings.age_restriction || 'all_ages',
        })

        // Update amenities form
        const amenities = data.settings?.amenities || {}
        amenitiesForm.reset({
          sound_system: amenities.sound_system ?? false,
          lighting_system: amenities.lighting_system ?? false,
          stage: amenities.stage ?? false,
          green_room: amenities.green_room ?? false,
          parking: amenities.parking ?? false,
          wifi: amenities.wifi ?? false,
          bar_service: amenities.bar_service ?? false,
          food_service: amenities.food_service ?? false,
          security: amenities.security ?? false,
          coat_check: amenities.coat_check ?? false,
          accessible: amenities.accessible ?? false,
          air_conditioning: amenities.air_conditioning ?? false,
        })

        // Update payment form
        const paymentSettings = data.settings?.payment || {}
        paymentForm.reset({
          base_rental_rate: paymentSettings.base_rental_rate || '',
          hourly_rate: paymentSettings.hourly_rate || '',
          security_deposit: paymentSettings.security_deposit || '',
          accepted_payment_methods: paymentSettings.accepted_payment_methods || [],
          payment_terms: paymentSettings.payment_terms || '50_50',
          late_fee_percentage: paymentSettings.late_fee_percentage || undefined,
          currency: paymentSettings.currency || 'USD',
        })
      }
    } catch (error) {
      console.error('Error loading venue profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load venue profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: VenueProfileFormData) => {
    try {
      setIsLoading(true)
      const profileData = {
        venue_name: data.venue_name,
        description: data.description,
        tagline: data.tagline,
        address: data.address,
        neighborhood: data.neighborhood,
        capacity_standing: data.capacity_standing,
        capacity_seated: data.capacity_seated,
        capacity_total: data.capacity_total,
        venue_types: data.venue_types,
        age_restrictions: data.age_restrictions,
        contact_info: {
          phone: data.phone,
          email: data.email,
          city: data.city,
          state: data.state,
          country: data.country,
          postal_code: data.postal_code,
        },
        social_links: {
          website: data.website,
          instagram: data.instagram,
          facebook: data.facebook,
          twitter: data.twitter,
          tiktok: data.tiktok,
          youtube: data.youtube,
          linkedin: data.linkedin,
        },
        coordinates: data.coordinates,
        operating_hours: data.operating_hours,
        updated_at: new Date().toISOString()
      }

      if (venueProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('venue_profiles')
          .update(profileData)
          .eq('id', venueProfile.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from('venue_profiles')
          .insert({
            ...profileData,
            user_id: currentAccount?.profile_data?.user_id || currentAccount?.profile_id,
          })

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: 'Venue profile updated successfully'
      })
      
      loadVenueProfile()
    } catch (error) {
      console.error('Error updating venue profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update venue profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitBooking = async (data: BookingPolicyFormData) => {
    try {
      setIsLoading(true)
      
      const settings = {
        ...venueProfile?.settings,
        booking: data
      }

      const { error } = await supabase
        .from('venue_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', venueProfile?.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking policies updated successfully'
      })
      
      loadVenueProfile()
    } catch (error) {
      console.error('Error updating booking policies:', error)
      toast({
        title: 'Error',
        description: 'Failed to update booking policies',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitAmenities = async (data: AmenitiesFormData) => {
    try {
      setIsLoading(true)
      
      const settings = {
        ...venueProfile?.settings,
        amenities: data
      }

      const { error } = await supabase
        .from('venue_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', venueProfile?.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Amenities updated successfully'
      })
      
      loadVenueProfile()
    } catch (error) {
      console.error('Error updating amenities:', error)
      toast({
        title: 'Error',
        description: 'Failed to update amenities',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitPayments = async (data: PaymentSettingsFormData) => {
    try {
      setIsLoading(true)
      
      const settings = {
        ...venueProfile?.settings,
        payment: data
      }

      const { error } = await supabase
        .from('venue_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', venueProfile?.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Payment settings updated successfully'
      })
      
      loadVenueProfile()
    } catch (error) {
      console.error('Error updating payment settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update payment settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !venueProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Venue Profile Header */}
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Building className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {venueProfile?.venue_name || 'Venue Profile'}
                  </h3>
                  <p className="text-gray-300">Manage your venue information and public details</p>
                  <Badge className="mt-2 bg-green-500/20 text-green-300 border-green-500/30">
                    Venue Account
                  </Badge>
                </div>
              </div>
            </div>

            {/* Venue Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="venue_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Venue Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Your venue name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="capacity_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Total Capacity</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                              placeholder="100"
                            />
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Venue Tagline</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="A catchy tagline for your venue..."
                          maxLength={150}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        {profileForm.watch('tagline')?.length || 0}/150 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Venue Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Describe your venue, its atmosphere, what makes it special, notable features, and what guests can expect..."
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        {profileForm.watch('description')?.length || 0}/2000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="venue_types"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Venue Type *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value[0] || ''} 
                          onValueChange={(value) => field.onChange([value])}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select venue type" />
                          </SelectTrigger>
                          <SelectContent>
                            {venueTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-400" />
                    Location Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="123 Main Street"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Neighborhood/District</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="Downtown, Arts District, etc."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">City</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="New York"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">State/Province</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="NY"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">ZIP/Postal Code</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="10001"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Country</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="United States"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Capacity Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-400" />
                    Capacity Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="capacity_total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Total Capacity</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="500"
                              />
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="capacity_standing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Standing Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="300"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="capacity_seated"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Seated Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Age Restrictions */}
                <FormField
                  control={profileForm.control}
                  name="age_restrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Age Restrictions</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select age restrictions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_ages">All Ages</SelectItem>
                            <SelectItem value="18_plus">18+</SelectItem>
                            <SelectItem value="21_plus">21+</SelectItem>
                            <SelectItem value="varies">Varies by Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white">Address Information</h4>
                  
                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Street Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                              placeholder="123 Main Street"
                            />
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">City</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="New York"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">State/Province</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="NY"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Postal Code</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="10001"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white">Contact Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="+1 (555) 123-4567"
                              />
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                type="email"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="venue@example.com"
                              />
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Website</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                              placeholder="https://yourvenue.com"
                            />
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="bg-white/10" />

                {/* Social Media */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-400" />
                    Social Media & Online Presence
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Instagram</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="@venuename or instagram.com/venuename"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Facebook</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="facebook.com/venuename"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Twitter/X</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="@venuename"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="tiktok"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">TikTok</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="@venuename"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="youtube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">YouTube</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="youtube.com/c/venuename"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">LinkedIn</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="linkedin.com/company/venuename"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Venue Profile
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )

      case 'booking':
        return (
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit(onSubmitBooking)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Booking Policies</h3>
                
                <FormField
                  control={bookingForm.control}
                  name="accept_bookings"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <FormLabel className="text-gray-300">Accept Booking Requests</FormLabel>
                        <FormDescription className="text-gray-400 text-sm">
                          Allow artists and event organizers to send booking requests
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={bookingForm.control}
                    name="min_advance_booking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Minimum Advance Booking</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select minimum notice" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1_week">1 Week</SelectItem>
                              <SelectItem value="2_weeks">2 Weeks</SelectItem>
                              <SelectItem value="1_month">1 Month</SelectItem>
                              <SelectItem value="2_months">2 Months</SelectItem>
                              <SelectItem value="3_months">3 Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={bookingForm.control}
                    name="age_restriction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Age Restriction</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select age restriction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all_ages">All Ages</SelectItem>
                              <SelectItem value="18_plus">18+</SelectItem>
                              <SelectItem value="21_plus">21+</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={bookingForm.control}
                  name="auto_approve_bookings"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <FormLabel className="text-gray-300">Auto-approve Bookings</FormLabel>
                        <FormDescription className="text-gray-400 text-sm">
                          Automatically approve booking requests without manual review
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="require_deposit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <FormLabel className="text-gray-300">Require Deposit</FormLabel>
                        <FormDescription className="text-gray-400 text-sm">
                          Require a deposit payment to confirm bookings
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {bookingForm.watch('require_deposit') && (
                  <FormField
                    control={bookingForm.control}
                    name="deposit_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Deposit Percentage</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type="number"
                              min="0"
                              max="100"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-8"
                              placeholder="50"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={bookingForm.control}
                  name="cancellation_policy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Cancellation Policy</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Describe your cancellation policy..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="house_rules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">House Rules</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="List your venue rules and regulations..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Booking Policies
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'payments':
        return (
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPayments)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Payment Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={paymentForm.control}
                    name="base_rental_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Base Rental Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-8"
                              placeholder="500"
                            />
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Base rate for venue rental (per event)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={paymentForm.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Hourly Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-8"
                              placeholder="100"
                            />
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Hourly rate for extended events
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={paymentForm.control}
                  name="security_deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Security Deposit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-8"
                            placeholder="200"
                          />
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Refundable security deposit amount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={paymentForm.control}
                    name="payment_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Payment Terms</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_upfront">Full Payment Upfront</SelectItem>
                              <SelectItem value="50_50">50% Deposit, 50% Day of Event</SelectItem>
                              <SelectItem value="25_75">25% Deposit, 75% Day of Event</SelectItem>
                              <SelectItem value="payment_on_completion">Payment on Completion</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={paymentForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Currency</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="CAD">CAD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={paymentForm.control}
                  name="accepted_payment_methods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Accepted Payment Methods</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {paymentMethods.map((method) => (
                            <div key={method} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={method}
                                checked={field.value.includes(method)}
                                onChange={(e) => {
                                  const updatedMethods = e.target.checked
                                    ? [...field.value, method]
                                    : field.value.filter((m) => m !== method)
                                  field.onChange(updatedMethods)
                                }}
                                className="rounded border-white/20 bg-white/10"
                              />
                              <label htmlFor={method} className="text-sm text-gray-300">
                                {method}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Payment Settings
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'amenities':
        return (
          <Form {...amenitiesForm}>
            <form onSubmit={amenitiesForm.handleSubmit(onSubmitAmenities)} className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Venue Amenities & Features</h3>
                
                {/* Audio/Visual Equipment */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Music className="h-5 w-5 text-green-400" />
                    Audio/Visual Equipment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={amenitiesForm.control}
                      name="sound_system"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Sound System</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Professional sound system available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="lighting_system"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Lighting System</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Professional lighting available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Stage</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Dedicated performance stage
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="recording_capabilities"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Recording Capabilities</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Audio/video recording equipment
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="live_streaming"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Live Streaming</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Live streaming capabilities
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="projection_screen"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Projection Screen</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Large projection screen available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="dj_booth"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">DJ Booth</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Dedicated DJ booth/setup
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Facilities */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Building className="h-5 w-5 text-green-400" />
                    Facilities
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={amenitiesForm.control}
                      name="green_room"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Green Room</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Private artist preparation space
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="dressing_rooms"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Dressing Rooms</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Multiple dressing rooms available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="storage_space"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Storage Space</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Secure storage for equipment
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="load_in_dock"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Load-in Dock</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Easy equipment load-in access
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="merchandise_space"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Merchandise Space</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Dedicated merch table/booth
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="outdoor_space"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Outdoor Space</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Outdoor area or patio
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    Services
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={amenitiesForm.control}
                      name="bar_service"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Bar Service</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Full bar service available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="food_service"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Food Service</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Food service or catering
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="security"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Security</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Professional security staff
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="coat_check"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Coat Check</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Coat check service available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="event_planning"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Event Planning</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Event planning assistance
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="photography_services"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Photography Services</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Professional photography
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Accessibility & Comfort */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-400" />
                    Accessibility & Comfort
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={amenitiesForm.control}
                      name="accessible"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Wheelchair Accessible</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              ADA compliant accessibility
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="elevator"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Elevator</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Elevator access available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="air_conditioning"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Air Conditioning</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Climate controlled environment
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="heating"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Heating</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Heating system available
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Parking & Technology */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Car className="h-5 w-5 text-green-400" />
                    Parking & Technology
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={amenitiesForm.control}
                      name="parking"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Parking</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Parking available on-site
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="wifi"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">WiFi</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              WiFi internet access
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="high_speed_internet"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">High-Speed Internet</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Fast broadband connection
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="power_outlets"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Power Outlets</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Adequate power outlets
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={amenitiesForm.control}
                      name="charging_stations"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="space-y-1">
                            <FormLabel className="text-gray-300">Charging Stations</FormLabel>
                            <FormDescription className="text-gray-400 text-sm">
                              Device charging stations
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Parking Details */}
                {amenitiesForm.watch('parking') && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Parking Details</h4>
                    <FormField
                      control={amenitiesForm.control}
                      name="parking_spaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Number of Parking Spaces</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              placeholder="20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Amenities
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'appearance':
        return <PostStylesSettingsPanel />

      default:
        return <div className="text-gray-400">Settings content not found for {activeTab}</div>
    }
  }

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  )
} 