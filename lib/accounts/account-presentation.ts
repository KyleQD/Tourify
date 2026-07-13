import { normalizeAccountType } from '@/lib/accounts/account-types'

type AccountWithProfileData = {
  account_type: string
  profile_data?: Record<string, any> | null
}

export function getAccountTypeLabel(type: string): string {
  switch (normalizeAccountType(type)) {
    case 'artist':
      return 'Artist'
    case 'service':
      return 'Service Provider'
    case 'venue':
      return 'Venue'
    case 'organization':
      return 'Organization'
    default:
      return 'Personal'
  }
}

export function getAccountDisplayName(account: AccountWithProfileData | null | undefined): string {
  const profileData = account?.profile_data ?? {}

  switch (normalizeAccountType(account?.account_type || 'general')) {
    case 'artist':
    case 'service':
      return (
        profileData.artist_name ||
        profileData.stage_name ||
        profileData.display_name ||
        profileData.username ||
        'Artist Account'
      )
    case 'venue':
      return (
        profileData.venue_name ||
        profileData.name ||
        profileData.display_name ||
        profileData.username ||
        'Venue Account'
      )
    case 'organization':
      return (
        profileData.organization_name ||
        profileData.admin_name ||
        profileData.name ||
        profileData.display_name ||
        profileData.username ||
        'Organization'
      )
    default:
      return (
        profileData.full_name ||
        profileData.display_name ||
        profileData.username ||
        'Personal Account'
      )
  }
}

export function getAccountAvatarUrl(account: AccountWithProfileData | null | undefined): string | null {
  const profileData = account?.profile_data ?? {}

  return (
    profileData.avatar_url ||
    profileData.profile_image_url ||
    profileData.logo_url ||
    profileData.image_url ||
    null
  )
}

export function getAccountInitials(account: AccountWithProfileData | null | undefined): string {
  const name = getAccountDisplayName(account)
  return name.trim().charAt(0).toUpperCase() || 'A'
}
