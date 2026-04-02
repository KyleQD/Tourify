import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const results: any = {
      user_id: user.id,
      actions_taken: []
    }

    // Step 1: Ensure main profile exists with username
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', user.id)
      .single()

    let username = existingProfile?.username
    
    if (!existingProfile || !username) {
      // Generate username from email
      username = user.email?.split('@')[0] || 'user'
      
      // Check if username is taken
      const { data: usernameCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

      // If taken, add a number
      if (usernameCheck) {
        let counter = 1
        let newUsername = `${username}${counter}`
        
        while (true) {
          const { data: check } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', newUsername)
            .single()
          
          if (!check) {
            username = newUsername
            break
          }
          counter++
          newUsername = `${username}${counter}`
        }
      }

      if (!existingProfile) {
        // Create new profile
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: username,
            full_name: user.user_metadata?.full_name || username,
            bio: 'Welcome to Tourify!',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createError) throw createError
        results.actions_taken.push('Created main profile')
      } else {
        // Update existing profile with username
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: username,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError
        results.actions_taken.push('Updated profile with username')
      }
    }

    results.username = username

    // Step 2: Ensure artist profile exists
    const { data: existingArtistProfile, error: artistCheckError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name')
      .eq('user_id', user.id)
      .single()

    if (!existingArtistProfile) {
      // Create artist profile
      const artistName = user.user_metadata?.full_name || username || 'Artist'
      
      const { error: createArtistError } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: user.id,
          artist_name: artistName,
          bio: 'Artist on Tourify - building something amazing!',
          genres: ['Electronic', 'Pop'],
          social_links: {
            website: '',
            instagram: '',
            twitter: '',
            youtube: '',
            spotify: ''
          },
          verification_status: 'unverified',
          account_tier: 'basic',
          settings: {
            public_profile: true,
            allow_bookings: true,
            show_contact_info: false,
            auto_accept_follows: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (createArtistError) throw createArtistError
      results.actions_taken.push('Created artist profile')
      results.artist_name = artistName
    } else {
      results.artist_name = existingArtistProfile.artist_name
    }

    // Step 3: Generate profile URLs
    const artistUrlName = results.artist_name ? 
      results.artist_name.toLowerCase().replace(/\s+/g, '') : 
      username
    
    results.profile_urls = {
      main: `/profile/${username}`,
      artist: `/artist/${artistUrlName}`
    }

    return NextResponse.json({
      success: true,
      message: 'Profile setup completed successfully!',
      results
    })
  } catch (error) {
    console.error('Fix profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fix profile setup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
