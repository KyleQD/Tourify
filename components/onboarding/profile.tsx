"use client"

import { supabase } from '@/lib/supabase'
import { useState } from "react"
import { Loader2, User, MapPin, Briefcase, Globe, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"

interface ProfileFormData {
  displayName: string
  bio: string
  location: string
  company: string
  website: string
  avatarUrl: string
  notificationPreferences: {
    email: boolean
    push: boolean
    marketing: boolean
  }
}

interface ProfileProps {
  userId: string
  onComplete: () => void
}

export function Profile({ userId, onComplete }: ProfileProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    bio: "",
    location: "",
    company: "",
    website: "",
    avatarUrl: "",
    notificationPreferences: {
      email: true,
      push: true,
      marketing: false
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (key: keyof ProfileFormData["notificationPreferences"]) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key]
      }
    }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsSubmitting(true)
      
      // Upload avatar to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${userId}-${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      setFormData(prev => ({ ...prev, avatarUrl: data.publicUrl }))
    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true)
      
      // Update profile in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: data.displayName,
          bio: data.bio,
          location: data.location,
          company: data.company,
          website: data.website,
          avatar_url: data.avatarUrl,
          notification_preferences: data.notificationPreferences,
          updated_at: new Date().toISOString()
        })
      
      if (profileError) throw profileError
      
      // Mark onboarding as completed
      const { error: onboardingError } = await supabase
        .from('onboarding')
        .upsert({
          user_id: userId,
          completed: true,
          completed_at: new Date().toISOString()
        })
      
      if (onboardingError) throw onboardingError
      
      // Call the onComplete callback
      onComplete()
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="bg-slate-900/70 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-200">Complete Your Profile</CardTitle>
          <CardDescription className="text-slate-400">
            Tell us a bit about yourself to get started with Tourify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24 border-2 border-slate-700">
                <AvatarImage src={formData.avatarUrl} />
                <AvatarFallback className="bg-slate-800 text-slate-400 text-xl">
                  {formData.displayName ? formData.displayName.charAt(0) : <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                  disabled={isSubmitting}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change Avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleAvatarUpload}
                  />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="personal" className="data-[state=active]:bg-slate-700">Personal Info</TabsTrigger>
                <TabsTrigger value="preferences" className="data-[state=active]:bg-slate-700">Preferences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-slate-300">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-slate-300">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-300">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="bg-slate-800/50 border-slate-700 text-slate-200 min-h-[100px]"
                    placeholder="Tell us about yourself"
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-300">Company</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
                        placeholder="Your company"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-slate-300">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-300">Email Notifications</Label>
                      <p className="text-sm text-slate-400">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={formData.notificationPreferences.email}
                      onCheckedChange={() => handleNotificationChange('email')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-300">Push Notifications</Label>
                      <p className="text-sm text-slate-400">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={formData.notificationPreferences.push}
                      onCheckedChange={() => handleNotificationChange('push')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-300">Marketing Emails</Label>
                      <p className="text-sm text-slate-400">Receive marketing and promotional emails</p>
                    </div>
                    <Switch
                      checked={formData.notificationPreferences.marketing}
                      onCheckedChange={() => handleNotificationChange('marketing')}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => handleSubmit(formData)}
                disabled={isSubmitting || !formData.displayName}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 