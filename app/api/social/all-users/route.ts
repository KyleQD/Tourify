import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 Getting all users for:', user.id, 'limit:', limit, 'offset:', offset)

    // Get all users except current user
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id, 
        username, 
        full_name, 
        avatar_url, 
        bio, 
        location, 
        is_verified, 
        followers_count, 
        following_count, 
        created_at,
        metadata
      `)
      .neq('id', user.id) // Exclude current user
      .not('username', 'is', null) // Only users with usernames
      .not('full_name', 'is', null) // Only users with names
      .order('created_at', { ascending: false }) // Most recent first
      .range(offset, offset + limit - 1)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('📋 Raw users found:', usersData?.length || 0)

    // Transform the data
    const transformedUsers = usersData?.map((profile: any) => {
      const username = profile.username || profile.metadata?.username
      const fullName = profile.full_name || profile.metadata?.full_name
      
      // Skip profiles without proper data
      if (!username || !fullName || fullName === 'Anonymous User') {
        return null
      }

      return {
        id: profile.id,
        username: username,
        full_name: fullName,
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        location: profile.location || '',
        is_verified: profile.is_verified || false,
        followers_count: profile.followers_count || 0,
        following_count: profile.following_count || 0,
        created_at: profile.created_at
      }
    }).filter(Boolean) || [] // Remove nulls

    console.log('✅ Returning', transformedUsers.length, 'users')

    return NextResponse.json({ 
      users: transformedUsers,
      count: transformedUsers.length,
      has_more: transformedUsers.length === limit
    })

  } catch (error) {
    console.error('💥 All users API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}




