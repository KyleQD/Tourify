import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { z } from 'zod'

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be less than 30 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  custom_url: z.string().min(3, 'Custom URL must be at least 3 characters').max(30, 'Custom URL must be less than 30 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  instagram: z.string().max(50, 'Instagram handle must be less than 50 characters').optional(),
  twitter: z.string().max(50, 'Twitter handle must be less than 50 characters').optional(),
  spotify: z.string().max(100, 'Spotify URL must be less than 100 characters').optional(),
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  show_location: z.boolean().optional(),
  profile_experience: z.object({
    public_visibility: z.object({
      show_feed: z.boolean().optional(),
      show_marketplace: z.boolean().optional(),
      show_portfolio: z.boolean().optional(),
      show_achievements: z.boolean().optional(),
    }).optional(),
    support: z.object({
      support_title: z.string().max(80, 'Support title must be less than 80 characters').optional(),
      support_message: z.string().max(240, 'Support message must be less than 240 characters').optional(),
      tip_jar_url: z.string().url('Tip jar URL must be a valid URL').optional().or(z.literal('')),
      commission_url: z.string().url('Commission URL must be a valid URL').optional().or(z.literal('')),
      booking_url: z.string().url('Booking URL must be a valid URL').optional().or(z.literal('')),
      marketplace_url: z.string().url('Marketplace URL must be a valid URL').optional().or(z.literal('')),
    }).optional(),
    dashboard: z.object({
      show_quick_stats: z.boolean().optional(),
      show_tasks: z.boolean().optional(),
      show_recommendations: z.boolean().optional(),
      widget_order: z.array(z.string().min(1)).max(20).optional(),
    }).optional(),
  }).optional(),
})

interface ProfileUpdateData {
  full_name?: string
  username?: string
  custom_url?: string
  bio?: string
  location?: string
  website?: string
  phone?: string
  instagram?: string
  twitter?: string
  spotify?: string
  show_email?: boolean
  show_phone?: boolean
  show_location?: boolean
  profile_experience?: {
    public_visibility?: {
      show_feed?: boolean
      show_marketplace?: boolean
      show_portfolio?: boolean
      show_achievements?: boolean
    }
    support?: {
      support_title?: string
      support_message?: string
      tip_jar_url?: string
      commission_url?: string
      booking_url?: string
      marketplace_url?: string
    }
    dashboard?: {
      show_quick_stats?: boolean
      show_tasks?: boolean
      show_recommendations?: boolean
      widget_order?: string[]
    }
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Use the new authentication method that matches middleware
    const auth = await authenticateApiRequest(request)
    
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
        details: validationResult.error.issues,
        field: validationResult.error.issues[0]?.path[0]
      }, { status: 400 })
    }

    const updateData: ProfileUpdateData = validationResult.data

    // Handle custom URL validation and uniqueness
    if (updateData.custom_url) {
      // Clean the custom URL
      const cleanedUrl = updateData.custom_url.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '')
      
      // Check if URL is reserved
      const reservedUrls = [
        'admin', 'api', 'www', 'app', 'settings', 'profile', 'user', 'account', 
        'dashboard', 'login', 'signup', 'auth', 'help', 'support', 'about', 
        'contact', 'terms', 'privacy', 'events', 'artist', 'venue', 'search', 
        'discover', 'feed', 'messages', 'notifications', 'billing', 'security', 
        'integrations', 'onboarding', 'create', 'edit', 'delete', 'update'
      ]
      
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

    const { data: existingProfileRow, error: existingProfileError } = await supabase
      .from('profiles')
      .select('profile_data')
      .eq('id', user.id)
      .single()

    if (existingProfileError) {
      console.error('❌ Error loading existing profile data:', existingProfileError)
      return NextResponse.json({
        error: 'Error loading current profile settings'
      }, { status: 500 })
    }

    // Prepare update data with only defined fields for optimal performance
    const profileUpdate: any = {
      updated_at: new Date().toISOString()
    }

    // Only include fields that are being updated (avoid unnecessary writes)
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof ProfileUpdateData] !== undefined) {
        profileUpdate[key] = updateData[key as keyof ProfileUpdateData]
      }
    })

    if (updateData.profile_experience) {
      const existingProfileData = isRecord(existingProfileRow?.profile_data) ? existingProfileRow.profile_data : {}
      const existingProfileExperience = isRecord(existingProfileData.profile_experience) ? existingProfileData.profile_experience : {}
      const incomingProfileExperience = updateData.profile_experience

      profileUpdate.profile_data = {
        ...existingProfileData,
        profile_experience: {
          ...existingProfileExperience,
          ...(isRecord(incomingProfileExperience.public_visibility) && {
            public_visibility: {
              ...(isRecord(existingProfileExperience.public_visibility) ? existingProfileExperience.public_visibility : {}),
              ...incomingProfileExperience.public_visibility,
            }
          }),
          ...(isRecord(incomingProfileExperience.support) && {
            support: {
              ...(isRecord(existingProfileExperience.support) ? existingProfileExperience.support : {}),
              ...incomingProfileExperience.support,
            }
          }),
          ...(isRecord(incomingProfileExperience.dashboard) && {
            dashboard: {
              ...(isRecord(existingProfileExperience.dashboard) ? existingProfileExperience.dashboard : {}),
              ...incomingProfileExperience.dashboard,
            }
          }),
        },
      }

      delete profileUpdate.profile_experience
    }


    // Perform the optimized update using direct column access
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        custom_url,
        phone,
        location,
        website,
        profile_data,
        instagram,
        twitter,
        spotify,
        show_email,
        show_phone,
        show_location,
        is_verified,
        followers_count,
        following_count,
        posts_count,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      
      // Handle specific database errors
      if (updateError.code === '23505') {
        // Unique constraint violation
        const constraintDetail = updateError.details || ''
        if (constraintDetail.includes('username')) {
          return NextResponse.json({
            error: 'Username is already taken',
            field: 'username'
          }, { status: 400 })
        } else if (constraintDetail.includes('custom_url')) {
          return NextResponse.json({
            error: 'Custom URL is already taken',
            field: 'custom_url'
          }, { status: 400 })
        }
      }
      
      return NextResponse.json({
        error: 'Error updating profile',
        details: updateError.message
      }, { status: 500 })
    }

    if (!updatedProfile) {
      return NextResponse.json({
        error: 'Profile not found or update failed'
      }, { status: 404 })
    }

    const processingTime = Date.now() - startTime

    // Return optimized profile response
    const response = {
      success: true,
      message: 'Profile updated successfully and synced to database',
      profile: {
        id: updatedProfile.id,
        username: updatedProfile.username,
        custom_url: updatedProfile.custom_url,
        full_name: updatedProfile.full_name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url,
        phone: updatedProfile.phone,
        location: updatedProfile.location,
        website: updatedProfile.website,
        social_links: {
          instagram: updatedProfile.instagram,
          twitter: updatedProfile.twitter,
          spotify: updatedProfile.spotify,
          website: updatedProfile.website
        },
        privacy: {
          show_email: updatedProfile.show_email,
          show_phone: updatedProfile.show_phone,
          show_location: updatedProfile.show_location
        },
        stats: {
          followers: updatedProfile.followers_count || 0,
          following: updatedProfile.following_count || 0,
          posts: updatedProfile.posts_count || 0
        },
        profile_data: {
          ...(isRecord(updatedProfile.profile_data) ? updatedProfile.profile_data : {}),
          name: updatedProfile.full_name,
          bio: updatedProfile.bio,
          location: updatedProfile.location,
          website: updatedProfile.website,
          phone: updatedProfile.phone
        },
        verified: updatedProfile.is_verified || false,
        account_type: 'general',
        updated_at: updatedProfile.updated_at,
        created_at: updatedProfile.created_at
      },
      performance: {
        processing_time_ms: processingTime,
        fields_updated: Object.keys(updateData).length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('💥 Profile update API error:', error)
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        processing_time_ms: processingTime,
        status: 'failed'
      }
    }, { status: 500 })
  }
} 