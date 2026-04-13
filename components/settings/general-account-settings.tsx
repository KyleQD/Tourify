"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { 
  User, 
  Globe, 
  Link, 
  MapPin, 
  Phone, 
  Mail,
  Instagram, 
  Twitter, 
  Camera,
  Save,
  Loader2,
  Bell,
  Shield,
  Palette,
  Monitor,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react'
import { ProfileSettingsOptimized } from './profile-settings-optimized'

interface GeneralAccountSettingsProps {
  activeTab: string
}

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  email: z.string().email('Must be a valid email').optional(),
  instagram: z.string().max(50).optional(),
  twitter: z.string().max(50).optional(),
})

const notificationSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  marketing_emails: z.boolean().default(false),
  new_followers: z.boolean().default(true),
  likes_comments: z.boolean().default(true),
  mentions: z.boolean().default(true),
  direct_messages: z.boolean().default(true),
})

const privacySchema = z.object({
  profile_visibility: z.enum(['public', 'private', 'friends']).default('public'),
  show_activity: z.boolean().default(true),
  show_followers: z.boolean().default(true),
  show_following: z.boolean().default(true),
  allow_messages: z.boolean().default(true),
  allow_friend_requests: z.boolean().default(true),
  show_email: z.boolean().default(false),
  show_phone: z.boolean().default(false),
  show_location: z.boolean().default(true),
})

const appearanceSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  accent_color: z.string().default('#8b5cf6'),
  compact_mode: z.boolean().default(false),
  show_animations: z.boolean().default(true),
  high_contrast: z.boolean().default(false),
})

type ProfileFormData = z.infer<typeof profileSchema>
type NotificationFormData = z.infer<typeof notificationSchema>
type PrivacyFormData = z.infer<typeof privacySchema>
type AppearanceFormData = z.infer<typeof appearanceSchema>

export function GeneralAccountSettings({ activeTab }: GeneralAccountSettingsProps) {
  const { currentAccount } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      username: '',
      bio: '',
      location: '',
      website: '',
      phone: '',
      email: '',
      instagram: '',
      twitter: '',
    }
  })

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      marketing_emails: false,
      new_followers: true,
      likes_comments: true,
      mentions: true,
      direct_messages: true,
    }
  })

  const privacyForm = useForm<PrivacyFormData>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      profile_visibility: 'public',
      show_activity: true,
      show_followers: true,
      show_following: true,
      allow_messages: true,
      allow_friend_requests: true,
      show_email: false,
      show_phone: false,
      show_location: true,
    }
  })

  const appearanceForm = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: 'system',
      accent_color: '#8b5cf6',
      compact_mode: false,
      show_animations: true,
      high_contrast: false,
    }
  })

  useEffect(() => {
    if (currentAccount) {
      loadProfile()
    }
  }, [currentAccount])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAccount?.profile_id)
        .single()

      if (error) throw error

      setProfile(data)
      
      // Update form defaults with loaded data
      profileForm.reset({
        full_name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || '',
        location: data.metadata?.location || '',
        website: data.metadata?.website || '',
        phone: data.metadata?.phone || '',
        email: data.email || '',
        instagram: data.metadata?.instagram || '',
        twitter: data.metadata?.twitter || '',
      })

      // Load notification preferences
      const notifications = data.account_settings?.notifications || {}
      notificationForm.reset({
        email_notifications: notifications.email_notifications ?? true,
        push_notifications: notifications.push_notifications ?? true,
        sms_notifications: notifications.sms_notifications ?? false,
        marketing_emails: notifications.marketing_emails ?? false,
        new_followers: notifications.new_followers ?? true,
        likes_comments: notifications.likes_comments ?? true,
        mentions: notifications.mentions ?? true,
        direct_messages: notifications.direct_messages ?? true,
      })

      // Load privacy preferences
      const privacy = data.account_settings?.privacy || {}
      privacyForm.reset({
        profile_visibility: privacy.profile_visibility || 'public',
        show_activity: privacy.show_activity ?? true,
        show_followers: privacy.show_followers ?? true,
        show_following: privacy.show_following ?? true,
        allow_messages: privacy.allow_messages ?? true,
        allow_friend_requests: privacy.allow_friend_requests ?? true,
        show_email: privacy.show_email ?? false,
        show_phone: privacy.show_phone ?? false,
        show_location: privacy.show_location ?? true,
      })

      // Load appearance preferences
      const appearance = data.account_settings?.appearance || {}
      appearanceForm.reset({
        theme: appearance.theme || 'system',
        accent_color: appearance.accent_color || '#8b5cf6',
        compact_mode: appearance.compact_mode ?? false,
        show_animations: appearance.show_animations ?? true,
        high_contrast: appearance.high_contrast ?? false,
      })

    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          username: data.username,
          bio: data.bio,
          metadata: {
            ...profile?.metadata,
            location: data.location,
            website: data.website,
            phone: data.phone,
            instagram: data.instagram,
            twitter: data.twitter,
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
      
      loadProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitNotifications = async (data: NotificationFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...profile?.account_settings,
            notifications: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Notification preferences updated'
      })
      
      loadProfile()
    } catch (error) {
      console.error('Error updating notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to update notifications',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitPrivacy = async (data: PrivacyFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...profile?.account_settings,
            privacy: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Privacy settings updated'
      })
      
      loadProfile()
    } catch (error) {
      console.error('Error updating privacy:', error)
      toast({
        title: 'Error',
        description: 'Failed to update privacy settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitAppearance = async (data: AppearanceFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...profile?.account_settings,
            appearance: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Appearance settings updated'
      })
      
      loadProfile()
    } catch (error) {
      console.error('Error updating appearance:', error)
      toast({
        title: 'Error',
        description: 'Failed to update appearance',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        // Use our optimized profile settings component
        return <ProfileSettingsOptimized />
      case 'notifications':
        return (
          <Form {...notificationForm}>
            <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Communication Preferences</h3>
                
                <div className="space-y-4">
                  <FormField
                    control={notificationForm.control}
                    name="email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Email Notifications</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Receive important updates via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="marketing_emails"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Marketing Emails</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Receive marketing and promotional emails
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
                  Save Preferences
                </Button>
              </div>
            </form>
          </Form>
        )
      case 'privacy':
        return (
          <Form {...privacyForm}>
            <form onSubmit={privacyForm.handleSubmit(onSubmitPrivacy)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Privacy Controls</h3>
                
                <FormField
                  control={privacyForm.control}
                  name="profile_visibility"
                  render={({ field }) => (
                    <FormItem className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <FormLabel className="text-gray-300">Profile Visibility</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can view</SelectItem>
                            <SelectItem value="private">Private - Only you can view</SelectItem>
                            <SelectItem value="friends">Friends - Only friends can view</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={privacyForm.control}
                    name="show_email"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Show Email</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Display your email address on your profile
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
                  Save Privacy Settings
                </Button>
              </div>
            </form>
          </Form>
        )
      case 'appearance':
        return (
          <Form {...appearanceForm}>
            <form onSubmit={appearanceForm.handleSubmit(onSubmitAppearance)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Appearance Settings</h3>
                
                <FormField
                  control={appearanceForm.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <FormLabel className="text-gray-300">Theme</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
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
                  Save Appearance
                </Button>
              </div>
            </form>
          </Form>
        )
      default:
        return <div className="text-gray-400">Settings content not found</div>
    }
  }

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  )
} 