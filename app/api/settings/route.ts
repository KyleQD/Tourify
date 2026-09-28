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
    const requestedProfileId = url.searchParams.get('profile_id')
    const profileId = requestedProfileId || user.id

    // `profiles_select` is `USING (true)` in the active chain, so a caller-supplied
    // `profile_id` made this route return another user's ENTIRE profile row —
    // including the `metadata` and `profile_data` jsonb blobs that carry contact
    // fields — to any authenticated caller. Scope the read to the authenticated
    // account and fail closed. (DB-008 / Wave 35.)
    if (profileId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: settings can only be read for the authenticated user' },
        { status: 403 }
      )
    }

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

        // DB-008 / Wave 35: the `calculate_venue_profile_completion` RPC call was
        // removed. It exists in no active migration and in no generated contract
        // (only supabase/migrations_backup/20250120300000_enhance_venue_profiles_comprehensive.sql),
        // so the call always returned an error that this route never inspected —
        // a silent no-op. Its only intended effect was to recompute
        // `venue_profiles.profile_completion`, which IS a real column
        // (20260728000000_venue_kit_settings.sql) and which the canonical venue
        // settings form already writes directly in the same request
        // (components/settings/enhanced-venue-settings.tsx, `profile_completion:
        // completionScore`). Recreating the RPC was rejected: inventing a scoring
        // contract that no live consumer reads back would be a new product
        // decision, not a drift repair.
        updateResult = { success: true, account_type: 'venue' }
        break

      case 'admin':
      case 'general':
      default:
        // Update general profile.
        // Authorization is enforced at the application boundary, not only by the
        // `profiles_update` RLS policy. `profile_id` is caller-supplied; accepting
        // it unchecked meant the route reported `success: true` for a cross-user
        // write that RLS silently reduced to zero affected rows. Fail closed.
        const targetProfileId = profile_id || user.id
        if (targetProfileId !== user.id) {
          return NextResponse.json(
            { error: 'Forbidden: settings can only be updated for the authenticated user' },
            { status: 403 }
          )
        }

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