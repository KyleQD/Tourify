import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = await createClient()
    
    // Verify user server-side; read session only for token expiry metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    let onboardingData = null
    let onboardingError = null
    
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('onboarding')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        
        onboardingData = data
        onboardingError = error?.message
      } catch (error) {
        onboardingError = error instanceof Error ? error.message : String(error)
      }
    }
    
    // Get current time and token expiration info
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const tokenExpiry = session?.expires_at || 0
    const isExpired = now > tokenExpiry
    
    // Return information about the authentication status
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        loggedIn: !!user,
        userId: user?.id || null,
        userEmail: user?.email || null,
        userPhone: user?.phone || null,
        userProviders: user?.app_metadata?.providers || [],
        emailConfirmed: user?.email_confirmed_at ? true : false,
        lastSignIn: user?.last_sign_in_at || null,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry * 1000).toISOString() : null,
        tokenIsExpired: isExpired,
      },
      onboarding: {
        data: onboardingData,
        error: onboardingError,
        exists: !!onboardingData,
        completed: onboardingData?.completed === true
      },
      error: userError?.message || sessionError?.message || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not-set'
    })
  } catch (error) {
    console.error('Auth debug API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 