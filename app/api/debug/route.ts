import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if tables exist
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    const { error: onboardingError } = await supabase
      .from('onboarding')
      .select('id')
      .limit(1)

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
      tables: {
        profiles: {
          exists: !profilesError || !profilesError.message.includes('does not exist'),
          error: profilesError?.message
        },
        onboarding: {
          exists: !onboardingError || !onboardingError.message.includes('does not exist'),
          error: onboardingError?.message
        }
      },
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Not set',
        supabaseAnonKey: supabaseAnonKey ? 'Set' : 'Not set'
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 