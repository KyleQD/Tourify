import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    
    // Check cookies
    const cookies = request.cookies.getAll()
    
    // Try to create Supabase client
    const supabase = await createClient()
    
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (user) {
    }
    
    // Test database connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1)
    
    
    return NextResponse.json({
      success: true,
      authentication: {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      },
      cookies: cookies.map(c => ({ name: c.name, length: c.value.length })),
      database: {
        connected: !profileError,
        error: profileError?.message
      }
    })
  } catch (error: any) {
    console.error('Auth debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}