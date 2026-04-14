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

/**
 * Check if the current user has admin access through multi-account system or organizer data
 * This is the main function that determines admin access
 */
export async function checkIsAdmin(): Promise<AdminUser | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) return null

    const user = session.user

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_admin, admin_level, role, profile_type, account_type, account_settings, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return null

    if (profileIndicatesAdminAccess(profile)) {
      return {
        id: user.id,
        email: user.email || '',
        isAdmin: true,
        adminLevel: (profile.admin_level as AdminUser['adminLevel']) || 'super',
        role: profile.role || 'admin',
        profileType: profile.profile_type || profile.account_type || 'admin',
      }
    }

    try {
      const { data: organizerRow, error: orgErr } = await supabase
        .from('organizer_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (organizerRow && !orgErr) {
        return {
          id: user.id,
          email: user.email || '',
          isAdmin: true,
          adminLevel: 'super',
          role: 'admin',
          profileType: 'organizer',
        }
      }
    } catch {
      // continue
    }

    try {
      const { data: adminRelationship, error: relError } = await supabase
        .from('account_relationships')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('account_type', 'admin')
        .single()

      if (adminRelationship && !relError) {
        return {
          id: user.id,
          email: user.email || '',
          isAdmin: true,
          adminLevel: 'super',
          role: 'admin',
          profileType: 'admin',
        }
      }
    } catch {
      // continue
    }

    return null
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

/**
 * Server-side admin check using service role
 */
export async function checkIsAdminServer(userId: string): Promise<AdminUser | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, admin_level, role, profile_type, account_type, account_settings')
      .eq('id', userId)
      .single()

    if (profileError || !profile) return null

    if (profileIndicatesAdminAccess(profile)) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      return {
        id: userId,
        email: userData.user?.email || '',
        isAdmin: true,
        adminLevel: (profile.admin_level as AdminUser['adminLevel']) || 'super',
        role: profile.role || 'admin',
        profileType: profile.profile_type || profile.account_type || 'admin',
      }
    }

    try {
      const { data: orgRow, error: orgErr } = await supabaseAdmin
        .from('organizer_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (orgRow && !orgErr) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
        return {
          id: userId,
          email: userData.user?.email || '',
          isAdmin: true,
          adminLevel: 'super',
          role: 'admin',
          profileType: 'organizer',
        }
      }
    } catch {
      // continue
    }

    try {
      const { data: adminRel, error: relError } = await supabaseAdmin
        .from('account_relationships')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('account_type', 'admin')
        .single()

      if (adminRel && !relError) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
        return {
          id: userId,
          email: userData.user?.email || '',
          isAdmin: true,
          adminLevel: 'super',
          role: 'admin',
          profileType: 'admin',
        }
      }
    } catch {
      // continue
    }

    return null
  } catch (error) {
    console.error('[Admin Auth Server] Error checking admin status:', error)
    return null
  }
}
