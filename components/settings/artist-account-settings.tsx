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
import { artistNotifications, profileNotifications } from '@/lib/utils/notifications'
import { 
  Music, 
  User, 
  Globe, 
  Calendar,
  DollarSign,
  Mic,
  Guitar,
  Headphones,
  Star,
  Save,
  Loader2,
  MapPin,
  Instagram,
  Youtube,
  Twitter,
  Bell,
  Lock,
  Palette,
  BarChart3
} from 'lucide-react'

interface ArtistAccountSettingsProps {
  activeTab: string
}

const artistProfileSchema = z.object({
  artist_name: z.string().min(1, 'Artist name is required').max(100),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  genres: z.array(z.string()).min(1, 'Select at least one genre'),
  location: z.string().max(100).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  spotify: z.string().optional(),
  apple_music: z.string().optional(),
  youtube: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  stage_name: z.string().optional(),
  record_label: z.string().optional(),
  booking_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
})

const musicSettingsSchema = z.object({
  default_genre: z.string().optional(),
  auto_tag_releases: z.boolean().default(true),
  allow_downloads: z.boolean().default(false),
  show_play_counts: z.boolean().default(true),
  enable_streaming: z.boolean().default(true),
  content_warnings: z.boolean().default(false),
  explicit_content: z.boolean().default(false),
})

const bookingSettingsSchema = z.object({
  accepting_bookings: z.boolean().default(true),
  min_booking_notice: z.string().default('2_weeks'),
  base_rate: z.string().optional(),
  travel_radius: z.string().optional(),
  equipment_provided: z.boolean().default(false),
  technical_rider: z.string().optional(),
  hospitality_rider: z.string().optional(),
  booking_terms: z.string().optional(),
})

const musicGenres = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country',
  'Folk', 'Blues', 'Reggae', 'Punk', 'Metal', 'Indie', 'Alternative', 'Funk',
  'Soul', 'Gospel', 'World', 'Ambient', 'House', 'Techno', 'Dubstep', 'Other'
]

type ArtistProfileFormData = z.infer<typeof artistProfileSchema>
type MusicSettingsFormData = z.infer<typeof musicSettingsSchema>
type BookingSettingsFormData = z.infer<typeof bookingSettingsSchema>

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const maybe = error as { message?: string; code?: string; details?: string; hint?: string }
    if (maybe.message)
      return [maybe.message, maybe.code && `(${maybe.code})`, maybe.details, maybe.hint]
        .filter(Boolean)
        .join(' ')
    try {
      return JSON.stringify(error)
    } catch {
      return 'Unknown error'
    }
  }
  return String(error)
}

export function ArtistAccountSettings({ activeTab }: ArtistAccountSettingsProps) {
  const { currentAccount } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [artistProfile, setArtistProfile] = useState<any>(null)

  async function resolveArtistUserId(): Promise<string | null> {
    const fromAccount = currentAccount?.profile_data?.user_id
    if (typeof fromAccount === 'string' && fromAccount.length > 0) return fromAccount

    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  }

  const profileForm = useForm<ArtistProfileFormData>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: {
      artist_name: '',
      bio: '',
      genres: [],
      location: '',
      website: '',
      spotify: '',
      apple_music: '',
      youtube: '',
      instagram: '',
      twitter: '',
      stage_name: '',
      record_label: '',
      booking_email: '',
    }
  })

  const musicForm = useForm<MusicSettingsFormData>({
    resolver: zodResolver(musicSettingsSchema),
    defaultValues: {
      default_genre: '',
      auto_tag_releases: true,
      allow_downloads: false,
      show_play_counts: true,
      enable_streaming: true,
      content_warnings: false,
      explicit_content: false,
    }
  })

  const bookingForm = useForm<BookingSettingsFormData>({
    resolver: zodResolver(bookingSettingsSchema),
    defaultValues: {
      accepting_bookings: true,
      min_booking_notice: '2_weeks',
      base_rate: '',
      travel_radius: '',
      equipment_provided: false,
      technical_rider: '',
      hospitality_rider: '',
      booking_terms: '',
    }
  })

  useEffect(() => {
    if (currentAccount) {
      loadArtistProfile()
    }
  }, [currentAccount])

  const loadArtistProfile = async () => {
    try {
      setIsLoading(true)
      const userId = await resolveArtistUserId()
      if (!userId) throw new Error('Unable to resolve artist user id')

      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setArtistProfile(data)

        const professional = data.settings?.professional || {}

        profileForm.reset({
          artist_name: data.artist_name || '',
          bio: data.bio || '',
          genres: data.genres || [],
          location: data.social_links?.location || professional.location || '',
          website: data.social_links?.website || '',
          spotify: data.social_links?.spotify || '',
          apple_music: data.social_links?.apple_music || '',
          youtube: data.social_links?.youtube || '',
          instagram: data.social_links?.instagram || '',
          twitter: data.social_links?.twitter || '',
          stage_name: professional.stage_name || '',
          record_label: professional.record_label || '',
          booking_email: professional.contact_email || '',
        })

        const musicSettings = data.settings?.music || {}
        musicForm.reset({
          default_genre: musicSettings.default_genre || '',
          auto_tag_releases: musicSettings.auto_tag_releases ?? true,
          allow_downloads: musicSettings.allow_downloads ?? false,
          show_play_counts: musicSettings.show_play_counts ?? true,
          enable_streaming: musicSettings.enable_streaming ?? true,
          content_warnings: musicSettings.content_warnings ?? false,
          explicit_content: musicSettings.explicit_content ?? false,
        })

        const bookingSettings = data.settings?.booking || {}
        bookingForm.reset({
          accepting_bookings: bookingSettings.accepting_bookings ?? true,
          min_booking_notice: bookingSettings.min_booking_notice || '2_weeks',
          base_rate: bookingSettings.base_rate || '',
          travel_radius: bookingSettings.travel_radius || '',
          equipment_provided: bookingSettings.equipment_provided ?? false,
          technical_rider: bookingSettings.technical_rider || '',
          hospitality_rider: bookingSettings.hospitality_rider || '',
          booking_terms: bookingSettings.booking_terms || '',
        })
      }
    } catch (error) {
      console.error('Error loading artist profile:', formatUnknownError(error), error)
      profileNotifications.loadingError()
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: ArtistProfileFormData) => {
    try {
      setIsLoading(true)

      profileNotifications.saveInProgress()

      const existingSettings =
        artistProfile?.settings && typeof artistProfile.settings === 'object'
          ? artistProfile.settings
          : {}
      const existingProfessional =
        existingSettings.professional && typeof existingSettings.professional === 'object'
          ? existingSettings.professional
          : {}

      const settings = {
        ...existingSettings,
        professional: {
          ...existingProfessional,
          location: data.location || '',
          stage_name: data.stage_name || '',
          record_label: data.record_label || '',
          contact_email: data.booking_email || '',
        },
      }

      const profileData = {
        artist_name: data.artist_name,
        bio: data.bio,
        genres: data.genres,
        social_links: {
          website: data.website,
          spotify: data.spotify,
          apple_music: data.apple_music,
          youtube: data.youtube,
          instagram: data.instagram,
          twitter: data.twitter,
          location: data.location,
        },
        settings,
        updated_at: new Date().toISOString(),
      }

      if (artistProfile) {
        const { error } = await supabase
          .from('artist_profiles')
          .update(profileData)
          .eq('id', artistProfile.id)

        if (error) throw error
      } else {
        const userId = await resolveArtistUserId()
        if (!userId) throw new Error('Unable to resolve artist user id for insert')

        const { error } = await supabase
          .from('artist_profiles')
          .insert({
            ...profileData,
            user_id: userId,
          })

        if (error) throw error
      }

      artistNotifications.profileUpdateSuccess()
      loadArtistProfile()
    } catch (error) {
      const message = formatUnknownError(error)
      console.error('Error updating artist profile:', message, error)

      if (message.toLowerCase().includes('network')) {
        profileNotifications.networkError()
      } else if (message.toLowerCase().includes('validation')) {
        profileNotifications.validationError('Profile', message)
      } else {
        profileNotifications.updateError(new Error(message), 'Failed to update artist profile')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitMusic = async (data: MusicSettingsFormData) => {
    try {
      setIsLoading(true)
      
      profileNotifications.saveInProgress()
      
      const settings = {
        ...artistProfile?.settings,
        music: data
      }

      const { error } = await supabase
        .from('artist_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', artistProfile?.id)

      if (error) throw error

      artistNotifications.musicSettingsUpdateSuccess()
      loadArtistProfile()
    } catch (error) {
      console.error('Error updating music settings:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          profileNotifications.networkError()
        } else {
          profileNotifications.updateError(error, 'Failed to update music settings')
        }
      } else {
        profileNotifications.updateError('Failed to update music settings')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitBooking = async (data: BookingSettingsFormData) => {
    try {
      setIsLoading(true)
      
      profileNotifications.saveInProgress()
      
      const settings = {
        ...artistProfile?.settings,
        booking: data
      }

      const { error } = await supabase
        .from('artist_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', artistProfile?.id)

      if (error) throw error

      artistNotifications.bookingSettingsUpdateSuccess()
      loadArtistProfile()
    } catch (error) {
      console.error('Error updating booking settings:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          profileNotifications.networkError()
        } else {
          profileNotifications.updateError(error, 'Failed to update booking settings')
        }
      } else {
        profileNotifications.updateError('Failed to update booking settings')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !artistProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Artist Profile Header */}
            <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Music className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {artistProfile?.artist_name || 'Artist Profile'}
                  </h3>
                  <p className="text-gray-300">Manage your artist identity and public information</p>
                  <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Artist Account
                  </Badge>
                </div>
              </div>
            </div>

            {/* Artist Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="artist_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Artist Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Your artist name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="stage_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Stage Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Alternative stage name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Artist Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Tell your story as an artist..."
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        {profileForm.watch('bio')?.length || 0}/1000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="genres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Genres *</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value[0] || ''} 
                            onValueChange={(value) => field.onChange([value])}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select primary genre" />
                            </SelectTrigger>
                            <SelectContent>
                              {musicGenres.map((genre) => (
                                <SelectItem key={genre} value={genre}>
                                  {genre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                              placeholder="City, Country"
                            />
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white">Social Links</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="spotify"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Spotify</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="Spotify artist URL"
                              />
                              <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
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
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="YouTube channel URL"
                              />
                              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Instagram</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="@username or URL"
                              />
                              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Twitter/X</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                                placeholder="@username or URL"
                              />
                              <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="record_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Record Label</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Record label name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="booking_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Booking Email</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="booking@example.com"
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
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Artist Profile
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )

      case 'music':
        return (
          <Form {...musicForm}>
            <form onSubmit={musicForm.handleSubmit(onSubmitMusic)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Music & Content Settings</h3>
                
                <FormField
                  control={musicForm.control}
                  name="default_genre"
                  render={({ field }) => (
                    <FormItem className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <FormLabel className="text-gray-300">Default Genre</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select default genre" />
                          </SelectTrigger>
                          <SelectContent>
                            {musicGenres.map((genre) => (
                              <SelectItem key={genre} value={genre}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription className="text-gray-400 text-sm">
                        This will be the default genre for new releases
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={musicForm.control}
                    name="enable_streaming"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Enable Streaming</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Allow users to stream your music on the platform
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={musicForm.control}
                    name="allow_downloads"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Allow Downloads</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Allow users to download your tracks
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={musicForm.control}
                    name="show_play_counts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Show Play Counts</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Display play counts publicly on your tracks
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={musicForm.control}
                    name="auto_tag_releases"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Auto-tag Releases</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Automatically tag releases with genre and metadata
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={musicForm.control}
                    name="explicit_content"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Explicit Content</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Mark this account as containing explicit content
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Music Settings
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'booking':
        return (
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit(onSubmitBooking)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Booking & Availability</h3>
                
                <FormField
                  control={bookingForm.control}
                  name="accepting_bookings"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <FormLabel className="text-gray-300">Accept Booking Requests</FormLabel>
                        <FormDescription className="text-gray-400 text-sm">
                          Allow venues and event organizers to send booking requests
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
                    name="min_booking_notice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Minimum Booking Notice</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select notice period" />
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
                    name="base_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Base Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-8"
                              placeholder="1000"
                            />
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Your standard performance fee (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={bookingForm.control}
                  name="travel_radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Travel Radius</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select travel radius" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local Only (0-50 miles)</SelectItem>
                            <SelectItem value="regional">Regional (50-200 miles)</SelectItem>
                            <SelectItem value="national">National (200+ miles)</SelectItem>
                            <SelectItem value="international">International</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="equipment_provided"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <FormLabel className="text-gray-300">Equipment Provided</FormLabel>
                        <FormDescription className="text-gray-400 text-sm">
                          You provide your own sound equipment and instruments
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
                  name="technical_rider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Technical Rider</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Specify your technical requirements (sound, lighting, stage setup, etc.)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="booking_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Booking Terms</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Additional terms and conditions for bookings"
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
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Booking Settings
                </Button>
              </div>
            </form>
          </Form>
        )

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