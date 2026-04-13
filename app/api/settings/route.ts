import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const accountType = url.searchParams.get('account_type') || 'general'
    const profileId = url.searchParams.get('profile_id') || user.id

    let profileData = null

    switch (accountType) {
      case 'artist':
        const { data: artistProfile, error: artistError } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!artistError && artistProfile) {
          profileData = artistProfile
        }
        break

      case 'venue':
        const { data: venueProfile, error: venueError } = await supabase
          .from('venue_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!venueError && venueProfile) {
          profileData = venueProfile
        }
        break

      case 'admin':
      case 'general':
      default:
        const { data: generalProfile, error: generalError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single()

        if (!generalError && generalProfile) {
          profileData = generalProfile
        }
        break
    }

    return NextResponse.json({ profile: profileData, success: true })
  } catch (error) {
    console.error('Error fetching profile settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { account_type, profile_id, settings_data, settings_type } = body

    if (!account_type || !settings_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let updateResult = null

    switch (account_type) {
      case 'artist':
        // Update artist profile
        const { error: artistError } = await supabase
          .from('artist_profiles')
          .update({
            ...settings_data,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (artistError) throw artistError
        updateResult = { success: true, account_type: 'artist' }
        break

      case 'venue':
        // Update venue profile with comprehensive settings
        const { error: venueError } = await supabase
          .from('venue_profiles')
          .update({
            ...settings_data,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (venueError) throw venueError
        
        // Recalculate profile completion after update
        const { data: updatedVenue } = await supabase
          .from('venue_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (updatedVenue) {
          await supabase
            .rpc('calculate_venue_profile_completion', { 
              venue_id: updatedVenue.id 
            })
        }
        
        updateResult = { success: true, account_type: 'venue' }
        break

      case 'admin':
      case 'general':
      default:
        // Update general profile
        const targetProfileId = profile_id || user.id
        const { error: generalError } = await supabase
          .from('profiles')
          .update({
            ...settings_data,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetProfileId)

        if (generalError) throw generalError
        updateResult = { success: true, account_type: 'general' }
        break
    }

    // Log the settings update for audit purposes
    await supabase
      .from('account_activity_log')
      .insert([
        {
          user_id: user.id,
          profile_id: profile_id || user.id,
          account_type: account_type,
          action_type: 'update_profile',
          action_details: {
            settings_type: settings_type || 'general',
            updated_fields: Object.keys(settings_data)
          }
        }
      ])
      .then(({ error: logError }) => {
        if (logError) {
          console.warn('Failed to log activity:', logError)
        }
      })

    return NextResponse.json(updateResult)
  } catch (error) {
    console.error('Error updating profile settings:', error)
    return NextResponse.json(
      { error: 'Failed to update profile settings' },
      { status: 500 }
    )
  }
} 