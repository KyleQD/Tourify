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
  is_admin?: boolean | null
  admin_level?: string | null
}

export function profileIndicatesAdminAccess(
  profile: ProfileAdminGateInput | null | undefined,
): boolean {
  if (!profile) return false
  if (profile.is_admin === true) return true
  const level = String(profile.admin_level || '').trim().toLowerCase()
  if (['support', 'moderator', 'super'].includes(level)) return true
  const numericLevel = Number(level)
  return Number.isFinite(numericLevel) && numericLevel >= 1
}
