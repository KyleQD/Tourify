import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import {
  DEFAULT_DASHBOARD_THEME_ID,
  getDashboardTheme,
  isDashboardThemeId,
  writeCachedDashboardThemeId,
  type DashboardThemeId,
} from '@/lib/dashboard/dashboard-themes'
import {
  PROFILE_IMAGES_UPDATED_EVENT,
  notifyProfileImagesUpdated,
} from '@/lib/profile/profile-image-events'

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
  dashboardTheme: DashboardThemeId
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
  dashboardTheme: DEFAULT_DASHBOARD_THEME_ID,
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

  useEffect(() => {
    function handleImagesUpdated(event: Event) {
      const detail = (event as CustomEvent<{
        avatarUrl?: string | null
        coverUrl?: string | null
      }>).detail

      // Merge event payload first so a just-uploaded URL is never wiped by a
      // slow/empty reload before the DB read catches up.
      if (detail) {
        setSettings((prev) => ({
          ...prev,
          profileImages: {
            avatarUrl:
              detail.avatarUrl !== undefined
                ? detail.avatarUrl || ''
                : prev.profileImages.avatarUrl,
            headerUrl:
              detail.coverUrl !== undefined
                ? detail.coverUrl || ''
                : prev.profileImages.headerUrl,
          },
        }))
      }

      if (user) void loadSettings()
    }

    window.addEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleImagesUpdated)
    return () => window.removeEventListener(PROFILE_IMAGES_UPDATED_EVENT, handleImagesUpdated)
  }, [user])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata, avatar_url, cover_image, account_settings')
        .eq('id', user?.id)
        .single()

      if (profile) {
        const profileColors = profile.metadata?.profile_colors
        const headerUrl =
          profile.cover_image ||
          profile.metadata?.header_url ||
          ''
        const storedDashboardTheme = profile.account_settings?.appearance?.dashboard_theme
        const dashboardTheme = isDashboardThemeId(storedDashboardTheme)
          ? storedDashboardTheme
          : DEFAULT_DASHBOARD_THEME_ID

        setSettings((prev) => ({
          theme: 'system',
          darkMode: profileColors?.use_dark_mode ?? true,
          animations: profileColors?.enable_animations ?? true,
          glowEffects: profileColors?.enable_glow_effects ?? true,
          profileColors: {
            primary: profileColors?.primary_color || '#10b981',
            secondary: profileColors?.secondary_color || '#059669',
            accent: profileColors?.accent_color || '#34d399',
          },
          selectedTheme: profileColors?.background_gradient || 'emerald',
          dashboardTheme,
          profileImages: {
            // Prefer freshly loaded DB values; fall back to in-memory upload URLs
            // so a stale empty read cannot blank a just-uploaded header.
            avatarUrl: profile.avatar_url || prev.profileImages.avatarUrl || '',
            headerUrl: headerUrl || prev.profileImages.headerUrl || '',
          },
        }))
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
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

  const PROFILE_PRESET_IDS = new Set(['emerald', 'ocean', 'royal', 'sunset'])

  const setDashboardTheme = (themeId: string) => {
    const theme = getDashboardTheme(themeId)
    setSettings((prev) => ({
      ...prev,
      dashboardTheme: theme.id,
      profileColors: {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
      },
      selectedTheme: PROFILE_PRESET_IDS.has(theme.id) ? theme.id : prev.selectedTheme,
    }))
    writeCachedDashboardThemeId(theme.id)
  }

  const saveSettings = async () => {
    if (!user) {
      console.error('No user found when trying to save appearance settings')
      return { success: false, error: 'No user found' }
    }

    try {
      const response = await fetch('/api/profile/update-appearance', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileColors: settings.profileColors,
          selectedTheme: settings.selectedTheme,
          darkMode: settings.darkMode,
          animations: settings.animations,
          glowEffects: settings.glowEffects,
          profileImages: settings.profileImages,
          dashboardTheme: settings.dashboardTheme,
        }),
      })

      const result = await response.json().catch(() => ({
        error: 'Invalid server response',
      }))

      if (!response.ok) {
        console.error('API error:', result)
        return {
          success: false,
          error: result.error || `HTTP ${response.status}: Failed to save settings`,
        }
      }

      writeCachedDashboardThemeId(settings.dashboardTheme)
      notifyProfileImagesUpdated({
        avatarUrl: settings.profileImages.avatarUrl || null,
        coverUrl: settings.profileImages.headerUrl || null,
        source: 'appearance-save',
      })
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error saving appearance settings:', error)
      const message =
        error instanceof TypeError
          ? 'Could not reach the server — restart the dev server and try again'
          : error instanceof Error
            ? error.message
            : 'Failed to save appearance settings'
      return { success: false, error: message }
    }
  }

  const applyTheme = (themeId: string) => {
    // Profile presets share ids with dashboard themes — keep both in sync
    if (isDashboardThemeId(themeId)) {
      const theme = getDashboardTheme(themeId)
      setSettings((prev) => ({
        ...prev,
        dashboardTheme: theme.id,
        selectedTheme: themeId,
        profileColors: {
          primary: theme.primary,
          secondary: theme.secondary,
          accent: theme.accent,
        },
      }))
      writeCachedDashboardThemeId(theme.id)
      return
    }

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
    setDashboardTheme,
    saveSettings,
    applyTheme,
    reload: loadSettings
  }
}
