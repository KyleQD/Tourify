import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Get main profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('id', user.id)
      .single()

    // Get artist profile
    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name, bio, genres')
      .eq('user_id', user.id)
      .single()

    // Generate suggested URLs
    const username = profile?.username || user.email?.split('@')[0] || 'user'
    const artistName = artistProfile?.artist_name || 'artist'
    const suggestedUrls = {
      profile: `/profile/${username}`,
      artist: `/artist/${artistName.toLowerCase().replace(/\s+/g, '')}`
    }

    const debugData = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      profile: profileError ? null : profile,
      artistProfile: artistError ? null : artistProfile,
      suggestedUrls
    }

    return NextResponse.json(debugData)
  } catch (error) {
    console.error('Profile check debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
