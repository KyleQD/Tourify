import 'server-only'

import { profileIndicatesAdminAccess } from '@/lib/auth/admin-profile-gates'

/**
 * Platform-admin assertion for /api/admin/** routes.
 *
 * This is the STRICT internal check (profiles.is_admin / admin_level >= 1).
 * Middleware's userHasAdminSurfaceAccess is intentionally broader (org
 * accounts reach admin-dashboard surfaces), so every privileged route MUST
 * also call this helper server-side. See AUDIT H3.
 */
export async function assertPlatformAdmin(
  supabase: any,
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('admin_level, is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return false
    return profileIndicatesAdminAccess(data)
  } catch {
    // Fail closed when the check cannot be evaluated.
    return false
  }
}
