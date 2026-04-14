import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark'
  darkMode: boolean
  animations: boolean
  glowEffects: boolean
  profileColors: {
    primary: string
    secondary: string
    accent: string
  }
  selectedTheme: string
  profileImages: {
    avatarUrl: string
    headerUrl: string
  }
}

const defaultSettings: AppearanceSettings = {
  theme: 'system',
  darkMode: true,
  animations: true,
  glowEffects: true,
  profileColors: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399'
  },
  selectedTheme: 'emerald',
  profileImages: {
    avatarUrl: '',
    headerUrl: ''
  }
}

export function useAppearanceSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSettings()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata, avatar_url')
        .eq('id', user?.id)
        .single()

      if (profile) {
        const profileColors = profile.metadata?.profile_colors
        const headerUrl = profile.metadata?.header_url || ''
        
        setSettings({
          theme: 'system',
          darkMode: profileColors?.use_dark_mode ?? true,
          animations: profileColors?.enable_animations ?? true,
          glowEffects: profileColors?.enable_glow_effects ?? true,
          profileColors: {
            primary: profileColors?.primary_color || '#10b981',
            secondary: profileColors?.secondary_color || '#059669',
            accent: profileColors?.accent_color || '#34d399'
          },
          selectedTheme: profileColors?.background_gradient || 'emerald',
          profileImages: {
            avatarUrl: profile.avatar_url || '',
            headerUrl: headerUrl
          }
        })
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: keyof AppearanceSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateProfileColor = (colorKey: keyof typeof settings.profileColors, value: string) => {
    setSettings(prev => ({
      ...prev,
      profileColors: { ...prev.profileColors, [colorKey]: value }
    }))
  }

  const updateProfileImage = (imageKey: keyof typeof settings.profileImages, value: string) => {
    setSettings(prev => ({
      ...prev,
      profileImages: { ...prev.profileImages, [imageKey]: value }
    }))
  }

    const saveSettings = async () => {
    if (!user) {
      console.error('No user found when trying to save appearance settings')
      return { success: false, error: 'No user found' }
    }

    try {
      console.log('Saving appearance settings for user:', user.id)
      console.log('Settings to save:', {
        profileColors: settings.profileColors,
        selectedTheme: settings.selectedTheme,
        darkMode: settings.darkMode,
        animations: settings.animations,
        glowEffects: settings.glowEffects
      })

      // Use the new API endpoint to bypass RLS issues
      const response = await fetch('/api/profile/update-appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileColors: settings.profileColors,
          selectedTheme: settings.selectedTheme,
          darkMode: settings.darkMode,
          animations: settings.animations,
          glowEffects: settings.glowEffects,
          profileImages: settings.profileImages
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('API error:', result)
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        return { success: false, error: result.error || `HTTP ${response.status}: Failed to save settings` }
      }

      console.log('Appearance settings saved successfully via API:', result)
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error saving appearance settings:', error)
      return { success: false, error }
    }
  }

  const applyTheme = (themeId: string) => {
    const themes = {
      emerald: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
      ocean: { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' },
      royal: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
      sunset: { primary: '#f43f5e', secondary: '#e11d48', accent: '#fb7185' }
    }

    const theme = themes[themeId as keyof typeof themes]
    if (theme) {
      updateSetting('selectedTheme', themeId)
      updateProfileColor('primary', theme.primary)
      updateProfileColor('secondary', theme.secondary)
      updateProfileColor('accent', theme.accent)
    }
  }

  return {
    settings,
    loading,
    updateSetting,
    updateProfileColor,
    updateProfileImage,
    saveSettings,
    applyTheme,
    reload: loadSettings
  }
} 