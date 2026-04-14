import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AccountManagementService } from '@/lib/services/account-management.service'
import type { Database } from '@/lib/database.types'

interface CookieSet {
  name: string
  value: string
  options?: any
}

// Manual cookie parsing function similar to middleware
function parseAuthFromApiCookies(cookieStore: any) {
  try {
    const allCookies = cookieStore.getAll()
    
    console.log('[API Auth] All cookies:', allCookies.map((c: any) => `${c.name}: ${c.value.length} chars`))
    
    // Look for the main auth cookie
    const authCookie = allCookies.find((cookie: any) => 
      cookie.name === 'sb-tourify-auth-token'
    )
    
    if (!authCookie) {
      console.log('[API Auth] No sb-tourify-auth-token cookie found')
      
      // Fallback to other auth cookie patterns
      const fallbackCookie = allCookies.find((cookie: any) => 
        (cookie.name.includes('sb-') && 
         cookie.name.includes('auth-token') && 
         !cookie.name.includes('code-verifier') &&
         !cookie.name.includes('refresh') &&
         cookie.value.length > 100) ||
        (cookie.name.startsWith('sb-') && 
         cookie.name.includes('auqddrodjezjlypkzfpi') &&
         !cookie.name.includes('code-verifier') &&
         cookie.value.length > 100)
      )
      
      if (fallbackCookie) {
        console.log('[API Auth] Found fallback auth cookie:', fallbackCookie.name)
        return tryParseCookieValue(fallbackCookie.value)
      }
      
      return null
    }
    
    console.log('[API Auth] Found main auth cookie:', authCookie.name, 'length:', authCookie.value.length)
    
    return tryParseCookieValue(authCookie.value)
  } catch (error) {
    console.log('[API Auth] Error parsing auth from cookies:', error)
    return null
  }
}

function tryParseCookieValue(cookieValue: string) {
  try {
    // First try to parse as JSON directly
    const parsed = JSON.parse(decodeURIComponent(cookieValue))
    
    if (parsed && parsed.user && parsed.user.id) {
      console.log('[API Auth] Successfully parsed user from cookie:', parsed.user.id)
      return parsed.user
    }
    
    // Try parsing as base64 if direct JSON fails
    try {
      const base64Decoded = atob(cookieValue)
      const base64Parsed = JSON.parse(base64Decoded)
      
      if (base64Parsed && base64Parsed.user && base64Parsed.user.id) {
        console.log('[API Auth] Successfully parsed user from base64 cookie:', base64Parsed.user.id)
        return base64Parsed.user
      }
    } catch (base64Error) {
      console.log('[API Auth] Base64 parsing failed:', base64Error)
    }
    
    return null
  } catch (error) {
    console.log('[API Auth] Error parsing cookie value:', error)
    return null
  }
}

async function createSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-tourify-auth-token',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Accounts API] Starting request...')
    const supabase = await createSupabaseClient()
    
    console.log('🔍 [Accounts API] Getting user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let finalUser = user

    if (authError || !user) {
      console.log('🔍 [Accounts API] Supabase auth failed, trying manual cookie parsing...')
      const cookieStore = await cookies()
      finalUser = parseAuthFromApiCookies(cookieStore)
    }

    if (!finalUser) {
      console.error('🚫 [Accounts API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [Accounts API] User authenticated:', finalUser.id)
    
    console.log('🔍 [Accounts API] Fetching user accounts...')
    const accounts = await AccountManagementService.getUserAccounts(finalUser.id, supabase)
    
    console.log('🔍 [Accounts API] Fetching active session...')
    const activeSession = await AccountManagementService.getActiveSession(finalUser.id, supabase)

    console.log('✅ [Accounts API] Returning response with', accounts.length, 'accounts')
    return NextResponse.json({ 
      accounts, 
      activeSession,
      success: true 
    })
  } catch (error) {
    console.error('❌ [Accounts API] Error fetching user accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Accounts API] Starting POST request...')
    const supabase = await createSupabaseClient()
    
    console.log('🔍 [Accounts API] Getting user authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let finalUser = user

    if (authError || !user) {
      console.log('🔍 [Accounts API] Supabase auth failed, trying manual cookie parsing...')
      const cookieStore = await cookies()
      finalUser = parseAuthFromApiCookies(cookieStore)
    }

    if (!finalUser) {
      console.error('🚫 [Accounts API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [Accounts API] User authenticated:', finalUser.id)

    const body = await request.json()
    const { action, ...data } = body

    console.log('🔍 [Accounts API] Processing action:', action, 'with data:', data)

    switch (action) {
      case 'switch_account':
        const { profileId, accountType } = data
        const success = await AccountManagementService.switchAccount(
          finalUser.id, 
          profileId, 
          accountType
        )
        return NextResponse.json({ success })

      case 'create_artist':
        const artistId = await AccountManagementService.createArtistAccount(
          finalUser.id, 
          data
        )
        return NextResponse.json({ artistId, success: true })

      case 'create_venue':
        const venueId = await AccountManagementService.createVenueAccount(
          finalUser.id, 
          data
        )
        return NextResponse.json({ venueId, success: true })

      case 'create_organizer':
        console.log('🏗️ [Accounts API] Creating organizer account for user:', finalUser.id)
        const organizerId = await AccountManagementService.createOrganizerAccount(
          finalUser.id, 
          data,
          supabase,
          finalUser  // Pass the authenticated user directly
        )
        console.log('✅ [Accounts API] Organizer account created:', organizerId)
        return NextResponse.json({ organizerId, success: true })

      case 'request_admin':
        await AccountManagementService.requestAdminAccess(finalUser.id, data)
        return NextResponse.json({ success: true })

      case 'link_existing':
        const { existingProfileId, existingAccountType, permissions } = data
        await AccountManagementService.linkExistingAccount(
          finalUser.id,
          existingProfileId,
          existingAccountType,
          permissions
        )
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ [Accounts API] Error handling account action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let finalUser = user

    if (authError || !user) {
      const cookieStore = await cookies()
      finalUser = parseAuthFromApiCookies(cookieStore)
    }

    if (!finalUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profileId, accountType, permissions } = body

    await AccountManagementService.updateAccountPermissions(
      finalUser.id,
      profileId,
      accountType,
      permissions
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating account permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let finalUser = user

    if (authError || !user) {
      const cookieStore = await cookies()
      finalUser = parseAuthFromApiCookies(cookieStore)
    }

    if (!finalUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const accountType = searchParams.get('accountType')

    if (!profileId || !accountType) {
      return NextResponse.json(
        { error: 'Profile ID and account type are required' },
        { status: 400 }
      )
    }

    await AccountManagementService.deactivateAccount(
      finalUser.id,
      profileId,
      accountType as any
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating account:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate account' },
      { status: 500 }
    )
  }
} 