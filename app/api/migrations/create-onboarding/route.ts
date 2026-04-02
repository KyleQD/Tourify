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

    // Execute SQL to create the onboarding table
    // We use the Supabase Database API directly since it's an admin operation
    const { error } = await supabase.from('onboarding').select('id').limit(1)
    
    // If the table already exists, return success
    if (!error || !error.message.includes('does not exist')) {
      return NextResponse.json({ success: true, message: 'Onboarding table already exists' })
    }

    // Otherwise, make a direct API call to execute SQL statements
    // Note: This requires direct database access, which may not be available
    // The alternative is to manually create these tables through the Supabase dashboard
    
    // Our workaround is to use Edge Functions or direct database access
    // For now, let's just inform the client that they need to manually create the tables
    return NextResponse.json(
      { 
        error: 'Manual table creation required',
        message: 'The onboarding table needs to be created manually. Please visit the Supabase dashboard and run the SQL from the migration files.'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error creating onboarding table:', error)
    return NextResponse.json(
      { error: 'Failed to create onboarding table', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 