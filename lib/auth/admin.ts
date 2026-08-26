import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { profileIndicatesAdminAccess } from '@/lib/auth/admin-profile-gates'

export interface AdminUser {
  id: string
  email: string
  isAdmin: boolean
  adminLevel?: 'super' | 'moderator' | 'support'
  role?: string
  profileType?: string
}

interface AdminSurfaceMatch {
  hasAccess: boolean
  role?: string
  profileType?: string
  adminLevel?: AdminUser['adminLevel']
}

/**
 * Shared surface gate used by middleware and API admin checks.
 *
 * SEC (ADM-M-003): access derives exclusively from verifiable grants —
 *   1. org_members row with an admin-capable role (owner/admin/tour_manager/production) → super
 *   2. direct organization creator (owner invariant, mirrors resolveActingAdminContext) → super
 *   3. confirmed tour_team_members collaborator → support
 *   4. platform-admin flag on profiles (is_admin / role='admin'), DB-guarded
 *      against self-elevation by migration 20260825122000 → super
 *
 * Self-serviceable profile shapes (account_type, organizer_data,
 * organizer_accounts rows, account_relationships owner rows) are NOT grants.
 */
export async function resolveAdminSurfaceAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
  userId: string
): Promise<AdminSurfaceMatch> {
  try {
    const [
      profileResult,
      orgMemberResult,
      orgCreatorResult,
      tourCollaboratorResult,
    ] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('role, is_admin, admin_level')
        .eq('id', userId)
        .maybeSingle(),
      supabaseClient
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin', 'tour_manager', 'production'])
        .limit(1)
        .maybeSingle(),
      supabaseClient
        .from('organizations')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle(),
      supabaseClient
        .from('tour_team_members')
        .select('tour_id, role')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileResult?.data
    const profileError = profileResult?.error
    if (!profileError && profileIndicatesAdminAccess(profile as Parameters<typeof profileIndicatesAdminAccess>[0])) {
      return {
        hasAccess: true,
        role: profile?.role || 'admin',
        profileType: 'platform_admin',
        adminLevel: (profile?.admin_level as AdminUser['adminLevel']) || 'super',
      }
    }

    if (orgMemberResult?.data?.org_id && !orgMemberResult?.error) {
      return {
        hasAccess: true,
        role: String(orgMemberResult.data.role || 'admin'),
        profileType: 'organization',
        adminLevel: 'super',
      }
    }

    if (orgCreatorResult?.data?.id && !orgCreatorResult?.error) {
      return {
        hasAccess: true,
        role: 'owner',
        profileType: 'organization',
        adminLevel: 'super',
      }
    }

    if (tourCollaboratorResult?.data?.tour_id && !tourCollaboratorResult?.error) {
      return {
        hasAccess: true,
        role: String(tourCollaboratorResult.data.role || 'admin'),
        profileType: 'tour_collaborator',
        adminLevel: 'support',
      }
    }

    return { hasAccess: false }
  } catch {
    return { hasAccess: false }
  }
}

/**
 * Server/middleware check: profile row OR organizer_accounts / account_relationships.
 * Aligns with checkIsAdmin() — middleware must not only inspect profiles.account_settings.
 */
export async function userHasAdminSurfaceAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
  userId: string
): Promise<boolean> {
  const match = await resolveAdminSurfaceAccess(supabaseClient, userId)
  return match.hasAccess
}

/**
 * Check if the current user has admin access through multi-account system or organizer data
 * This is the main function that determines admin access
 */
export async function checkIsAdmin(): Promise<AdminUser | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) return null

    const match = await resolveAdminSurfaceAccess(supabase, user.id)
    if (!match.hasAccess) return null

    return {
      id: user.id,
      email: user.email || '',
      isAdmin: true,
      adminLevel: match.adminLevel || 'super',
      role: match.role || 'admin',
      profileType: match.profileType || 'admin',
    }
  } catch (error) {
    console.error('[Admin Auth] Error checking admin status:', error)
    return null
  }
}

/**
 * Check if user has specific admin level or higher
 */
export function hasAdminLevel(user: AdminUser, requiredLevel: 'support' | 'moderator' | 'super'): boolean {
  if (!user.isAdmin) return false

  const levels = ['support', 'moderator', 'super']
  const userLevelIndex = levels.indexOf(user.adminLevel || 'support')
  const requiredLevelIndex = levels.indexOf(requiredLevel)

  return userLevelIndex >= requiredLevelIndex
}

function createServiceAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey)
    throw new Error('Missing Supabase environment variables')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function resolveAdminEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string
): Promise<string> {
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    return userData?.user?.email || ''
  } catch {
    return ''
  }
}

/**
 * Server-side admin check using service role.
 * Access decision never depends on getUserById succeeding.
 */
export async function checkIsAdminServer(userId: string): Promise<AdminUser | null> {
  try {
    const supabaseAdmin = createServiceAdminClient()
    const match = await resolveAdminSurfaceAccess(supabaseAdmin, userId)
    if (!match.hasAccess) return null

    const email = await resolveAdminEmail(supabaseAdmin, userId)

    return {
      id: userId,
      email,
      isAdmin: true,
      adminLevel: match.adminLevel || 'super',
      role: match.role || 'admin',
      profileType: match.profileType || 'admin',
    }
  } catch (error) {
    console.error('[Admin Auth Server] Error checking admin status:', error)
    return null
  }
}
