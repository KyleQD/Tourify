"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import {
  User,
  Building2,
  Music,
  Settings,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  Zap
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useAppearanceSettings } from "@/hooks/use-appearance-settings"
import { EnhancedArtistSettings } from "./enhanced-artist-settings"
import { EnhancedVenueSettings } from "./enhanced-venue-settings"
import { EnhancedGeneralSettings } from "./enhanced-general-settings"
import { ColorPicker } from "@/components/ui/color-picker"
import { ImageUpload } from "@/components/ui/image-upload"
import { SkillsSettings } from "./skills-settings"
import { PortfolioSettings } from "./portfolio-settings"
import { ExperienceSettings } from "./experience-settings"
import { CertificationsSettings } from "./certifications-settings"
import { AboutSettings } from "./about-settings"
import { ResetEducationButton } from "@/components/product-education/reset-education-button"

interface AccountInfo {
  id: string
  account_type: 'general' | 'artist' | 'venue' | 'admin'
  username: string
  full_name?: string
  profile_data?: any
  settings?: any
}

export function EnhancedSettingsRouter() {
  const { user } = useAuth()
  const router = useRouter()
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)
  
  // Use the appearance settings hook
  const { settings: appearanceSettings, updateSetting, updateProfileColor, updateProfileImage, saveSettings, applyTheme } = useAppearanceSettings()

  useEffect(() => {
    if (user) {
      loadAccountInfo()
    }
  }, [user])

  const loadAccountInfo = async () => {
    try {
      setLoading(true)
      
      // First, get the user's profile to determine account type
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        toast.error('Failed to load account information')
        return
      }

      // Determine account type and load specific profile data
      let accountType = profile.account_type || 'general'
      let profileData = null

      if (accountType === 'artist') {
        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single()
        profileData = artistProfile
      } else if (accountType === 'venue') {
        const { data: venueProfile } = await supabase
          .from('venue_profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single()
        profileData = venueProfile
      }

      setAccountInfo({
        id: user?.id || '',
        account_type: accountType,
        username: profile.username || '',
        full_name: profile.full_name,
        profile_data: profileData,
        settings: profile.settings || {}
      })

    } catch (error) {
      console.error('Error loading account info:', error)
      toast.error('Failed to load account information')
    } finally {
      setLoading(false)
    }
  }



  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'artist': return <Music className="h-5 w-5" />
      case 'venue': return <Building2 className="h-5 w-5" />
      case 'admin': return <Shield className="h-5 w-5" />
      default: return <User className="h-5 w-5" />
    }
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'artist': return 'Artist Account'
      case 'venue': return 'Venue Account'
      case 'admin': return 'Admin Account'
      default: return 'General Account'
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'artist': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'venue': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const themeOptions = [
    { id: 'emerald', name: 'Emerald', gradient: 'from-emerald-900 to-slate-900', colors: { primary: '#10b981', secondary: '#059669', accent: '#34d399' } },
    { id: 'ocean', name: 'Ocean', gradient: 'from-blue-900 to-slate-900', colors: { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' } },
    { id: 'royal', name: 'Royal', gradient: 'from-purple-900 to-slate-900', colors: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' } },
    { id: 'sunset', name: 'Sunset', gradient: 'from-rose-900 to-slate-900', colors: { primary: '#f43f5e', secondary: '#e11d48', accent: '#fb7185' } }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!accountInfo) {
    return (
      <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-white mb-2">Account Not Found</h3>
            <p className="text-gray-400 mb-4">
              We couldn't load your account information. Please try refreshing the page.
            </p>
            <Button onClick={loadAccountInfo} className="bg-purple-600 hover:bg-purple-700">
              <Loader2 className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-white/10">
                {getAccountTypeIcon(accountInfo.account_type)}
              </div>
              <div>
                <CardTitle className="text-white text-2xl">
                  {accountInfo.full_name || accountInfo.username}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getAccountTypeColor(accountInfo.account_type)}>
                    {getAccountTypeIcon(accountInfo.account_type)}
                    {getAccountTypeLabel(accountInfo.account_type)}
                  </Badge>
                  <span className="text-white/60">@{accountInfo.username}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">Account ID</p>
              <p className="text-white font-mono text-sm">{accountInfo.id.slice(0, 8)}...</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/10 backdrop-blur border border-white/20 p-1 rounded-2xl">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
          <TabsTrigger 
            value="skills" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Skills
          </TabsTrigger>
          <TabsTrigger 
            value="portfolio" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger 
            value="experience" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Experience
          </TabsTrigger>
          <TabsTrigger 
            value="certs" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Certifications
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger 
            value="appearance" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Account Type Specific Settings */}
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {getAccountTypeLabel(accountInfo.account_type)} Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accountInfo.account_type === 'artist' && (
                <EnhancedArtistSettings />
              )}
              {accountInfo.account_type === 'venue' && (
                <EnhancedVenueSettings />
              )}
              {accountInfo.account_type === 'general' && (
                <EnhancedGeneralSettings />
              )}
              {accountInfo.account_type === 'admin' && (
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-red-400" />
                  <h3 className="text-xl font-semibold text-white mb-2">Admin Settings</h3>
                  <p className="text-gray-400">
                    Admin settings are managed through a separate interface.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <SkillsSettings />
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <AboutSettings />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <PortfolioSettings />
        </TabsContent>

        <TabsContent value="experience" className="space-y-6">
          <ExperienceSettings />
        </TabsContent>

        <TabsContent value="certs" className="space-y-6">
          <CertificationsSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Notification Settings</h3>
                <p className="text-gray-400">
                  Configure your notification preferences here.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white">Privacy & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Privacy Settings</h3>
                <p className="text-gray-400">
                  Manage your privacy and security settings.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white">Guides and tours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-400">
                Clear dismissed tips, help favorites, recent articles, and the venue spotlight tour on this browser.
              </p>
              <ResetEducationButton />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-white font-semibold text-xl">Theme Selection</h3>
                      <p className="text-white/70 text-sm">
                        Choose your preferred theme and color scheme
                      </p>
                    </div>
                    <Button 
                      onClick={() => router.push('/settings/profile-colors')}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-6 py-2 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      Advanced Colors
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {themeOptions.map((theme) => {
                      const isSelected = appearanceSettings.selectedTheme === theme.id
                      const isCustomized = !isSelected && (
                        appearanceSettings.profileColors.primary !== theme.colors.primary ||
                        appearanceSettings.profileColors.secondary !== theme.colors.secondary ||
                        appearanceSettings.profileColors.accent !== theme.colors.accent
                      )
                      
                      return (
                        <div
                          key={theme.id}
                          className={`text-center p-6 rounded-2xl border cursor-pointer transition-all duration-200 relative group hover:scale-105 ${
                            isSelected
                              ? 'bg-white/15 border-purple-500/50 shadow-lg shadow-purple-500/20'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                          onClick={() => applyTheme(theme.id)}
                        >
                          <div className={`w-16 h-10 rounded-xl mx-auto mb-3 bg-gradient-to-br ${theme.gradient} shadow-lg`}></div>
                          <div className="text-sm font-semibold text-white">{theme.name}</div>
                          {isCustomized && (
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 shadow-lg"></div>
                          )}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Color Customization */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-white font-semibold text-xl">Custom Colors</h3>
                      <p className="text-white/70 text-sm">
                        Customize your profile colors with any colors you want
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyTheme('emerald')}
                      className="border-white/30 text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all duration-200"
                    >
                      Reset to Default
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    <ColorPicker
                      value={appearanceSettings.profileColors.primary}
                      onChange={(color) => updateProfileColor('primary', color)}
                      label="Primary Color"
                      className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm"
                    />
                    
                    <ColorPicker
                      value={appearanceSettings.profileColors.secondary}
                      onChange={(color) => updateProfileColor('secondary', color)}
                      label="Secondary Color"
                      className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm"
                    />
                    
                    <ColorPicker
                      value={appearanceSettings.profileColors.accent}
                      onChange={(color) => updateProfileColor('accent', color)}
                      label="Accent Color"
                      className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm"
                    />
                  </div>
                </div>

                {/* Current Profile Colors Preview */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <h3 className="text-white font-semibold text-xl mb-6">Color Preview</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div 
                        className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-lg" 
                        style={{ backgroundColor: appearanceSettings.profileColors.primary }}
                      ></div>
                      <div className="text-sm font-semibold text-white">Primary</div>
                      <div className="text-xs text-white/60 font-mono">{appearanceSettings.profileColors.primary}</div>
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div 
                        className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-lg" 
                        style={{ backgroundColor: appearanceSettings.profileColors.secondary }}
                      ></div>
                      <div className="text-sm font-semibold text-white">Secondary</div>
                      <div className="text-xs text-white/60 font-mono">{appearanceSettings.profileColors.secondary}</div>
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div 
                        className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-lg" 
                        style={{ backgroundColor: appearanceSettings.profileColors.accent }}
                      ></div>
                      <div className="text-sm font-semibold text-white">Accent</div>
                      <div className="text-xs text-white/60 font-mono">{appearanceSettings.profileColors.accent}</div>
                    </div>
                  </div>
                </div>

                {/* Profile Images */}
                <div className="space-y-6">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-white font-semibold text-xl">Profile Images</h3>
                        <p className="text-white/70 text-sm">
                          Upload your profile picture and header photo
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/setup-storage', { method: 'POST' })
                            const result = await response.json()
                            if (result.success) {
                              toast.success('Storage setup completed!')
                            } else {
                              toast.error(`Setup failed: ${result.error}`)
                            }
                          } catch (error) {
                            toast.error('Failed to setup storage')
                          }
                        }}
                        className="border-white/30 text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all duration-200"
                      >
                        Setup Storage
                      </Button>
                    </div>
                    
                    <div className="space-y-6">
                      <ImageUpload
                        type="avatar"
                        currentImageUrl={appearanceSettings.profileImages?.avatarUrl}
                        onImageChange={(url) => updateProfileImage('avatarUrl', url)}
                      />
                      
                      <ImageUpload
                        type="header"
                        currentImageUrl={appearanceSettings.profileImages?.headerUrl}
                        onImageChange={(url) => updateProfileImage('headerUrl', url)}
                      />
                    </div>
                  </div>
                </div>

                {/* Display Settings */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <h3 className="text-white font-semibold text-xl mb-6">Display Settings</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                          <Moon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Dark Mode</div>
                          <div className="text-white/60 text-sm">Use darker color scheme</div>
                        </div>
                      </div>
                      <Switch
                        checked={appearanceSettings.darkMode}
                        onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                          <Sparkles className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Animations</div>
                          <div className="text-white/60 text-sm">Enable smooth transitions</div>
                        </div>
                      </div>
                      <Switch
                        checked={appearanceSettings.animations}
                        onCheckedChange={(checked) => updateSetting('animations', checked)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                          <Zap className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Glow Effects</div>
                          <div className="text-white/60 text-sm">Add subtle glow to elements</div>
                        </div>
                      </div>
                      <Switch
                        checked={appearanceSettings.glowEffects}
                        onCheckedChange={(checked) => updateSetting('glowEffects', checked)}
                        className="data-[state=checked]:bg-yellow-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      setSaving(true)
                      const result = await saveSettings()
                      if (result?.success) {
                        toast.success('Appearance settings saved successfully!')
                      } else {
                        toast.error('Failed to save appearance settings')
                      }
                      setSaving(false)
                    }}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-8 py-3 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 font-semibold"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Appearance
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-white text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button 
              variant="outline" 
              onClick={async () => {
                setSaving(true)
                try {
                  // Save appearance settings
                  const appearanceResult = await saveSettings()
                  if (appearanceResult?.success) {
                    toast.success('All settings saved successfully!')
                  } else {
                    toast.error('Failed to save some settings')
                  }
                } catch (error) {
                  console.error('Error saving settings:', error)
                  toast.error('Failed to save settings')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="border-white/30 text-white hover:bg-white/10 h-auto p-6 flex flex-col items-center gap-3 rounded-2xl transition-all duration-200 hover:scale-105"
            >
              {saving ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="font-semibold">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-6 w-6" />
                  <span className="font-semibold">Save All Changes</span>
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10 h-auto p-6 flex flex-col items-center gap-3 rounded-2xl transition-all duration-200 hover:scale-105"
            >
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">Export Data</span>
            </Button>
            <Button 
              variant="outline" 
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-auto p-6 flex flex-col items-center gap-3 rounded-2xl transition-all duration-200 hover:scale-105"
            >
              <AlertCircle className="h-6 w-6" />
              <span className="font-semibold">Delete Account</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 