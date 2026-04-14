import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
export interface ProfileColors {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_gradient: 'emerald' | 'blue' | 'purple' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'custom'
  custom_gradient_start?: string
  custom_gradient_end?: string
  use_dark_mode: boolean
  enable_animations: boolean
  enable_glow_effects: boolean
}

const defaultColors: ProfileColors = {
  primary_color: "#10b981",
  secondary_color: "#059669",
  accent_color: "#34d399",
  background_gradient: "emerald",
  custom_gradient_start: "#0f172a",
  custom_gradient_end: "#1e293b",
  use_dark_mode: false,
  enable_animations: true,
  enable_glow_effects: true,
}

export function useProfileColors(profileId: string) {
  const [colors, setColors] = useState<ProfileColors>(defaultColors)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Load colors from database
  const loadColors = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', profileId)
        .single()

      if (fetchError) {
        console.error('Error loading profile colors:', fetchError)
        setError('Failed to load profile colors')
        return
      }

      if (data?.metadata?.profile_colors) {
        setColors({
          ...defaultColors,
          ...data.metadata.profile_colors
        })
      }
    } catch (err) {
      console.error('Error in loadColors:', err)
      setError('Failed to load profile colors')
    } finally {
      setLoading(false)
    }
  }

  // Save colors to database
  const saveColors = async (newColors: ProfileColors) => {
    try {
      setLoading(true)
      setError(null)

      // First, get existing metadata
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', profileId)
        .single()

      if (fetchError) {
        console.error('Error fetching existing metadata:', fetchError)
        setError('Failed to save profile colors')
        return false
      }

      // Update metadata with new colors
      const existingMetadata = existingProfile?.metadata || {}
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          metadata: {
            ...existingMetadata,
            profile_colors: newColors
          }
        })
        .eq('id', profileId)

      if (updateError) {
        console.error('Error saving profile colors:', updateError)
        setError('Failed to save profile colors')
        return false
      }

      setColors(newColors)
      return true
    } catch (err) {
      console.error('Error in saveColors:', err)
      setError('Failed to save profile colors')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update colors locally (for preview)
  const updateColors = (newColors: Partial<ProfileColors>) => {
    setColors(prev => ({ ...prev, ...newColors }))
  }

  // Reset to default colors
  const resetColors = async () => {
    const success = await saveColors(defaultColors)
    if (success) {
      setColors(defaultColors)
    }
    return success
  }

  // Get CSS variables for applying colors
  const getCSSVariables = () => {
    const gradientMap = {
      emerald: 'from-emerald-900 via-emerald-900/20 to-slate-900',
      blue: 'from-blue-900 via-blue-900/20 to-slate-900',
      purple: 'from-purple-900 via-purple-900/20 to-slate-900',
      rose: 'from-rose-900 via-rose-900/20 to-slate-900',
      amber: 'from-amber-900 via-amber-900/20 to-slate-900',
      cyan: 'from-cyan-900 via-cyan-900/20 to-slate-900',
      indigo: 'from-indigo-900 via-indigo-900/20 to-slate-900',
      custom: 'custom'
    }

    return {
      '--profile-primary': colors.primary_color,
      '--profile-secondary': colors.secondary_color,
      '--profile-accent': colors.accent_color,
      '--profile-gradient': gradientMap[colors.background_gradient],
      '--profile-custom-gradient-start': colors.custom_gradient_start,
      '--profile-custom-gradient-end': colors.custom_gradient_end,
    }
  }

  // Get background gradient classes
  const getBackgroundGradient = () => {
    if (colors.background_gradient === 'custom') {
      return `bg-gradient-to-br from-[${colors.custom_gradient_start}] via-[${colors.custom_gradient_start}]/20 to-[${colors.custom_gradient_end}]`
    }
    
    const gradientMap = {
      emerald: 'bg-gradient-to-br from-emerald-900 via-emerald-900/20 to-slate-900',
      blue: 'bg-gradient-to-br from-blue-900 via-blue-900/20 to-slate-900',
      purple: 'bg-gradient-to-br from-purple-900 via-purple-900/20 to-slate-900',
      rose: 'bg-gradient-to-br from-rose-900 via-rose-900/20 to-slate-900',
      amber: 'bg-gradient-to-br from-amber-900 via-amber-900/20 to-slate-900',
      cyan: 'bg-gradient-to-br from-cyan-900 via-cyan-900/20 to-slate-900',
      indigo: 'bg-gradient-to-br from-indigo-900 via-indigo-900/20 to-slate-900',
    }
    
    return gradientMap[colors.background_gradient]
  }

  // Get color classes for different elements
  const getColorClasses = () => {
    return {
      primary: `text-[${colors.primary_color}]`,
      primaryBg: `bg-[${colors.primary_color}]`,
      primaryBorder: `border-[${colors.primary_color}]`,
      secondary: `text-[${colors.secondary_color}]`,
      secondaryBg: `bg-[${colors.secondary_color}]`,
      secondaryBorder: `border-[${colors.secondary_color}]`,
      accent: `text-[${colors.accent_color}]`,
      accentBg: `bg-[${colors.accent_color}]`,
      accentBorder: `border-[${colors.accent_color}]`,
    }
  }

  // Get animation classes
  const getAnimationClasses = () => {
    if (!colors.enable_animations) {
      return {
        transition: '',
        hover: '',
        animate: '',
      }
    }

    return {
      transition: 'transition-all duration-200',
      hover: 'hover:scale-105 hover:shadow-lg',
      animate: 'animate-in fade-in-0 slide-in-from-bottom-2',
    }
  }

  // Get glow effect classes
  const getGlowClasses = () => {
    if (!colors.enable_glow_effects) {
      return {
        glow: '',
        glowHover: '',
      }
    }

    return {
      glow: `shadow-[0_0_20px_${colors.primary_color}40]`,
      glowHover: `hover:shadow-[0_0_30px_${colors.primary_color}60]`,
    }
  }

  // Load colors on mount
  useEffect(() => {
    if (profileId) {
      loadColors()
    }
  }, [profileId])

  return {
    colors,
    loading,
    error,
    loadColors,
    saveColors,
    updateColors,
    resetColors,
    getCSSVariables,
    getBackgroundGradient,
    getColorClasses,
    getAnimationClasses,
    getGlowClasses,
  }
} 