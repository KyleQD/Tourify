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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Music,
  User,
  Globe,
  MapPin,
  Camera,
  Save,
  Loader2,
  Plus,
  X,
  Star,
  Calendar,
  Mail,
  DollarSign,
  Clock,
  Settings,
  Palette
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

const artistProfileSchema = z.object({
  artist_name: z.string().min(1, 'Artist name is required').max(100),
  stage_name: z.string().max(100).optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  genres: z.array(z.string()).min(1, 'Select at least one genre'),
  location: z.string().max(100).optional(),
  label: z.string().max(100).optional(),
  manager: z.string().max(100).optional(),
  booking_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  
  // Social links
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  spotify: z.string().optional(),
  apple_music: z.string().optional(),
  youtube: z.string().optional(),
  soundcloud: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  
  // Professional settings
  availability_status: z.enum(['available', 'busy', 'unavailable']).default('available'),
  booking_rate: z.string().optional(),
  min_booking_notice: z.string().default('2_weeks'),
  travel_radius: z.string().optional(),
  
  // Privacy settings
  show_stats: z.boolean().default(true),
  show_contact_info: z.boolean().default(true),
  allow_messages: z.boolean().default(true),
  show_booking_info: z.boolean().default(true),
})

const musicSettingsSchema = z.object({
  default_genre: z.string().optional(),
  auto_tag_releases: z.boolean().default(true),
  allow_downloads: z.boolean().default(false),
  show_play_counts: z.boolean().default(true),
  enable_streaming: z.boolean().default(true),
  featured_track_id: z.string().optional(),
  content_warnings: z.boolean().default(false),
  explicit_content: z.boolean().default(false),
  auto_share_releases: z.boolean().default(true),
})

const musicGenres = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country',
  'Folk', 'Blues', 'Reggae', 'Punk', 'Metal', 'Indie', 'Alternative', 'Funk',
  'Soul', 'Gospel', 'World', 'Ambient', 'House', 'Techno', 'Dubstep', 'Other'
]

type ArtistProfileFormData = z.infer<typeof artistProfileSchema>
type MusicSettingsFormData = z.infer<typeof musicSettingsSchema>

export function EnhancedArtistSettings() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [artistProfile, setArtistProfile] = useState<any>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const profileForm = useForm<ArtistProfileFormData>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: {
      artist_name: '',
      stage_name: '',
      bio: '',
      genres: [],
      location: '',
      label: '',
      manager: '',
      booking_email: '',
      website: '',
      spotify: '',
      apple_music: '',
      youtube: '',
      soundcloud: '',
      instagram: '',
      twitter: '',
      facebook: '',
      tiktok: '',
      availability_status: 'available',
      booking_rate: '',
      min_booking_notice: '2_weeks',
      travel_radius: '',
      show_stats: true,
      show_contact_info: true,
      allow_messages: true,
      show_booking_info: true,
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
      featured_track_id: '',
      content_warnings: false,
      explicit_content: false,
      auto_share_releases: true,
    }
  })

  useEffect(() => {
    if (user) {
      loadArtistProfile()
    }
  }, [user])

  const loadArtistProfile = async () => {
    try {
      setIsLoading(true)
      
      const { data: profile, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading artist profile:', error)
        return
      }

      if (profile) {
        setArtistProfile(profile)
        setSelectedGenres(profile.genres || [])
        
        // Populate form with existing data
        profileForm.reset({
          artist_name: profile.artist_name || '',
          stage_name: profile.stage_name || '',
          bio: profile.bio || '',
          genres: profile.genres || [],
          location: profile.location || '',
          label: profile.label || '',
          manager: profile.manager || '',
          booking_email: profile.booking_email || '',
          website: profile.social_links?.website || '',
          spotify: profile.social_links?.spotify || '',
          apple_music: profile.social_links?.apple_music || '',
          youtube: profile.social_links?.youtube || '',
          soundcloud: profile.social_links?.soundcloud || '',
          instagram: profile.social_links?.instagram || '',
          twitter: profile.social_links?.twitter || '',
          facebook: profile.social_links?.facebook || '',
          tiktok: profile.social_links?.tiktok || '',
          availability_status: profile.availability_status || 'available',
          booking_rate: profile.booking_rate || '',
          min_booking_notice: profile.min_booking_notice || '2_weeks',
          travel_radius: profile.travel_radius || '',
          show_stats: profile.settings?.show_stats ?? true,
          show_contact_info: profile.settings?.show_contact_info ?? true,
          allow_messages: profile.settings?.allow_messages ?? true,
          show_booking_info: profile.settings?.show_booking_info ?? true,
        })
      }
    } catch (error) {
      console.error('Error loading artist profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: ArtistProfileFormData) => {
    try {
      setIsLoading(true)

      const profileData = {
        user_id: user?.id,
        artist_name: data.artist_name,
        stage_name: data.stage_name,
        bio: data.bio,
        genres: selectedGenres,
        location: data.location,
        label: data.label,
        manager: data.manager,
        booking_email: data.booking_email,
        availability_status: data.availability_status,
        booking_rate: data.booking_rate,
        min_booking_notice: data.min_booking_notice,
        travel_radius: data.travel_radius,
        social_links: {
          website: data.website,
          spotify: data.spotify,
          apple_music: data.apple_music,
          youtube: data.youtube,
          soundcloud: data.soundcloud,
          instagram: data.instagram,
          twitter: data.twitter,
          facebook: data.facebook,
          tiktok: data.tiktok,
        },
        settings: {
          show_stats: data.show_stats,
          show_contact_info: data.show_contact_info,
          allow_messages: data.allow_messages,
          show_booking_info: data.show_booking_info,
        },
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('artist_profiles')
        .upsert(profileData, { onConflict: 'user_id' })

      if (error) {
        console.error('Error saving artist profile:', error)
        toast.error('Failed to save profile')
        return
      }

      toast.success('Artist profile saved successfully!')
      await loadArtistProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitMusicSettings = async (data: MusicSettingsFormData) => {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from('artist_profiles')
        .update({
          music_settings: data,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error saving music settings:', error)
        toast.error('Failed to save music settings')
        return
      }

      toast.success('Music settings saved successfully!')
    } catch (error) {
      console.error('Error saving music settings:', error)
      toast.error('Failed to save music settings')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const newGenres = prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
      
      profileForm.setValue('genres', newGenres)
      return newGenres
    })
  }

  if (isLoading && !artistProfile) {
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
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="music" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Music className="h-4 w-4 mr-2" />
            Music
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
            <Settings className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Music className="h-5 w-5" />
                Artist Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="artist_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Artist Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your artist name" {...field} />
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
                          <FormLabel>Stage Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Different from artist name" {...field} />
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
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="City, State/Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Record Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Independent or label name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="manager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manager</FormLabel>
                          <FormControl>
                            <Input placeholder="Manager name or company" {...field} />
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
                          <FormLabel>Booking Email</FormLabel>
                          <FormControl>
                            <Input placeholder="bookings@example.com" {...field} />
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
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell your story as an artist..."
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Share your musical journey, influences, and what makes your music unique.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Genres */}
                  <div className="space-y-3">
                    <Label>Genres *</Label>
                    <div className="flex flex-wrap gap-2">
                      {musicGenres.map((genre) => (
                        <Button
                          key={genre}
                          type="button"
                          variant={selectedGenres.includes(genre) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre}
                        </Button>
                      ))}
                    </div>
                    {selectedGenres.length === 0 && (
                      <p className="text-sm text-red-500">Please select at least one genre</p>
                    )}
                  </div>

                  <Separator />

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Social Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yourwebsite.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="spotify"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spotify</FormLabel>
                            <FormControl>
                              <Input placeholder="Spotify artist URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="apple_music"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apple Music</FormLabel>
                            <FormControl>
                              <Input placeholder="Apple Music artist URL" {...field} />
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
                            <FormLabel>YouTube</FormLabel>
                            <FormControl>
                              <Input placeholder="YouTube channel URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} />
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
                            <FormLabel>Twitter/X</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} />
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

        <TabsContent value="music">
          <Card>
            <CardHeader>
              <CardTitle>Music Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...musicForm}>
                <form onSubmit={musicForm.handleSubmit(onSubmitMusicSettings)} className="space-y-6">
                  <FormField
                    control={musicForm.control}
                    name="default_genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Genre</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select default genre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {musicGenres.map((genre) => (
                              <SelectItem key={genre} value={genre.toLowerCase()}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={musicForm.control}
                      name="show_play_counts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Show Play Counts</FormLabel>
                            <FormDescription>
                              Display play counts on your tracks publicly
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
                      control={musicForm.control}
                      name="allow_downloads"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Allow Downloads</FormLabel>
                            <FormDescription>
                              Let fans download your tracks
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
                      control={musicForm.control}
                      name="auto_share_releases"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Share Releases</FormLabel>
                            <FormDescription>
                              Automatically share new releases on your social feeds
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

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Music Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle>Booking & Professional</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <div className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="availability_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available for bookings</SelectItem>
                            <SelectItem value="busy">Busy - Limited availability</SelectItem>
                            <SelectItem value="unavailable">Not available</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="booking_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Booking Rate</FormLabel>
                          <FormControl>
                            <Input placeholder="$1000 - $5000" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your typical booking fee range
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="travel_radius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Radius</FormLabel>
                          <FormControl>
                            <Input placeholder="500 miles / International" {...field} />
                          </FormControl>
                          <FormDescription>
                            How far you're willing to travel
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
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
              <Form {...profileForm}>
                <div className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="show_stats"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Statistics</FormLabel>
                          <FormDescription>
                            Display follower counts, stream numbers, etc.
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
                    control={profileForm.control}
                    name="show_contact_info"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Contact Information</FormLabel>
                          <FormDescription>
                            Display booking email and other contact details
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
                    control={profileForm.control}
                    name="allow_messages"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Messages</FormLabel>
                          <FormDescription>
                            Let fans and industry professionals message you
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
                    control={profileForm.control}
                    name="show_booking_info"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Booking Information</FormLabel>
                          <FormDescription>
                            Display availability status and booking rates
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