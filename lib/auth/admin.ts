import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

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
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return null
    }

    const user = session.user

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_admin, admin_level, role, profile_type, account_settings, full_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    // Method 1: Check if user has organizer data (new organizer account system)
    const organizerData = profile.account_settings?.organizer_data
    if (organizerData && organizerData.organization_name) {
      return {
        id: user.id,
        email: user.email || '',
        isAdmin: true,
        adminLevel: 'super',
        role: 'admin',
        profileType: 'organizer'
      }
    }

    // Method 2: Check if user has admin role directly
    if (profile.role === 'admin') {
      return {
        id: user.id,
        email: user.email || '',
        isAdmin: true,
        adminLevel: profile.admin_level || 'super',
        role: profile.role,
        profileType: profile.profile_type || 'admin'
      }
    }

    // Method 3: Check if user has admin account relationship
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
          profileType: 'admin'
        }
      }
    } catch {
    }

    // Method 4: Fallback to direct profile check for backwards compatibility
    if (profile.is_admin) {
      return {
        id: user.id,
        email: user.email || '',
        isAdmin: true,
        adminLevel: profile.admin_level || 'super',
        role: profile.role || 'admin',
        profileType: profile.profile_type || 'admin'
      }
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
        persistSession: false
      }
    })

    // Get user profile to check for organizer data first
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, admin_level, role, profile_type, account_settings')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      return null
    }

    // Check for organizer data first
    const organizerData = profile.account_settings?.organizer_data
    if (organizerData && organizerData.organization_name) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      return {
        id: userId,
        email: userData.user?.email || '',
        isAdmin: true,
        adminLevel: 'super',
        role: 'admin',
        profileType: 'organizer'
      }
    }

    // Check if user has admin role or is_admin flag
    if (profile.is_admin || profile.role === 'admin') {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      return {
        id: userId,
        email: userData.user?.email || '',
        isAdmin: true,
        adminLevel: profile.admin_level || 'super',
        role: profile.role || 'admin',
        profileType: profile.profile_type || 'admin'
      }
    }

    // Check for admin account relationship
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
          profileType: 'admin'
        }
      }
    } catch (relError) {
      // Continue to final check
    }

    return null
  } catch (error) {
    console.error('[Admin Auth Server] Error checking admin status:', error)
    return null
  }
}