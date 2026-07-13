import { normalizeAccountType } from '@/lib/accounts/account-types'
import {
  getArtistPublicProfilePath,
  getGeneralPublicProfilePath,
  getOrganizationPublicProfilePath,
  getVenuePublicProfilePath,
} from '@/lib/utils/public-profile-routes'

export interface AccountAuthor {
  id: string
  type: string
  name: string
  username: string | null
  avatarUrl: string | null
  isVerified: boolean
}

type AuthorRow = {
  user_id?: string | null
  posted_as_profile_id?: string | null
  posted_as_type?: string | null
  account_display_name?: string | null
  account_username?: string | null
  account_avatar_url?: string | null
  account_is_verified?: boolean | null
  profiles?: unknown
  resolved_author?: AccountAuthor | null
}

const ACCOUNT_ATTRIBUTION_FIELDS = [
  'posted_as_profile_id',
  'posted_as_type',
  'account_display_name',
  'account_username',
  'account_avatar_url',
  'account_is_verified',
]

export const GENERIC_ACCOUNT_AUTHOR_NAMES = new Set(['Community Member', 'Artist', 'Venue', 'Organization'])
export const GENERIC_ACCOUNT_AUTHOR_USERNAMES = new Set(['community-member', 'artist', 'venue', 'organization'])

export function accountAuthorNeedsRefresh(row: AuthorRow): boolean {
  const displayName = String(row.account_display_name || '').trim()
  const username = String(row.account_username || '').trim()

  return (
    !displayName ||
    GENERIC_ACCOUNT_AUTHOR_NAMES.has(displayName) ||
    !username ||
    GENERIC_ACCOUNT_AUTHOR_USERNAMES.has(username)
  )
}

export function isAccountAttributionSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const record = error as Record<string, unknown>
  const code = String(record.code || '')
  const message = String(record.message || '')
  const details = String(record.details || '')

  if (code === '42703' || code === 'PGRST204') {
    return ACCOUNT_ATTRIBUTION_FIELDS.some(field => message.includes(field) || details.includes(field))
  }

  return ACCOUNT_ATTRIBUTION_FIELDS.some(field =>
    message.includes(`'${field}'`) ||
    message.includes(`.${field}`) ||
    details.includes(`'${field}'`) ||
    details.includes(`.${field}`)
  )
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? (value as Record<string, any>) : null
}

export function getAccountAuthor(row: AuthorRow): AccountAuthor {
  if (row.resolved_author?.id) return row.resolved_author

  const profile = asRecord(firstRelated(row.profiles))
  const normalizedType = normalizeAccountType(row.posted_as_type || 'general')
  const name =
    row.account_display_name ||
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    'Community Member'
  const username = row.account_username || profile?.username || null

  return {
    id: row.posted_as_profile_id || profile?.id || row.user_id || '',
    type: normalizedType,
    name,
    username,
    avatarUrl: row.account_avatar_url || profile?.avatar_url || null,
    isVerified: Boolean(row.account_is_verified || profile?.is_verified || profile?.verified),
  }
}

export function getAccountAuthorPath(author: Pick<AccountAuthor, 'id' | 'type' | 'username'>): string | null {
  switch (normalizeAccountType(author.type)) {
    case 'artist':
    case 'service':
      return getArtistPublicProfilePath(author.username)
    case 'venue':
      return author.id ? getVenuePublicProfilePath({ id: author.id, url_slug: author.username }) : null
    case 'organization':
      return getOrganizationPublicProfilePath(author.username)
    default:
      return getGeneralPublicProfilePath({ username: author.username })
  }
}
