import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { AccountManagementService } from '@/lib/services/account-management.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await AccountManagementService.getUserAccounts(user.id)
    const activeSession = await AccountManagementService.getActiveSession(user.id)

    return NextResponse.json({ 
      accounts, 
      activeSession,
      success: true 
    })
  } catch (error) {
    console.error('Error fetching user accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'switch_account':
        const { profileId, accountType } = data
        const success = await AccountManagementService.switchAccount(
          user.id, 
          profileId, 
          accountType
        )
        return NextResponse.json({ success })

      case 'create_artist':
        const artistId = await AccountManagementService.createArtistAccount(
          user.id, 
          data
        )
        return NextResponse.json({ artistId, success: true })

      case 'create_venue':
        const venueId = await AccountManagementService.createVenueAccount(
          user.id, 
          data
        )
        return NextResponse.json({ venueId, success: true })

      case 'request_admin':
        await AccountManagementService.requestAdminAccess(user.id, data)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error handling account action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 