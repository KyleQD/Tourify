import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    // Get cookie store first - Next.js 14+ requires this to be awaited
    // The `cookies()` function returns the cookie store directly in newer Next.js versions
    const cookieStore = cookies()
    
    // Create a Supabase client using the route handler
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })
    
    // Get the session from the server side
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    let onboardingData = null
    let onboardingError = null
    
    // If there's a session, check the onboarding status
    if (session?.user?.id) {
      try {
        const { data, error } = await supabase
          .from('onboarding')
          .select('*')
          .eq('user_id', session.user.id)
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
        loggedIn: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userPhone: session?.user?.phone || null,
        userProviders: session?.user?.app_metadata?.providers || [],
        emailConfirmed: session?.user?.email_confirmed_at ? true : false,
        lastSignIn: session?.user?.last_sign_in_at || null,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry * 1000).toISOString() : null,
        tokenIsExpired: isExpired,
      },
      onboarding: {
        data: onboardingData,
        error: onboardingError,
        exists: !!onboardingData,
        completed: onboardingData?.completed === true
      },
      error: sessionError?.message || null,
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