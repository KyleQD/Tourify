/**
 * Maps signup UI values to profiles.account_type allowed by DB migrations
 * (general | artist | venue | organization).
 */
const ALLOWED_DB_ACCOUNT_TYPES = new Set(['general', 'artist', 'venue', 'organization'])

export function normalizeAccountTypeForProfile(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return 'general'
  const v = raw.trim().toLowerCase()
  if (ALLOWED_DB_ACCOUNT_TYPES.has(v)) return v
  if (v === 'industry') return 'organization'
  if (v === 'tour_manager') return 'general'
  return 'general'
}

export function isAllowedDbAccountType(value: string): boolean {
  return ALLOWED_DB_ACCOUNT_TYPES.has(value.trim().toLowerCase())
}
