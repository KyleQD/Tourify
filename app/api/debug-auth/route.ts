import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===')
    
    // Check cookies
    const cookies = request.cookies.getAll()
    console.log('Available cookies:', cookies.map(c => `${c.name}: ${c.value.substring(0, 50)}...`))
    
    // Try to create Supabase client
    const supabase = await createClient()
    console.log('Supabase client created successfully')
    
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth result:', { user: !!user, error: authError?.message })
    
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      })
    }
    
    // Test database connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1)
    
    console.log('Database test:', { 
      hasProfile: !!profile, 
      error: profileError?.message 
    })
    
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