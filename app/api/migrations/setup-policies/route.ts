import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })

    // Check if tables exist
    const { error: profilesError } = await supabase.from('profiles').select('id').limit(1)
    const { error: onboardingError } = await supabase.from('onboarding').select('id').limit(1)
    
    // If either table doesn't exist, return error
    if ((profilesError && profilesError.message.includes('does not exist')) || 
        (onboardingError && onboardingError.message.includes('does not exist'))) {
      return NextResponse.json(
        { 
          error: 'Tables not found',
          message: 'The profiles and/or onboarding tables must exist before policies can be set up.'
        },
        { status: 400 }
      )
    }

    // Similar to the table creation routes, we can't set up RLS policies directly
    // from the client-side JavaScript SDK
    // This would need to be done manually in the Supabase dashboard
    return NextResponse.json(
      { 
        error: 'Manual policy setup required',
        message: 'The security policies need to be set up manually. Please visit the Supabase dashboard and run the SQL from the migration files.'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error setting up security policies:', error)
    return NextResponse.json(
      { error: 'Failed to set up security policies', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 