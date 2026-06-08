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

    // Get artist ID from request body
    const { artistId } = await request.json()
    if (!artistId) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 })
    }

    // Verify the user owns this artist profile
    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name')
      .eq('id', artistId)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (artist.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own artist profiles' }, { status: 403 })
    }

    // Delete the artist profile
    const { error: deleteError } = await supabase
      .from('artist_profiles')
      .delete()
      .eq('id', artistId)
      .eq('user_id', user.id) // Extra safety check

    if (deleteError) {
      console.error('Error deleting artist:', deleteError)
      return NextResponse.json({ error: 'Failed to delete artist' }, { status: 500 })
    }

    // Also clean up any related data (optional)
    try {
      // Clean up user_sessions if they exist
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('active_profile_id', artistId)
        .eq('active_account_type', 'artist')

      // Clean up account_activity_log if it exists  
      await supabase
        .from('account_activity_log')
        .delete()
        .eq('user_id', user.id)
        .eq('profile_id', artistId)
        .eq('account_type', 'artist')
    } catch (cleanupError) {
      // Non-critical cleanup errors - artist is already deleted
    }

    return NextResponse.json({ 
      success: true, 
      message: `Artist "${artist.artist_name}" has been deleted successfully` 
    })

  } catch (error) {
    console.error('Error in artist delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 