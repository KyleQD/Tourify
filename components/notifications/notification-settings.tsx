"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail, Smartphone, Clock, Settings, Save } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

const notificationSettingsSchema = z.object({
  // Channel preferences
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  
  // Type-specific preferences
  preferences: z.object({
    like: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    comment: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    follow: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    message: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    event_invite: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    booking_request: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    system_alert: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    achievement_unlocked: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    badge_granted: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    endorsement_received: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    })
  }),
  
  // Digest settings
  digestFrequency: z.enum(['never', 'hourly', 'daily', 'weekly']),
  
  // Quiet hours
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string()
})

type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>

const notificationTypes = [
  {
    key: 'like',
    label: 'Likes',
    description: 'When someone likes your content',
    icon: '❤️'
  },
  {
    key: 'comment',
    label: 'Comments',
    description: 'When someone comments on your content',
    icon: '💬'
  },
  {
    key: 'follow',
    label: 'New Followers',
    description: 'When someone starts following you',
    icon: '👤'
  },
  {
    key: 'message',
    label: 'Messages',
    description: 'New direct messages and message requests',
    icon: '✉️'
  },
  {
    key: 'event_invite',
    label: 'Event Invitations',
    description: 'Invitations to events and performances',
    icon: '📅'
  },
  {
    key: 'booking_request',
    label: 'Booking Requests',
    description: 'New booking and performance requests',
    icon: '🎵'
  },
  {
    key: 'system_alert',
    label: 'System Alerts',
    description: 'Important system notifications and updates',
    icon: '⚠️'
  },
  {
    key: 'achievement_unlocked',
    label: 'Achievements',
    description: 'When you unlock achievements and milestones',
    icon: '🏆'
  },
  {
    key: 'badge_granted',
    label: 'Badges',
    description: 'When someone awards you a badge',
    icon: '🎖️'
  },
  {
    key: 'endorsement_received',
    label: 'Endorsements',
    description: 'When someone endorses your skills',
    icon: '👍'
  }
]

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00:00`, label: `${hour}:00` }
})

export function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      preferences: {
        like: { email: true, push: true, sms: false },
        comment: { email: true, push: true, sms: false },
        follow: { email: true, push: true, sms: false },
        message: { email: true, push: true, sms: true },
        event_invite: { email: true, push: true, sms: true },
        booking_request: { email: true, push: true, sms: true },
        system_alert: { email: true, push: false, sms: false },
        achievement_unlocked: { email: false, push: true, sms: false },
        badge_granted: { email: true, push: true, sms: false },
        endorsement_received: { email: true, push: true, sms: false }
      },
      digestFrequency: 'daily',
      quietHoursEnabled: false,
      quietHoursStart: '22:00:00',
      quietHoursEnd: '08:00:00'
    }
  })

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error)
          return
        }

        if (data) {
          const defaults = form.getValues().preferences
          form.reset({
            emailEnabled: data.email_enabled,
            pushEnabled: data.push_enabled,
            smsEnabled: data.sms_enabled,
            inAppEnabled: data.in_app_enabled,
            preferences: { ...defaults, ...(data.preferences || {}) },
            digestFrequency: data.digest_frequency,
            quietHoursEnabled: data.quiet_hours_enabled,
            quietHoursStart: data.quiet_hours_start,
            quietHoursEnd: data.quiet_hours_end
          })
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error)
        toast.error('Failed to load notification preferences')
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [form])

  // Save preferences
  const onSubmit = async (data: NotificationSettingsForm) => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('You must be logged in to save preferences')
        return
      }

      const recognitionEnabled =
        data.preferences.achievement_unlocked.push ||
        data.preferences.badge_granted.push ||
        data.preferences.endorsement_received.push

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: session.user.id,
          email_enabled: data.emailEnabled,
          push_enabled: data.pushEnabled,
          sms_enabled: data.smsEnabled,
          in_app_enabled: data.inAppEnabled,
          enable_achievements: recognitionEnabled,
          preferences: data.preferences,
          digest_frequency: data.digestFrequency,
          quiet_hours_enabled: data.quietHoursEnabled,
          quiet_hours_start: data.quietHoursStart,
          quiet_hours_end: data.quietHoursEnd,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      toast.success('Notification preferences saved successfully')
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Notification Settings</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Channel Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inAppEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">In-App Notifications</FormLabel>
                        <FormDescription>
                          Show notifications within the app
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
                  name="emailEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Notifications
                        </FormLabel>
                        <FormDescription>
                          Send notifications via email
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
                  name="pushEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Push Notifications</FormLabel>
                        <FormDescription>
                          Send push notifications to your device
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
                  name="smsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          SMS Notifications
                        </FormLabel>
                        <FormDescription>
                          Send notifications via text message
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
            </CardContent>
          </Card>

          {/* Type-Specific Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Customize which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationTypes.map((type) => (
                <div key={type.key} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium">{type.label}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-11">
                    <FormField
                      control={form.control}
                      name={`preferences.${type.key}.email` as any}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              Email
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch('emailEnabled')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`preferences.${type.key}.push` as any}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Push</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch('pushEnabled')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`preferences.${type.key}.sms` as any}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm flex items-center gap-2">
                              <Smartphone className="h-3 w-3" />
                              SMS
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch('smsEnabled')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {type.key !== notificationTypes[notificationTypes.length - 1].key && (
                    <Separator />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Digest Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Digest Settings</CardTitle>
              <CardDescription>
                Choose how often you want to receive notification summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="digestFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Digest Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Receive a summary of your notifications at the selected frequency
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Set times when you don't want to receive non-urgent notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="quietHoursEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Quiet Hours</FormLabel>
                      <FormDescription>
                        Pause non-urgent notifications during specified hours
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

              {form.watch('quietHoursEnabled') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quietHoursStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quietHoursEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 