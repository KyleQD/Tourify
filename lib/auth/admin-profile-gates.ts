/**
 * Pure helpers for admin / organizer access from a profiles row.
 * Keeps middleware, client admin check, and API auth aligned.
 *
 * SEC (ADM-M-003): ONLY privilege-bearing profile signals belong here.
 * account_type, account_settings.organizer_data and organizer_accounts arrays
 * are self-serviceable profile shapes and must never grant admin surface
 * access. Platform-admin trust is limited to is_admin / role='admin', both of
 * which are protected against self-elevation by the DB guard trigger in
 * migration 20260825122000 (profiles elevation guard).
 */

export interface ProfileAdminGateInput {
  role?: string | null
  is_admin?: boolean | null
}

export function profileIndicatesAdminAccess(
  profile: ProfileAdminGateInput | null | undefined,
): boolean {
  if (!profile) return false
  if (profile.is_admin === true) return true
  if (profile.role === 'admin') return true
  return false
}
