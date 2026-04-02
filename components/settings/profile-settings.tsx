"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useMediaUpload, extractFilePathFromUrl } from "@/lib/utils/media-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Upload, X } from "lucide-react"
import { profileNotifications } from "@/lib/utils/notifications"

const profileFormSchema = z.object({
  full_name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must not be longer than 50 characters.",
    }),
  username: z
    .string()
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(30, {
      message: "Username must not be longer than 30 characters.",
    })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores.",
    }),
  bio: z
    .string()
    .max(500, {
      message: "Bio must not be longer than 500 characters.",
    })
    .optional(),
  phone: z
    .string()
    .max(20, {
      message: "Phone number must not be longer than 20 characters.",
    })
    .optional(),
  location: z
    .string()
    .max(100, {
      message: "Location must not be longer than 100 characters.",
    })
    .optional(),
  website: z
    .string()
    .url({
      message: "Please enter a valid URL.",
    })
    .optional()
    .or(z.literal("")),
  instagram: z
    .string()
    .max(50, {
      message: "Instagram handle must not be longer than 50 characters.",
    })
    .optional(),
  twitter: z
    .string()
    .max(50, {
      message: "Twitter handle must not be longer than 50 characters.",
    })
    .optional(),
  showEmail: z.boolean().default(true),
  showPhone: z.boolean().default(false),
  showLocation: z.boolean().default(true),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface UserProfile {
  id: string
  metadata: {
    full_name?: string
    username?: string
    bio?: string
    phone?: string
    location?: string
    website?: string
    instagram?: string
    twitter?: string
    show_email?: boolean
    show_phone?: boolean
    show_location?: boolean
  }
  avatar_url?: string
  created_at: string
  updated_at: string
}

export function ProfileSettings() {
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const supabase = createClientComponentClient()
  const { uploadFile, deleteFile } = useMediaUpload()



  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: "",
      username: "",
      bio: "",
      phone: "",
      location: "",
      website: "",
      instagram: "",
      twitter: "",
      showEmail: true,
      showPhone: false,
      showLocation: true,
    },
  })

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        setIsFetching(true)
        const response = await fetch('/api/profile/current')
        if (!response.ok) {
          throw new Error('Failed to load profile data')
        }
        
        const { profile } = await response.json()
        if (profile) {
          setUserProfile(profile)
          
          // Update form with fetched data
          form.reset({
            full_name: profile.profile_data?.name || profile.full_name || "",
            username: profile.username || "",
            bio: profile.bio || "",
            phone: profile.profile_data?.phone || "",
            location: profile.profile_data?.location || "",
            website: profile.social_links?.website || "",
            instagram: profile.social_links?.instagram || "",
            twitter: profile.social_links?.twitter || "",
            showEmail: profile.metadata?.show_email ?? true,
            showPhone: profile.metadata?.show_phone ?? false,
            showLocation: profile.metadata?.show_location ?? true,
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        profileNotifications.loadingError()
      } finally {
        setIsFetching(false)
      }
    }

    if (user && !authLoading) {
      fetchProfile()
    }
  }, [user, authLoading, form])

  // Handle form submission
  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
      profileNotifications.updateError("You must be logged in to update your profile.")
      return
    }

    setIsLoading(true)
    console.log('Form data being submitted:', data)
    
    // Show saving progress
    profileNotifications.saveInProgress()

    try {
      const response = await fetch('/api/profile/update-optimized', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log('API response:', result)

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.message || 'Failed to update profile'
        console.error('Update failed:', errorMessage)
        
        // Handle specific error cases
        if (result.field === 'username') {
          profileNotifications.validationError('Username', errorMessage)
        } else if (result.field === 'custom_url') {
          profileNotifications.validationError('Custom URL', errorMessage)
        } else {
          throw new Error(errorMessage)
        }
        return
      }

      // Update local state with the returned data
      if (result.profile) {
        setUserProfile(result.profile)
      }
      
      // Update last saved timestamp and reset form dirty state
      setLastSaved(new Date())
      form.reset(form.getValues()) // Reset dirty state while keeping current values
      
      profileNotifications.updateSuccess(result.message || "Your profile information has been saved and synced to the database.")
    } catch (err) {
      console.error('Error updating profile:', err)
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          profileNotifications.networkError()
        } else {
          profileNotifications.updateError(err)
        }
      } else {
        profileNotifications.updateError("Failed to update profile. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setAvatarUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload avatar')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        avatar_url: result.url,
      } : null)

      profileNotifications.avatarUploadSuccess()
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      const errorMessage = error?.message || 'Failed to upload avatar'
      
      profileNotifications.avatarUploadError(errorMessage)
    } finally {
      setAvatarUploading(false)
    }
  }

  // Handle avatar removal
  const handleAvatarRemove = async () => {
    if (!user || !userProfile?.avatar_url) return

    setAvatarUploading(true)

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Removal failed')
      }

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        avatar_url: undefined,
      } : null)

      profileNotifications.customSuccess("Avatar Removed", "Your profile picture has been removed.")
    } catch (error: any) {
      console.error('Error removing avatar:', error)
      const errorMessage = error?.message || 'Failed to remove avatar'
      
      profileNotifications.customError("Removal Failed", errorMessage)
    } finally {
      setAvatarUploading(false)
    }
  }

  if (authLoading || isFetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile information and control what others can see.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Avatar Section */}
          <div className="mb-6 flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={userProfile?.avatar_url} alt="Profile" />
              <AvatarFallback className="text-lg">
                {userProfile?.metadata?.full_name?.charAt(0)?.toUpperCase() || 
                 userProfile?.metadata?.username?.charAt(0)?.toUpperCase() || 
                 user?.email?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Profile Picture</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={avatarUploading} asChild>
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Change
                  </label>
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                {userProfile?.avatar_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAvatarRemove}
                    disabled={avatarUploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                JPG, GIF or PNG. Max size of 10MB.
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Your username" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your unique identifier on the platform.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Write a short bio about yourself. This will be visible on your profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Your location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="@yourusername" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter/X</FormLabel>
                    <FormControl>
                      <Input placeholder="@yourusername" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Privacy Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Privacy Settings</h3>
                <FormField
                  control={form.control}
                  name="showEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Show Email Address</FormLabel>
                        <FormDescription>Allow others to see your email address on your profile.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Show Phone Number</FormLabel>
                        <FormDescription>Allow others to see your phone number on your profile.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showLocation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Show Location</FormLabel>
                        <FormDescription>Allow others to see your location on your profile.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {form.formState.isDirty && !isLoading && (
                    <span className="text-orange-600">● Unsaved changes</span>
                  )}
                  {lastSaved && !form.formState.isDirty && (
                    <span className="text-green-600">✓ Last saved: {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastSaved)}</span>
                  )}
                </div>
                <Button type="submit" disabled={isLoading || !form.formState.isDirty} className="min-w-[120px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
