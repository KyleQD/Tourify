/**
 * Pure helpers for admin / organizer access from a profiles row.
 * Keeps middleware, client admin check, and API auth aligned.
 */

export interface ProfileAdminGateInput {
  role?: string | null
  account_type?: string | null
  is_admin?: boolean | null
  account_settings?: {
    organizer_data?: { organization_name?: string | null } | null
    organizer_accounts?: unknown[] | null
  } | null
}

export function profileIndicatesAdminAccess(profile: ProfileAdminGateInput | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_admin) return true
  if (profile.role === 'admin') return true
  const t = profile.account_type
  if (t === 'admin' || t === 'organizer' || t === 'organization') return true
  const settings = profile.account_settings
  const orgName = settings?.organizer_data?.organization_name
  if (orgName && String(orgName).trim().length > 0) return true
  if (Array.isArray(settings?.organizer_accounts) && settings.organizer_accounts.length > 0) return true
  return false
}
