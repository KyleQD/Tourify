import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Test basic connection and table access
    const { data: venues, error } = await supabase
      .from('venue_profiles')
      .select('id, venue_name, city, state, created_at')
      .limit(5)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      venues: venues || [],
      count: venues?.length || 0,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 