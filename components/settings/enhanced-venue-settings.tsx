"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from '@/lib/supabase/client'
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
import { Progress } from "@/components/ui/progress"
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
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { computeVenueCompletion } from "@/lib/venue/completion"
import {
  EMPTY_OPERATIONAL_POLICIES,
  VENUE_AMENITY_GROUPS,
  VENUE_TYPE_TAXONOMY,
  amenitiesFromLegacyObject,
  legacyObjectFromAmenities,
  normalizeVenueTypeLabels,
  operationalPoliciesSchema,
  parseOperationalPolicies,
  readCanonicalLocation,
  reconcileAmenities,
} from "@/lib/venue/settings-shapes"

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
  
  // Technical Specs — persisted to canonical top-level columns (VEN-244)
  stage_size: z.string().optional(),
  sound_system: z.string().optional(),
  lighting: z.string().optional(),
  curfew: z.string().optional(),
  operational_policies: operationalPoliciesSchema.default(EMPTY_OPERATIONAL_POLICIES),
  age_restrictions: z.string().optional(),
  parking_spots: z.number().optional(),

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

// VEN-248: one canonical taxonomy shared by every venue-type editor.
const venueTypes = VENUE_TYPE_TAXONOMY

type VenueProfileFormData = z.infer<typeof venueProfileSchema>

export function EnhancedVenueSettings() {
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [venueProfile, setVenueProfile] = useState<any>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  // VEN-247: canonical amenity selection is a normalized key array.
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  // VEN-015: deterministic readiness score drives the editor checklist.
  const completion = useMemo(() => computeVenueCompletion(venueProfile), [venueProfile])
  const missingItems = completion.checklist.filter((c) => !c.done)

  // VEN-256/257: lifecycle state (archive + ownership transfer).
  const [pendingTransfer, setPendingTransfer] = useState<{
    id: string
    to_user_id: string
    created_at: string
    expires_at: string
  } | null>(null)
  const [confirmName, setConfirmName] = useState("")
  const [transferTarget, setTransferTarget] = useState("")
  const [lifecycleBusy, setLifecycleBusy] = useState(false)

  const loadLifecycleState = async () => {
    if (!venueProfile?.id) return
    const fromTransfers = supabase.from as unknown as (
      table: "venue_ownership_transfers",
    ) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          eq: (
            column: string,
            value: string,
          ) => PromiseLike<{ data: typeof pendingTransfer[] | null }>
        }
      }
    }
    // Table ships with the lifecycle migration; typed client may lag behind.
    const { data } = await fromTransfers("venue_ownership_transfers")
      .select("id,to_user_id,created_at,expires_at")
      .eq("venue_profile_id", venueProfile.id)
      .eq("status", "pending")
    setPendingTransfer(data?.[0] ?? null)
  }

  useEffect(() => {
    void loadLifecycleState()
  }, [venueProfile?.id])

  // Lifecycle RPCs ship with migration 20260823120000; the generated client
  // doesn't know them yet, so invoke through a loose typed shim.
  const lifecycleRpc = supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>

  const runLifecycle = async (fn: () => Promise<unknown>) => {
    setLifecycleBusy(true)
    try {
      await fn()
    } finally {
      setLifecycleBusy(false)
    }
  }

  const handleArchive = () =>
    runLifecycle(async () => {
      const { error } = await lifecycleRpc("archive_venue_profile", {
        p_venue_id: venueProfile.id,
        p_confirm_name: confirmName.trim(),
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Venue archived. It is now hidden everywhere public; restore anytime.")
      setConfirmName("")
      await loadVenueProfile()
    })

  const handleUnarchive = () =>
    runLifecycle(async () => {
      const { error } = await lifecycleRpc("unarchive_venue_profile", {
        p_venue_id: venueProfile.id,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Venue restored — republish when you're ready.")
      await loadVenueProfile()
    })

  const handleRequestTransfer = () =>
    runLifecycle(async () => {
      const target = transferTarget.trim()
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)) {
        toast.error("Enter the recipient's account ID (a GUID copied from their profile).")
        return
      }
      const { error } = await lifecycleRpc("request_venue_ownership_transfer", {
        p_venue_id: venueProfile.id,
        p_to_user_id: target,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success(
        "Transfer requested. The recipient has 7 days to accept; you can cancel until then.",
      )
      setTransferTarget("")
      await loadLifecycleState()
    })

  const handleCancelTransfer = () =>
    runLifecycle(async () => {
      const { error } = await lifecycleRpc("cancel_venue_ownership_transfer", {
        p_venue_id: venueProfile.id,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Pending transfer cancelled.")
      await loadLifecycleState()
    })

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
      operational_policies: EMPTY_OPERATIONAL_POLICIES,
      age_restrictions: '',
      parking_spots: 0,
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
    if (user || currentAccount) {
      loadVenueProfile()
    }
  }, [user, currentAccount?.profile_id])

  const loadVenueProfile = async () => {
    try {
      setIsLoading(true)

      // Resolve the acting venue from the canonical active account context;
      // owner user_id lookup is only the fallback for legacy personal sessions.
      const activeVenueId =
        currentAccount?.account_type === 'venue' && currentAccount?.profile_id
          ? currentAccount.profile_id
          : null

      const baseQuery = supabase.from('venue_profiles').select('*')
      const { data: profile, error } = activeVenueId
        ? await baseQuery.eq('id', activeVenueId).maybeSingle()
        : await baseQuery.eq('user_id', user?.id).single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading venue profile:', error)
        return
      }

      if (profile) {
        setVenueProfile(profile)
        // VEN-248: normalize stored taxonomy to the canonical set (dedupe,
        // case-insensitive match); unknown legacy labels are preserved as-is.
        setSelectedTypes(normalizeVenueTypeLabels(profile.venue_types))
        // VEN-247: reconcile the canonical TEXT[] with the legacy settings
        // cache so both representations agree during the migration window.
        setSelectedAmenities(reconcileAmenities(profile.amenities, profile.settings?.amenities))

        const location = readCanonicalLocation(profile)
        const policies = parseOperationalPolicies(profile.settings?.operational_policies)
        const settings = profile.settings || {}

        // Populate form with existing data
        form.reset({
          venue_name: profile.venue_name || '',
          description: profile.description || '',
          capacity: profile.capacity_total || profile.capacity || 100,
          venue_types: normalizeVenueTypeLabels(profile.venue_types),
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          postal_code: location.postal_code,
          contact_email: profile.contact_info?.email || '',
          contact_phone: profile.contact_info?.phone || '',
          booking_email: profile.contact_info?.booking_email || '',
          manager_name: profile.contact_info?.manager_name || '',
          website: profile.social_links?.website || '',
          instagram: profile.social_links?.instagram || '',
          facebook: profile.social_links?.facebook || '',
          twitter: profile.social_links?.twitter || '',
          // VEN-244: canonical top-level technical-spec columns
          stage_size: profile.stage_dimensions || '',
          sound_system: profile.sound_system || '',
          lighting: profile.lighting_rig || '',
          curfew: profile.curfew || '',
          age_restrictions: profile.age_restrictions || '',
          parking_spots: profile.parking_spots || 0,
          operational_policies: policies,
          accepting_bookings: settings.allow_bookings ?? true,
          min_booking_notice: settings.min_booking_notice || '2_weeks',
          base_rate: settings.base_rate || '',
          public_profile: profile.is_public ?? settings.public_profile ?? true,
          show_contact_info: settings.show_contact_info || false,
          allow_bookings: settings.allow_bookings ?? true,
          require_approval: settings.require_approval || false,
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

      const amenitiesArray = Array.from(new Set(selectedAmenities))

      // VEN-015: persist the deterministic score so it is never stale-zero.
      const completionScore = computeVenueCompletion({
        ...venueProfile,
        venue_name: data.venue_name,
        url_slug: venueProfile?.url_slug ?? (data.venue_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        description: data.description,
        city: data.city,
        state: data.state,
        country: data.country,
        capacity: data.capacity,
        capacity_total: data.capacity,
        avatar_url: venueProfile?.avatar_url,
        cover_image_url: venueProfile?.cover_image_url,
        venue_types: normalizeVenueTypeLabels(selectedTypes),
        amenities: amenitiesArray,
        stage_dimensions: data.stage_size,
        sound_system: data.sound_system,
        lighting_rig: data.lighting,
        social_links: {
          website: data.website,
          instagram: data.instagram,
          facebook: data.facebook,
          twitter: data.twitter,
        },
        settings: {
          booking_email: data.booking_email,
          base_rate: data.base_rate,
          operational_policies: data.operational_policies,
        },
      }).score

      // VEN-247: canonical TEXT[] + dual-written legacy cache so older readers
      // stay truthful during the migration window.
      const profileData: Record<string, unknown> = {
        venue_name: data.venue_name,
        description: data.description,
        capacity: data.capacity,
        capacity_total: data.capacity,
        venue_types: normalizeVenueTypeLabels(selectedTypes),
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
        // VEN-244: technical specs persist to canonical top-level columns
        // (the public contract projects these fields directly).
        stage_dimensions: data.stage_size || null,
        sound_system: data.sound_system || null,
        lighting_rig: data.lighting || null,
        curfew: data.curfew || null,
        age_restrictions: data.age_restrictions || null,
        parking_spots: data.parking_spots || 0,
        amenities: amenitiesArray,
        // VEN-245: operational policies persist in the defined schema under
        // settings.operational_policies. Existing settings keys (booking,
        // payment, …) are preserved, never wiped.
        settings: {
          ...(venueProfile?.settings ?? {}),
          amenities: legacyObjectFromAmenities(amenitiesArray),
          operational_policies: operationalPoliciesSchema.parse(data.operational_policies),
          public_profile: data.public_profile,
          show_contact_info: data.show_contact_info,
          allow_bookings: data.allow_bookings,
          require_approval: data.require_approval,
          min_booking_notice: data.min_booking_notice,
          base_rate: data.base_rate,
        },
        // VEN-008: is_public is the canonical publish control; settings cache
        // mirrors it (DB trigger enforces alignment too).
        is_public: data.public_profile,
        profile_completion: completionScore,
        updated_at: new Date().toISOString()
      }

      // Only seed a slug when none exists yet — stored slugs own the public
      // URL and redirect history; renames must never silently rewrite them.
      if (!venueProfile?.url_slug) {
        profileData.url_slug = (data.venue_name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      let error
      if (venueProfile?.id) {
        ;({ error } = await supabase
          .from('venue_profiles')
          .update(profileData)
          .eq('id', venueProfile.id))
      } else {
        ;({ error } = await supabase
          .from('venue_profiles')
          .insert({ ...profileData, user_id: user?.id }))
      }

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

  // VEN-247: canonical amenity toggles drive one normalized key array.
  const toggleAmenity = (key: string) => {
    setSelectedAmenities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
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
          {/* VEN-015: deterministic completion checklist — reflects real
              persisted fields, never fabricated. */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Listing readiness</CardTitle>
                <span
                  className={`text-sm font-semibold ${completion.isReady ? "text-green-500" : "text-amber-500"}`}
                  aria-live="polite"
                >
                  {completion.score}% complete{completion.isReady ? " · ready to publish" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={completion.score} aria-label="Listing completeness" />
              {missingItems.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {missingItems.map((item) => (
                    <li key={item.key}>• {item.label}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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

                  {/* VEN-245: Operational Policies */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-medium">Operational Policies</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="operational_policies.setup_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Load-in / Setup window</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 4 hours before doors" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.breakdown_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Breakdown / Load-out window</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 2 hours after show" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.permits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permits held</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Place of assembly, liquor" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.outside_vendors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Outside vendors</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Allowed with approval" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.alcohol_policy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alcohol policy</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. House bars only" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.security"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Security requirements</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Licensed security for 150+ guests" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operational_policies.union_rules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Union rules</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. IATSE crew required" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="operational_policies.insurance_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Certificate of insurance required</FormLabel>
                            <FormDescription>Promoters must provide COI before load-in.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                          </FormControl>
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

                  {/* VEN-247: canonical amenity editor — one representation
                      (venue_profiles.amenities TEXT[]) drives the editor, the
                      public profile and search filters. */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Amenities</h3>
                    {VENUE_AMENITY_GROUPS.map((group) => (
                      <div key={group.category} className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">{group.category}</p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {group.items.map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex cursor-pointer flex-row items-center space-x-3 space-y-0 rounded-lg border p-3"
                            >
                              <Switch
                                checked={selectedAmenities.includes(key)}
                                onCheckedChange={() => toggleAmenity(key)}
                              />
                              <span className="text-sm leading-none">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
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
                          <FormLabel className="text-base">List in public directory</FormLabel>
                          <FormDescription>
                            Publish this venue in the Tourify directory (/venues) so organizers
                            and artists can discover and book it. Unpublishing hides it everywhere
                            public instantly.
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

                  {/* VEN-256/257/259: server-verified lifecycle actions with
                      typed confirmation + audit trail (written inside the
                      RPCs). Public identity never changes here. */}
                  <Separator />
                  <div className="space-y-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <div>
                      <p className="text-base font-semibold text-red-400">Danger zone</p>
                      <p className="text-sm text-muted-foreground">
                        {venueProfile?.archived_at
                          ? `Archived ${new Date(venueProfile.archived_at).toLocaleDateString()} — hidden everywhere public.`
                          : "Archiving hides this venue publicly while keeping all data recoverable."}
                      </p>
                    </div>

                    {!venueProfile?.archived_at ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={confirmName}
                          onChange={(e) => setConfirmName(e.target.value)}
                          placeholder={`Type "${venueProfile?.venue_name ?? "venue name"}" to confirm`}
                          aria-label="Type venue name to confirm archiving"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={lifecycleBusy || confirmName.trim() !== venueProfile?.venue_name}
                          onClick={handleArchive}
                        >
                          Archive venue
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" disabled={lifecycleBusy} onClick={handleUnarchive}>
                        Restore venue
                      </Button>
                    )}
                  </div>

                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <p className="text-base font-semibold">Transfer ownership</p>
                      <p className="text-sm text-muted-foreground">
                        Hand this venue to another Tourify account. The recipient must accept
                        within 7 days; your access becomes Venue Manager after acceptance and the
                        public page (name, slug, reviews) is unchanged.
                      </p>
                    </div>

                    {pendingTransfer ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                        <p>
                          Pending since{" "}
                          {new Date(pendingTransfer.created_at).toLocaleDateString()} — expires{" "}
                          {new Date(pendingTransfer.expires_at).toLocaleDateString()}.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          disabled={lifecycleBusy}
                          onClick={handleCancelTransfer}
                        >
                          Cancel transfer request
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={transferTarget}
                          onChange={(e) => setTransferTarget(e.target.value)}
                          placeholder="Recipient account ID (GUID from their profile)"
                          aria-label="Recipient account ID"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={lifecycleBusy || !transferTarget.trim()}
                          onClick={handleRequestTransfer}
                        >
                          Request transfer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}