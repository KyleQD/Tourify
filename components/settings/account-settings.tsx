"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

const accountFormSchema = z.object({
  email: z.string().min(1, { message: "This field is required" }).email("This is not a valid email"),
  language: z.string({
    required_error: "Please select a language.",
  }),
  timezone: z.string({
    required_error: "Please select a timezone.",
  }),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface UserProfile {
  id: string
  metadata: {
    language?: string
    timezone?: string
  }
  created_at: string
  updated_at: string
}

export function AccountSettings() {
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEmailUpdateLoading, setIsEmailUpdateLoading] = useState(false)
  const supabase = createClientComponentClient()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      email: "",
      language: "en",
      timezone: "utc-8",
    },
  })

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        setIsFetching(true)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          toast({
            title: "Error",
            description: "Failed to load account data.",
            variant: "destructive",
          })
        } else if (profile) {
          setUserProfile(profile)
          
          // Update form with fetched data
          form.reset({
            email: user.email || "",
            language: profile.metadata?.language || "en",
            timezone: profile.metadata?.timezone || "utc-8",
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        toast({
          title: "Error",
          description: "Failed to load account data.",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false)
      }
    }

    if (user && !authLoading) {
      fetchProfile()
    }
  }, [user, authLoading, supabase, form])

  // Handle form submission
  async function onSubmit(data: AccountFormValues) {
    if (!user || !userProfile) return

    setIsLoading(true)

    try {
      // Update profile metadata
      const updatedMetadata = {
        ...userProfile.metadata,
        language: data.language,
        timezone: data.timezone,
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      // Update email if changed
      if (data.email !== user.email) {
        setIsEmailUpdateLoading(true)
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email
        })

        if (emailError) {
          throw emailError
        }

        toast({
          title: "Email update sent",
          description: "Check your email to confirm the email address change.",
        })
      }

      setUserProfile(prev => prev ? {
        ...prev,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      } : null)

      toast({
        title: "✅ Account Updated Successfully!",
        description: "Your account settings have been saved.",
        duration: 4000,
      })
    } catch (err: any) {
      console.error('Error updating account:', err)
      toast({
        title: "❌ Update Failed",
        description: err.message || "Failed to update account. Please try again.",
        variant: "destructive",
        duration: 6000,
      })
    } finally {
      setIsLoading(false)
      setIsEmailUpdateLoading(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user) return

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
    )

    if (!confirmed) return

    try {
      // In a real implementation, you'd want to have a proper deletion endpoint
      // that handles cleanup of all user data across tables
      const { error } = await supabase.auth.admin.deleteUser(user.id)

      if (error) {
        throw error
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      })

      // The user will be automatically signed out
    } catch (err: any) {
      console.error('Error deleting account:', err)
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      })
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
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Update your account details and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormDescription>
                      We'll use this email to contact you. Changing your email will require confirmation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="it">Italian</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>This is the language used in the interface.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="utc-12">UTC-12:00 (Baker Island)</SelectItem>
                          <SelectItem value="utc-11">UTC-11:00 (American Samoa)</SelectItem>
                          <SelectItem value="utc-10">UTC-10:00 (Hawaii)</SelectItem>
                          <SelectItem value="utc-9">UTC-09:00 (Alaska)</SelectItem>
                          <SelectItem value="utc-8">UTC-08:00 (Pacific)</SelectItem>
                          <SelectItem value="utc-7">UTC-07:00 (Mountain)</SelectItem>
                          <SelectItem value="utc-6">UTC-06:00 (Central)</SelectItem>
                          <SelectItem value="utc-5">UTC-05:00 (Eastern)</SelectItem>
                          <SelectItem value="utc-4">UTC-04:00 (Atlantic)</SelectItem>
                          <SelectItem value="utc-3">UTC-03:00 (Argentina)</SelectItem>
                          <SelectItem value="utc-2">UTC-02:00 (Mid-Atlantic)</SelectItem>
                          <SelectItem value="utc-1">UTC-01:00 (Azores)</SelectItem>
                          <SelectItem value="utc">UTC±00:00 (London)</SelectItem>
                          <SelectItem value="utc+1">UTC+01:00 (Central Europe)</SelectItem>
                          <SelectItem value="utc+2">UTC+02:00 (Eastern Europe)</SelectItem>
                          <SelectItem value="utc+3">UTC+03:00 (Moscow)</SelectItem>
                          <SelectItem value="utc+4">UTC+04:00 (Dubai)</SelectItem>
                          <SelectItem value="utc+5">UTC+05:00 (Pakistan)</SelectItem>
                          <SelectItem value="utc+6">UTC+06:00 (Bangladesh)</SelectItem>
                          <SelectItem value="utc+7">UTC+07:00 (Thailand)</SelectItem>
                          <SelectItem value="utc+8">UTC+08:00 (China)</SelectItem>
                          <SelectItem value="utc+9">UTC+09:00 (Japan)</SelectItem>
                          <SelectItem value="utc+10">UTC+10:00 (Australia East)</SelectItem>
                          <SelectItem value="utc+11">UTC+11:00 (Solomon Islands)</SelectItem>
                          <SelectItem value="utc+12">UTC+12:00 (New Zealand)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Your local timezone for accurate scheduling.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {isEmailUpdateLoading && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Email confirmation sent. Please check your email to confirm the change.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
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

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Information about your account status and membership.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Created</label>
              <p className="text-sm">
                {userProfile?.created_at 
                  ? formatSafeDate(userProfile.created_at)
                  : 'Unknown'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
              <p className="text-sm">
                {user?.email_confirmed_at ? (
                  <span className="text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-yellow-600">⚠ Pending verification</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account ID</label>
              <p className="text-sm font-mono text-muted-foreground">{user?.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Sign In</label>
              <p className="text-sm">
                {user?.last_sign_in_at 
                  ? formatSafeDate(user.last_sign_in_at)
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions. Please be certain before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Once you delete your account, there is no going back. This action cannot be undone and will permanently delete your account and all associated data.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="border-t border-destructive px-6 py-4">
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
