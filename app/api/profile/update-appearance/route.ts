import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function PUT(request: NextRequest) {
  try {
    // Use the same authentication method as other API routes
    const auth = await authenticateApiRequest(request)
    
    if (!auth) {
      console.error('❌ Authentication failed for appearance update')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { user, supabase } = auth

    // Get the request body
    const body = await request.json()
    const { profileColors, selectedTheme, darkMode, animations, glowEffects, profileImages } = body


    // Validate the input data
    if (!profileColors || !selectedTheme) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First, check if the profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, metadata')
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


    // Get existing metadata or create empty object
    const existingMetadata = existingProfile.metadata || {}
    
    // Update the profile with appearance settings in metadata
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
          enable_glow_effects: glowEffects
        },
        header_url: profileImages?.headerUrl || existingMetadata?.header_url || null
      },
      avatar_url: profileImages?.avatarUrl || existingProfile.avatar_url,
      updated_at: new Date().toISOString()
    }


    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()

    if (error) {
      console.error('Database error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      message: 'Appearance settings updated successfully',
      data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 