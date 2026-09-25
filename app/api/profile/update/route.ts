import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { z } from 'zod'

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters').optional(),
  // Deprecated request alias for `username`; see the handle-resolution block below.
  // It is never written as a `profiles` column because that column is not in the
  // active migration chain.
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

    // Handle the public handle: validation and uniqueness.
    //
    // DB-008 / Wave 35: `profiles.custom_url` exists in no active migration and in
    // no generated contract, so the previous `custom_url` write below made
    // PostgREST reject the ENTIRE update statement — this route returned 500 for
    // every real client (`components/settings/enhanced-profile-settings.tsx`
    // always submits the field). `profiles.username` is the canonical, chain-
    // populated public handle, so `custom_url` is now treated as a deprecated
    // request alias for it. A payload that carries both with different values is
    // rejected explicitly rather than silently resolved, so no handle change is
    // ever chosen for the user.
    const requestedHandle = updateData.username ?? updateData.custom_url
    if (
      updateData.username !== undefined &&
      updateData.custom_url !== undefined &&
      updateData.username !== updateData.custom_url
    ) {
      return NextResponse.json({
        error: 'username and custom_url disagree; send only one',
        field: 'custom_url'
      }, { status: 400 })
    }

    if (requestedHandle) {
      // Clean the handle
      const cleanedUrl = requestedHandle.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '')

      // Check if URL is reserved
      const reservedUrls = ['admin', 'api', 'www', 'app', 'settings', 'profile', 'user', 'account', 'dashboard', 'login', 'signup', 'auth', 'help', 'support', 'about', 'contact', 'terms', 'privacy', 'events', 'artist', 'venue', 'search', 'discover', 'feed', 'messages', 'notifications', 'billing', 'security', 'integrations']

      if (reservedUrls.includes(cleanedUrl)) {
        return NextResponse.json({
          error: 'This URL is reserved and cannot be used',
          field: 'custom_url'
        }, { status: 400 })
      }

      // Check if the handle is already taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanedUrl)
        .neq('id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking profile handle:', checkError)
        return NextResponse.json({
          error: 'Error validating profile handle'
        }, { status: 500 })
      }

      if (existingProfile) {
        return NextResponse.json({
          error: 'This URL is already taken',
          field: 'custom_url'
        }, { status: 400 })
      }

      updateData.username = cleanedUrl
      // `custom_url` is a request alias only; it is never written as a column.
      delete updateData.custom_url
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

    // Direct profile fields. `custom_url` is intentionally absent: the column
    // does not exist in the active chain and writing it fails the whole statement.
    if (updateData.full_name !== undefined) profileUpdate.full_name = updateData.full_name
    if (updateData.username !== undefined) profileUpdate.username = updateData.username
    if (updateData.bio !== undefined) profileUpdate.bio = updateData.bio

    // Metadata fields
    const currentMetadata = isRecord(currentProfile.metadata) ? currentProfile.metadata : {}
    const newMetadata = {
      ...currentMetadata,
      full_name: updateData.full_name || currentMetadata.full_name,
      username: updateData.username || currentMetadata.username,
      // Deprecated alias mirror. `profiles.custom_url` does not exist; this jsonb
      // key is kept only so older readers of `metadata.custom_url` stay truthful.
      custom_url: updateData.username || currentMetadata.custom_url,
      bio: updateData.bio || currentMetadata.bio,
      location: updateData.location !== undefined ? updateData.location : currentMetadata.location,
      website: updateData.website !== undefined ? updateData.website : currentMetadata.website,
      phone: updateData.phone !== undefined ? updateData.phone : currentMetadata.phone,
      instagram: updateData.instagram !== undefined ? updateData.instagram : currentMetadata.instagram,
      twitter: updateData.twitter !== undefined ? updateData.twitter : currentMetadata.twitter,
      show_email: updateData.show_email !== undefined ? updateData.show_email : currentMetadata.show_email,
      // NOTE: deliberately written to `metadata` only, exactly as before. The
      // public publication gate is the top-level `profiles.show_phone` column
      // (lib/profile/general-public-profile.ts) and this route has never been able
      // to set it. Adding the column write here would widen what can be published,
      // so it is escalated instead — see the USER-005 checkpoint.
      show_phone: updateData.show_phone !== undefined ? updateData.show_phone : currentMetadata.show_phone,
      show_location: updateData.show_location !== undefined ? updateData.show_location : currentMetadata.show_location,
    }

    profileUpdate.metadata = newMetadata

    // `profiles.phone` does not exist. The canonical phone storage is
    // `profiles.profile_data.phone` — the same key app/api/settings/profile/route.ts
    // writes and the same key lib/profile/general-public-profile.ts strips when
    // `show_phone` is not `true`. Mirror it here so a phone entered in this form is
    // actually gated instead of being stranded in a legacy mirror. This does not
    // change the gate: the top-level `show_phone` column is untouched by this route.
    if (updateData.phone !== undefined) {
      const currentProfileData = isRecord(currentProfile.profile_data) ? currentProfile.profile_data : {}
      profileUpdate.profile_data = { ...currentProfileData, phone: updateData.phone }
    }

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
        // Deprecated alias of `username`; see the select note above.
        custom_url: updatedProfile.username,
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