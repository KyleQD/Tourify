import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    console.log('🔍 Debug: Fetching all profiles...')

    // Get all profiles to see what data we have
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_verified, followers_count, following_count, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const profilesWithDetails = profiles?.map(profile => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      is_verified: profile.is_verified,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      metadata_username: profile.metadata?.username,
      metadata_full_name: profile.metadata?.full_name,
      has_username: !!profile.username,
      has_full_name: !!profile.full_name,
      created_at: profile.created_at
    }))

    console.log('✅ Found', profiles?.length || 0, 'profiles')

    return NextResponse.json({ 
      profiles: profilesWithDetails,
      count: profiles?.length || 0,
      summary: {
        total: profiles?.length || 0,
        with_username: profiles?.filter(p => p.username).length || 0,
        with_full_name: profiles?.filter(p => p.full_name).length || 0,
        with_both: profiles?.filter(p => p.username && p.full_name).length || 0
      }
    })

  } catch (error) {
    console.error('💥 Debug profiles API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 