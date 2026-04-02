import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = createServiceRoleClient()
    const userId = 'bce15693-d2bf-42db-a2f2-68239568fafe'

    // Check artist_profiles table
    const { data: artistProfiles, error: artistError } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', userId)

    // Check profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)

    // Check auth.users table
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('id', userId)

    return NextResponse.json({
      userId,
      artistProfiles: {
        data: artistProfiles,
        error: artistError?.message || null
      },
      profiles: {
        data: profiles,
        error: profileError?.message || null
      },
      users: {
        data: users,
        error: userError?.message || null
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
} 