import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null 
      }, { status: 401 })
    }

    // Test if site_maps table exists
    const { data: siteMaps, error: siteMapsError } = await supabase
      .from('site_maps')
      .select('count')
      .limit(1)

    // Test if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      database: {
        site_maps_table: {
          exists: !siteMapsError,
          error: siteMapsError?.message || null
        },
        profiles_table: {
          exists: !profilesError,
          error: profilesError?.message || null
        }
      }
    })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
