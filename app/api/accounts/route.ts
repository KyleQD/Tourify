import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import { AccountManagementService } from '@/lib/services/account-management.service'
import type { ProfileType } from '@/lib/services/account-management.service'
import { isOrganizationType } from '@/lib/accounts/account-types'
import { startRouteTiming } from '@/lib/observability/route-timing'
import { OrganizerAccountSchema } from '@/lib/accounts/organization-account-schema'

async function authenticateAccountsRequest(request: NextRequest) {
  const authResult = await ProductionAuthService.authenticateRequest(request)
  if ('error' in authResult) return null
  return authResult
}

async function verifyProfileOwnership(
  supabase: { from: (table: string) => any },
  userId: string,
  profileId: string,
  accountType: string
): Promise<boolean> {
  if (accountType === 'general') {
    return profileId === userId
  }

  if (accountType === 'artist' || accountType === 'service') {
    const { data } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return Boolean(data)
  }

  if (accountType === 'venue') {
    const { data } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return Boolean(data)
  }

  if (isOrganizationType(accountType)) {
    const { data: organizerRow } = await supabase
      .from('organizer_accounts')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    if (organizerRow) return true

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_settings')
      .eq('id', userId)
      .maybeSingle()

    const settings = profile?.account_settings as {
      organizer_accounts?: Array<{ id?: string }>
      organizer_data?: { organization_name?: string }
    } | null

    if (Array.isArray(settings?.organizer_accounts)) {
      if (settings.organizer_accounts.some(org => org.id === profileId)) return true
    }

    const orgName = settings?.organizer_data?.organization_name
    if (orgName) {
      const legacyId = `${userId}-organizer-${orgName.toLowerCase().replace(/\s+/g, '-')}`
      if (profileId === legacyId) return true
    }

    return false
  }

  if (accountType === 'staff') {
    const { data } = await supabase
      .from('venue_team_members')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    return Boolean(data)
  }

  return false
}

export async function GET(request: NextRequest) {
  const endTiming = startRouteTiming('/api/accounts')

  try {
    const auth = await authenticateAccountsRequest(request)
    if (!auth) {
      endTiming({ metadata: { status: 401 } })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const accounts = await AccountManagementService.getUserAccounts(user.id, supabase)
    const activeSession = await AccountManagementService.getActiveSession(user.id, supabase)

    const durationMs = endTiming({
      userId: user.id,
      rowCount: accounts.length,
      queryCount: 2,
    })
    console.log('[Accounts API] GET success', {
      userId: user.id,
      accountCount: accounts.length,
      durationMs,
    })

    return NextResponse.json({
      accounts,
      activeSession,
      success: true,
    })
  } catch (error) {
    endTiming({ metadata: { error: true } })
    console.error('[Accounts API] Error fetching user accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAccountsRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'switch_account': {
        const { profileId, accountType } = data
        const success = await AccountManagementService.switchAccount(
          user.id,
          profileId,
          accountType
        )
        return NextResponse.json({ success })
      }

      case 'create_artist': {
        const artistId = await AccountManagementService.createArtistAccount(
          user.id,
          data,
          supabase
        )
        return NextResponse.json({ artistId, success: true })
      }

      case 'create_venue': {
        const venueId = await AccountManagementService.createVenueAccount(
          user.id,
          data,
          supabase
        )
        return NextResponse.json({ venueId, success: true })
      }

      case 'create_organizer': {
        const parsed = OrganizerAccountSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.errors.map((e) => e.message).join(', ') },
            { status: 400 }
          )
        }
        const organizerId = await AccountManagementService.createOrganizerAccount(
          user.id,
          {
            ...parsed.data,
            url_slug: parsed.data.url_slug || undefined,
            subtype: parsed.data.subtype || parsed.data.organization_type,
          },
          supabase,
          user
        )
        return NextResponse.json({ organizerId, success: true })
      }

      case 'request_admin':
        await AccountManagementService.requestAdminAccess(user.id, data)
        return NextResponse.json({ success: true })

      case 'link_existing': {
        const { existingProfileId, existingAccountType, permissions } = data
        if (!existingProfileId || !existingAccountType) {
          return NextResponse.json(
            { error: 'Profile ID and account type are required' },
            { status: 400 }
          )
        }

        const ownsProfile = await verifyProfileOwnership(
          supabase,
          user.id,
          existingProfileId,
          existingAccountType
        )
        if (!ownsProfile) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await AccountManagementService.linkExistingAccount(
          user.id,
          existingProfileId,
          existingAccountType,
          permissions
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Accounts API] Error handling account action:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateAccountsRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = auth
    const body = await request.json()
    const { profileId, accountType, permissions } = body

    await AccountManagementService.updateAccountPermissions(
      user.id,
      profileId,
      accountType,
      permissions
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating account permissions:', error)
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAccountsRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = auth
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
      user.id,
      profileId,
      accountType as ProfileType
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating account:', error)
    return NextResponse.json({ error: 'Failed to deactivate account' }, { status: 500 })
  }
}
