import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get venue ID from request body
    const { venueId } = await request.json()
    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 })
    }

    // Verify the user owns this venue
    const { data: venue, error: venueError } = await supabase
      .from('venue_profiles')
      .select('id, user_id, venue_name')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    if (venue.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own venues' }, { status: 403 })
    }

    // Delete the venue profile
    const { error: deleteError } = await supabase
      .from('venue_profiles')
      .delete()
      .eq('id', venueId)
      .eq('user_id', user.id) // Extra safety check

    if (deleteError) {
      console.error('Error deleting venue:', deleteError)
      return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 })
    }

    // Also clean up any related data (optional)
    try {
      // Clean up user_sessions if they exist
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('active_profile_id', venueId)
        .eq('active_account_type', 'venue')

      // Clean up account_activity_log if it exists  
      await supabase
        .from('account_activity_log')
        .delete()
        .eq('user_id', user.id)
        .eq('profile_id', venueId)
        .eq('account_type', 'venue')
    } catch (cleanupError) {
      // Non-critical cleanup errors - venue is already deleted
    }

    return NextResponse.json({ 
      success: true, 
      message: `Venue "${venue.venue_name}" has been deleted successfully` 
    })

  } catch (error) {
    console.error('Error in venue delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 