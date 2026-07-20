export const PROFILE_IMAGES_UPDATED_EVENT = 'profile-images-updated'
export const PROFILE_UPDATED_STORAGE_KEY = 'profile-updated'

export interface ProfileImagesUpdatedDetail {
  avatarUrl?: string | null
  coverUrl?: string | null
  source?: string
}

export function notifyProfileImagesUpdated(detail: ProfileImagesUpdatedDetail = {}) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(PROFILE_UPDATED_STORAGE_KEY, Date.now().toString())
  } catch {
    // ignore storage failures (private mode, etc.)
  }

  window.dispatchEvent(
    new CustomEvent<ProfileImagesUpdatedDetail>(PROFILE_IMAGES_UPDATED_EVENT, {
      detail,
    })
  )
}

export function resolveProfileCoverUrl(profile: {
  cover_image?: string | null
  header_url?: string | null
  metadata?: { header_url?: string | null } | null
} | null | undefined): string | null {
  if (!profile) return null
  return (
    profile.cover_image ||
    profile.header_url ||
    profile.metadata?.header_url ||
    null
  )
}
