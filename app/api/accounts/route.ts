import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import { authenticateRequestWithExplicitJwt } from '@/lib/auth/mobile-request-auth'
import { verifyActingProfileAccess } from '@/lib/auth/acting-context'
import { AccountManagementService } from '@/lib/services/account-management.service'
import type { ProfileType } from '@/lib/services/account-management.service'
import { normalizeAccountType } from '@/lib/accounts/account-types'
import { startRouteTiming } from '@/lib/observability/route-timing'
import { OrganizerAccountSchema } from '@/lib/accounts/organization-account-schema'

async function authenticateAccountsRequest(request: NextRequest) {
  const [serviceAuthResult, userScopedAuth] = await Promise.all([
    ProductionAuthService.authenticateRequest(request),
    authenticateRequestWithExplicitJwt(request),
  ])

  if ('error' in serviceAuthResult && !userScopedAuth) return null

  if (userScopedAuth && !('error' in serviceAuthResult)) {
    if (serviceAuthResult.user?.id && serviceAuthResult.user.id !== userScopedAuth.user?.id) {
      console.error('[Accounts API] Auth user mismatch between service and user-scoped clients', {
        serviceUserId: serviceAuthResult.user.id,
        userScopedUserId: userScopedAuth.user?.id,
      })
      return null
    }
  }

  const user = userScopedAuth?.user || ('error' in serviceAuthResult ? null : serviceAuthResult.user)
  const supabase = 'error' in serviceAuthResult ? userScopedAuth?.supabase : serviceAuthResult.supabase

  if (!user || !supabase) return null
  return {
    user,
    supabase,
    userSupabase: userScopedAuth?.supabase || null,
    userAuthSource: userScopedAuth?.source || null,
  }
}

const switchAccountSchema = z.object({
  profileId: z.string().uuid(),
  accountType: z.enum(['general', 'artist', 'service', 'venue', 'organization', 'admin']),
})

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

    const { user, supabase, userSupabase, userAuthSource } = auth
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'switch_account': {
        const parsed = switchAccountSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid account selection' }, { status: 400 })
        }

        const { profileId, accountType } = parsed.data
        const access = await verifyActingProfileAccess(
          supabase,
          user.id,
          profileId,
          normalizeAccountType(accountType),
        )
        if (!access.owned) {
          return NextResponse.json({ error: 'Account access denied' }, { status: 403 })
        }

        const success = await AccountManagementService.switchAccount(
          user.id,
          profileId,
          accountType,
          userSupabase ?? supabase,
        )
        if (!success) {
          return NextResponse.json(
            { error: 'Account selection could not be persisted' },
            { status: 503 },
          )
        }
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
        if (!userSupabase) {
          console.warn('[Accounts API] create_organizer rejected: missing explicit JWT auth context', {
            userId: user.id,
            rpcAuthSource: 'rejected',
          })
          return NextResponse.json(
            { error: 'A verified user session is required to create an organization account' },
            { status: 401 }
          )
        }
        const parsed = OrganizerAccountSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.errors.map((e) => e.message).join(', ') },
            { status: 400 }
          )
        }
        console.info('[Accounts API] create_organizer auth context', {
          userId: user.id,
          rpcAuthSource: userAuthSource || 'unknown',
        })
        const organizerId = await AccountManagementService.createOrganizerAccount(
          user.id,
          {
            ...parsed.data,
            url_slug: parsed.data.url_slug || undefined,
            subtype: parsed.data.subtype || parsed.data.organization_type,
          },
          userSupabase,
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
    if (
      error instanceof Error &&
      (
        error.message.includes('User ID mismatch') ||
        error.message.includes('Authenticated RPC client required') ||
        error.message.includes('Authenticated user mismatch')
      )
    ) {
      return NextResponse.json(
        { error: 'A verified user session is required to create an organization account' },
        { status: 401 }
      )
    }
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
