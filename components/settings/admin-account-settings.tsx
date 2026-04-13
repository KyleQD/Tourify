"use client"

import React, { useState, useEffect } from 'react'
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
  Shield, 
  Settings, 
  User, 
  Bell,
  BarChart3,
  Crown,
  Zap,
  AlertTriangle,
  Users,
  Eye,
  Flag,
  Save,
  Loader2,
  Database,
  Server,
  Activity,
  Lock,
  UserCheck,
  FileText,
  MessageSquare
} from 'lucide-react'

interface AdminAccountSettingsProps {
  activeTab: string
}

const adminProfileSchema = z.object({
  admin_name: z.string().min(1, 'Admin name is required').max(100),
  department: z.string().optional(),
  role: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phone: z.string().max(20).optional(),
  emergency_contact: z.string().optional(),
})

const systemSettingsSchema = z.object({
  enable_debug_mode: z.boolean().default(false),
  log_level: z.string().default('info'),
  enable_analytics: z.boolean().default(true),
  cache_duration: z.string().default('1_hour'),
  max_file_size: z.string().default('10MB'),
  enable_maintenance_mode: z.boolean().default(false),
  api_rate_limit: z.string().default('1000'),
})

const moderationSettingsSchema = z.object({
  auto_moderate_content: z.boolean().default(true),
  content_filters: z.array(z.string()).default([]),
  flagged_content_action: z.string().default('review'),
  user_report_threshold: z.string().default('5'),
  auto_ban_repeat_offenders: z.boolean().default(false),
  content_review_queue: z.boolean().default(true),
  ai_moderation: z.boolean().default(true),
})

const notificationSettingsSchema = z.object({
  security_alerts: z.boolean().default(true),
  system_alerts: z.boolean().default(true),
  user_reports: z.boolean().default(true),
  content_flags: z.boolean().default(true),
  performance_alerts: z.boolean().default(true),
  backup_notifications: z.boolean().default(true),
  daily_summaries: z.boolean().default(true),
})

const logLevels = ['debug', 'info', 'warn', 'error']
const cacheDurations = ['15_minutes', '30_minutes', '1_hour', '2_hours', '6_hours', '12_hours', '24_hours']
const contentFilters = ['profanity', 'spam', 'harassment', 'explicit', 'violence', 'hate_speech']

type AdminProfileFormData = z.infer<typeof adminProfileSchema>
type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>
type ModerationSettingsFormData = z.infer<typeof moderationSettingsSchema>
type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>

export function AdminAccountSettings({ activeTab }: AdminAccountSettingsProps) {
  const { currentAccount } = useMultiAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [adminProfile, setAdminProfile] = useState<any>(null)

  const profileForm = useForm<AdminProfileFormData>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      admin_name: '',
      department: '',
      role: '',
      bio: '',
      phone: '',
      emergency_contact: '',
    }
  })

  const systemForm = useForm<SystemSettingsFormData>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      enable_debug_mode: false,
      log_level: 'info',
      enable_analytics: true,
      cache_duration: '1_hour',
      max_file_size: '10MB',
      enable_maintenance_mode: false,
      api_rate_limit: '1000',
    }
  })

  const moderationForm = useForm<ModerationSettingsFormData>({
    resolver: zodResolver(moderationSettingsSchema),
    defaultValues: {
      auto_moderate_content: true,
      content_filters: [],
      flagged_content_action: 'review',
      user_report_threshold: '5',
      auto_ban_repeat_offenders: false,
      content_review_queue: true,
      ai_moderation: true,
    }
  })

  const notificationForm = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      security_alerts: true,
      system_alerts: true,
      user_reports: true,
      content_flags: true,
      performance_alerts: true,
      backup_notifications: true,
      daily_summaries: true,
    }
  })

  useEffect(() => {
    if (currentAccount) {
      loadAdminProfile()
    }
  }, [currentAccount])

  const loadAdminProfile = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAccount?.profile_id)
        .single()

      if (error) throw error

      if (data) {
        setAdminProfile(data)
        
        // Update profile form
        profileForm.reset({
          admin_name: data.full_name || '',
          department: data.metadata?.department || '',
          role: data.metadata?.role || '',
          bio: data.bio || '',
          phone: data.metadata?.phone || '',
          emergency_contact: data.metadata?.emergency_contact || '',
        })

        // Update system settings
        const systemSettings = data.account_settings?.system || {}
        systemForm.reset({
          enable_debug_mode: systemSettings.enable_debug_mode ?? false,
          log_level: systemSettings.log_level || 'info',
          enable_analytics: systemSettings.enable_analytics ?? true,
          cache_duration: systemSettings.cache_duration || '1_hour',
          max_file_size: systemSettings.max_file_size || '10MB',
          enable_maintenance_mode: systemSettings.enable_maintenance_mode ?? false,
          api_rate_limit: systemSettings.api_rate_limit || '1000',
        })

        // Update moderation settings
        const moderationSettings = data.account_settings?.moderation || {}
        moderationForm.reset({
          auto_moderate_content: moderationSettings.auto_moderate_content ?? true,
          content_filters: moderationSettings.content_filters || [],
          flagged_content_action: moderationSettings.flagged_content_action || 'review',
          user_report_threshold: moderationSettings.user_report_threshold || '5',
          auto_ban_repeat_offenders: moderationSettings.auto_ban_repeat_offenders ?? false,
          content_review_queue: moderationSettings.content_review_queue ?? true,
          ai_moderation: moderationSettings.ai_moderation ?? true,
        })

        // Update notification settings
        const notificationSettings = data.account_settings?.admin_notifications || {}
        notificationForm.reset({
          security_alerts: notificationSettings.security_alerts ?? true,
          system_alerts: notificationSettings.system_alerts ?? true,
          user_reports: notificationSettings.user_reports ?? true,
          content_flags: notificationSettings.content_flags ?? true,
          performance_alerts: notificationSettings.performance_alerts ?? true,
          backup_notifications: notificationSettings.backup_notifications ?? true,
          daily_summaries: notificationSettings.daily_summaries ?? true,
        })
      }
    } catch (error) {
      console.error('Error loading admin profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load admin profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: AdminProfileFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.admin_name,
          bio: data.bio,
          metadata: {
            ...adminProfile?.metadata,
            department: data.department,
            role: data.role,
            phone: data.phone,
            emergency_contact: data.emergency_contact,
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Admin profile updated successfully'
      })
      
      loadAdminProfile()
    } catch (error) {
      console.error('Error updating admin profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update admin profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitSystem = async (data: SystemSettingsFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...adminProfile?.account_settings,
            system: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'System settings updated successfully'
      })
      
      loadAdminProfile()
    } catch (error) {
      console.error('Error updating system settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update system settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitModeration = async (data: ModerationSettingsFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...adminProfile?.account_settings,
            moderation: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Moderation settings updated successfully'
      })
      
      loadAdminProfile()
    } catch (error) {
      console.error('Error updating moderation settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update moderation settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitNotifications = async (data: NotificationSettingsFormData) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          account_settings: {
            ...adminProfile?.account_settings,
            admin_notifications: data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAccount?.profile_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Notification settings updated successfully'
      })
      
      loadAdminProfile()
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !adminProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Admin Profile Header */}
            <div className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/20">
                  <Shield className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {adminProfile?.full_name || 'Admin Profile'}
                  </h3>
                  <p className="text-gray-300">Manage your administrative account and permissions</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                      Admin Account
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Privileged
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="admin_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Admin Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Your admin name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Department</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="IT, Support, Operations"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={profileForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Role</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select admin role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Phone</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="+1 (555) 123-4567"
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
                      <FormLabel className="text-gray-300">Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Describe your role and responsibilities..."
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        {profileForm.watch('bio')?.length || 0}/500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Emergency Contact</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="Emergency contact information"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Admin Profile
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )

      case 'system':
        return (
          <Form {...systemForm}>
            <form onSubmit={systemForm.handleSubmit(onSubmitSystem)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-red-400" />
                  System Configuration
                </h3>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-yellow-300 text-sm">
                    These settings affect the entire platform. Changes should be made carefully and tested in a staging environment first.
                  </p>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={systemForm.control}
                    name="enable_debug_mode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Debug Mode</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Enable detailed logging and debugging features
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={systemForm.control}
                    name="enable_maintenance_mode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Maintenance Mode</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Put the platform in maintenance mode (users will see a maintenance page)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={systemForm.control}
                    name="enable_analytics"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Enable Analytics</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Collect platform analytics and usage statistics
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={systemForm.control}
                    name="log_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Log Level</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select log level" />
                            </SelectTrigger>
                            <SelectContent>
                              {logLevels.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level.charAt(0).toUpperCase() + level.slice(1)}
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
                    control={systemForm.control}
                    name="cache_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Cache Duration</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select cache duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {cacheDurations.map((duration) => (
                                <SelectItem key={duration} value={duration}>
                                  {duration.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={systemForm.control}
                    name="max_file_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Max File Size</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="10MB"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Maximum file upload size (e.g., 10MB, 50MB, 100MB)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="api_rate_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">API Rate Limit</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="1000"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Requests per hour per user
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save System Settings
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'moderation':
        return (
          <Form {...moderationForm}>
            <form onSubmit={moderationForm.handleSubmit(onSubmitModeration)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-400" />
                  Content Moderation
                </h3>
                
                <div className="space-y-4">
                  <FormField
                    control={moderationForm.control}
                    name="auto_moderate_content"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Auto-moderate Content</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Automatically review and filter content based on community guidelines
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={moderationForm.control}
                    name="ai_moderation"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">AI Moderation</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Use AI to assist with content moderation and flagging
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={moderationForm.control}
                    name="content_review_queue"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Content Review Queue</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Queue flagged content for manual review
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={moderationForm.control}
                    name="auto_ban_repeat_offenders"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Auto-ban Repeat Offenders</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Automatically ban users with multiple violations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={moderationForm.control}
                  name="content_filters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Content Filters</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {contentFilters.map((filter) => (
                            <div key={filter} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={filter}
                                checked={field.value.includes(filter)}
                                onChange={(e) => {
                                  const updatedFilters = e.target.checked
                                    ? [...field.value, filter]
                                    : field.value.filter((f) => f !== filter)
                                  field.onChange(updatedFilters)
                                }}
                                className="rounded border-white/20 bg-white/10"
                              />
                              <label htmlFor={filter} className="text-sm text-gray-300">
                                {filter.replace('_', ' ')}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={moderationForm.control}
                    name="flagged_content_action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Flagged Content Action</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="review">Send to Review Queue</SelectItem>
                              <SelectItem value="hide">Hide Immediately</SelectItem>
                              <SelectItem value="remove">Remove Immediately</SelectItem>
                              <SelectItem value="warn">Warn User</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={moderationForm.control}
                    name="user_report_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">User Report Threshold</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="5"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400 text-xs">
                          Number of reports before content is flagged
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Moderation Settings
                </Button>
              </div>
            </form>
          </Form>
        )

      case 'notifications':
        return (
          <Form {...notificationForm}>
            <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-400" />
                  Admin Notifications
                </h3>
                
                <div className="space-y-4">
                  <FormField
                    control={notificationForm.control}
                    name="security_alerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Security Alerts</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified about security incidents and suspicious activity
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
                    name="system_alerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">System Alerts</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified about system issues and downtime
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
                    name="user_reports"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">User Reports</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified when users report content or other users
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
                    name="content_flags"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Content Flags</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified when content is flagged for review
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
                    name="performance_alerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Performance Alerts</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified about performance issues and slow response times
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
                    name="backup_notifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Backup Notifications</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Get notified about backup status and failures
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
                    name="daily_summaries"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <FormLabel className="text-gray-300">Daily Summaries</FormLabel>
                          <FormDescription className="text-gray-400 text-sm">
                            Receive daily platform activity summaries
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
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Notification Settings
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