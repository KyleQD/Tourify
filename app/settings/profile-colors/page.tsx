"use client"

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from "react"
import { ProfileColorCustomizer } from "@/components/profile/profile-color-customizer"
import { useProfileColors } from "@/hooks/use-profile-colors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Palette, Eye, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export default function ProfileColorsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const {
    colors,
    loading: colorsLoading,
    saveColors,
    updateColors,
    resetColors,
    getBackgroundGradient,
    getColorClasses,
    getAnimationClasses,
    getGlowClasses
  } = useProfileColors(currentUser?.id || "")

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        })
        return
      }

      setCurrentUser(profile)
    } catch (error) {
      console.error('Error loading user:', error)
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleColorsChange = async (newColors: any) => {
    const success = await saveColors(newColors)
    if (success) {
      toast({
        title: "Success",
        description: "Profile colors updated successfully!",
      })
    }
  }

  const handlePreview = (previewColors: any) => {
    updateColors(previewColors)
  }

  if (loading || colorsLoading) {
    return (
      <div className={`min-h-screen ${getBackgroundGradient()} flex items-center justify-center`}>
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen ${getBackgroundGradient()} flex items-center justify-center`}>
        <div className="text-white text-lg">User not found</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${getBackgroundGradient()}`}>
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-white/30 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-white">Profile Colors</h1>
            <p className="text-white/70">Customize your profile's visual appearance</p>
          </div>
        </div>

        {/* Preview Card */}
        <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" style={{ color: colors.accent_color }} />
              Live Preview
            </CardTitle>
            <CardDescription className="text-white/70">
              See how your color changes will look on your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-xl" style={{ 
              background: `linear-gradient(135deg, ${colors.primary_color}20 0%, ${colors.secondary_color}20 100%)`,
              border: `1px solid ${colors.primary_color}30`
            }}>
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: colors.primary_color }}
                >
                  {currentUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{currentUser.username}</h3>
                  <p className="text-sm" style={{ color: colors.accent_color }}>
                    {currentUser.account_type === 'artist' ? 'Artist' : 
                     currentUser.account_type === 'venue' ? 'Venue' : 'Professional'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.primary_color + '20' }}>
                  <div className="text-sm font-medium" style={{ color: colors.primary_color }}>Primary</div>
                  <div className="text-xs text-white/70">{colors.primary_color}</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.secondary_color + '20' }}>
                  <div className="text-sm font-medium" style={{ color: colors.secondary_color }}>Secondary</div>
                  <div className="text-xs text-white/70">{colors.secondary_color}</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.accent_color + '20' }}>
                  <div className="text-sm font-medium" style={{ color: colors.accent_color }}>Accent</div>
                  <div className="text-xs text-white/70">{colors.accent_color}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Customizer */}
        <ProfileColorCustomizer
          profileId={currentUser.id}
          currentColors={colors}
          onColorsChange={handleColorsChange}
          onPreview={handlePreview}
        />
      </div>
    </div>
  )
} 