import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    // Authenticate the request
    const authResult = await authenticateApiRequest(request)
    if (!authResult || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { user, supabase } = authResult

    // Get the user's profile with metadata
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, metadata')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        header_url_from_metadata: profile.metadata?.header_url || null,
        full_metadata: profile.metadata
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 