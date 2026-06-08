import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters').optional(),
  custom_url: z.string().min(3, 'Custom URL must be at least 3 characters').max(30, 'Custom URL must be less than 30 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  instagram: z.string().max(50, 'Instagram handle must be less than 50 characters').optional(),
  twitter: z.string().max(50, 'Twitter handle must be less than 50 characters').optional(),
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  show_location: z.boolean().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    // Use the new authentication method that matches middleware
    const auth = await authenticateApiRequest()
    
    if (!auth) {
      console.error('❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateProfileSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues)
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Handle custom URL validation and uniqueness
    if (updateData.custom_url) {
      // Clean the custom URL
      const cleanedUrl = updateData.custom_url.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '')
      
      // Check if URL is reserved
      const reservedUrls = ['admin', 'api', 'www', 'app', 'settings', 'profile', 'user', 'account', 'dashboard', 'login', 'signup', 'auth', 'help', 'support', 'about', 'contact', 'terms', 'privacy', 'events', 'artist', 'venue', 'search', 'discover', 'feed', 'messages', 'notifications', 'billing', 'security', 'integrations']
      
      if (reservedUrls.includes(cleanedUrl)) {
        return NextResponse.json({
          error: 'This URL is reserved and cannot be used',
          field: 'custom_url'
        }, { status: 400 })
      }

      // Check if URL is already taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('custom_url', cleanedUrl)
        .neq('id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking custom URL:', checkError)
        return NextResponse.json({
          error: 'Error validating custom URL'
        }, { status: 500 })
      }

      if (existingProfile) {
        return NextResponse.json({
          error: 'This URL is already taken',
          field: 'custom_url'
        }, { status: 400 })
      }

      updateData.custom_url = cleanedUrl
    }

    // Handle username validation and uniqueness
    if (updateData.username) {
      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', updateData.username)
        .neq('id', user.id)
        .single()

      if (usernameError && usernameError.code !== 'PGRST116') {
        console.error('❌ Error checking username:', usernameError)
        return NextResponse.json({
          error: 'Error validating username'
        }, { status: 500 })
      }

      if (existingUsername) {
        return NextResponse.json({
          error: 'This username is already taken',
          field: 'username'
        }, { status: 400 })
      }
    }

    // Get current profile to merge with updates
    const { data: currentProfile, error: currentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (currentError) {
      console.error('❌ Error fetching current profile:', currentError)
      return NextResponse.json({
        error: 'Error fetching current profile'
      }, { status: 500 })
    }

    // Prepare update data
    const profileUpdate: any = {
      updated_at: new Date().toISOString()
    }

    // Direct profile fields
    if (updateData.full_name !== undefined) profileUpdate.full_name = updateData.full_name
    if (updateData.username !== undefined) profileUpdate.username = updateData.username
    if (updateData.custom_url !== undefined) profileUpdate.custom_url = updateData.custom_url
    if (updateData.bio !== undefined) profileUpdate.bio = updateData.bio

    // Metadata fields
    const currentMetadata = currentProfile.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      full_name: updateData.full_name || currentMetadata.full_name,
      username: updateData.username || currentMetadata.username,
      custom_url: updateData.custom_url || currentMetadata.custom_url,
      bio: updateData.bio || currentMetadata.bio,
      location: updateData.location !== undefined ? updateData.location : currentMetadata.location,
      website: updateData.website !== undefined ? updateData.website : currentMetadata.website,
      phone: updateData.phone !== undefined ? updateData.phone : currentMetadata.phone,
      instagram: updateData.instagram !== undefined ? updateData.instagram : currentMetadata.instagram,
      twitter: updateData.twitter !== undefined ? updateData.twitter : currentMetadata.twitter,
      show_email: updateData.show_email !== undefined ? updateData.show_email : currentMetadata.show_email,
      show_phone: updateData.show_phone !== undefined ? updateData.show_phone : currentMetadata.show_phone,
      show_location: updateData.show_location !== undefined ? updateData.show_location : currentMetadata.show_location,
    }

    profileUpdate.metadata = newMetadata

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      return NextResponse.json({
        error: 'Error updating profile',
        details: updateError.message
      }, { status: 500 })
    }


    // Return updated profile data
    return NextResponse.json({
      success: true,
      profile: {
        id: updatedProfile.id,
        username: updatedProfile.username,
        custom_url: updatedProfile.custom_url,
        full_name: updatedProfile.full_name,
        bio: updatedProfile.bio,
        metadata: updatedProfile.metadata,
        updated_at: updatedProfile.updated_at
      }
    })

  } catch (error) {
    console.error('💥 Profile update API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 