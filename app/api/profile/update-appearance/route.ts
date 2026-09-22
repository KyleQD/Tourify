import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  DEFAULT_DASHBOARD_THEME_ID,
  getDashboardTheme,
  isDashboardThemeId,
} from '@/lib/dashboard/dashboard-themes'
import { resolveAppearanceImageField } from '@/lib/profile/profile-image-events'

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)

    if (!auth) {
      console.error('❌ Authentication failed for appearance update')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { user, supabase } = auth

    const body = await request.json()
    const {
      profileColors,
      selectedTheme,
      darkMode,
      animations,
      glowEffects,
      profileImages,
      dashboardTheme,
    } = body

    if (!profileColors || !selectedTheme) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const resolvedDashboardTheme = getDashboardTheme(
      isDashboardThemeId(dashboardTheme) ? dashboardTheme : DEFAULT_DASHBOARD_THEME_ID
    )

    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, metadata, account_settings, avatar_url, cover_image')
      .eq('id', user.id)
      .single()

    if (checkError) {
      console.error('Error checking profile:', checkError)
      return NextResponse.json(
        { success: false, error: `Profile check failed: ${checkError.message}` },
        { status: 500 }
      )
    }

    if (!existingProfile) {
      console.error('Profile not found for user:', user.id)
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const existingMetadata = existingProfile.metadata || {}
    const existingAccountSettings =
      existingProfile.account_settings && typeof existingProfile.account_settings === 'object'
        ? existingProfile.account_settings
        : {}
    const existingAppearance =
      existingAccountSettings.appearance && typeof existingAccountSettings.appearance === 'object'
        ? existingAccountSettings.appearance
        : {}

    const nextAvatarUrl = resolveAppearanceImageField(
      profileImages?.avatarUrl,
      existingProfile.avatar_url
    )
    const nextHeaderUrl = resolveAppearanceImageField(
      profileImages?.headerUrl,
      existingProfile.cover_image || existingMetadata?.header_url
    )

    const updateData = {
      metadata: {
        ...existingMetadata,
        profile_colors: {
          primary_color: profileColors.primary,
          secondary_color: profileColors.secondary,
          accent_color: profileColors.accent,
          background_gradient: selectedTheme,
          use_dark_mode: darkMode,
          enable_animations: animations,
          enable_glow_effects: glowEffects,
        },
        header_url: nextHeaderUrl,
      },
      account_settings: {
        ...existingAccountSettings,
        appearance: {
          ...existingAppearance,
          dashboard_theme: resolvedDashboardTheme.id,
        },
      },
      avatar_url: nextAvatarUrl,
      cover_image: nextHeaderUrl,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (profileImages && 'avatarUrl' in profileImages) {
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: nextAvatarUrl },
        })
      } catch (authError) {
        console.warn('Failed to sync auth avatar metadata', authError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appearance settings updated successfully',
      data,
      dashboardTheme: resolvedDashboardTheme.id,
      profileImages: {
        avatarUrl: nextAvatarUrl,
        headerUrl: nextHeaderUrl,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
