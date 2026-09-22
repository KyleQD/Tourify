/**
 * Canonical identity contract for Marketplace storefront ownership.
 *
 * Storefronts belong to the persona being acted as, not merely to the
 * authenticated user. The active schema still stores seller_user_id only;
 * this contract intentionally does not query or write the archive-only
 * seller_entity_* columns. The later additive schema reconciliation can map
 * this value to storage without changing authorization semantics.
 */

export type StorefrontEntityType = 'user' | 'artist' | 'venue' | 'organization'

export interface StorefrontOwnerContext {
  /** Authenticated user who owns or is delegated access to the persona. */
  userId: string
  /** Verified acting persona id; userId for a general account. */
  profileId: string
  /** Server-resolved account type from resolveActingContext. */
  accountType: string | null | undefined
}

export interface CanonicalStorefrontOwner {
  sellerEntityId: string
  sellerEntityType: StorefrontEntityType
  sellerUserId: string
}

/**
 * Convert a verified acting account into the stable storefront entity key.
 * `service` uses the artist persona storage family, matching acting-context
 * ownership verification, while organizations remain a distinct entity.
 */
export function getStorefrontEntityType(
  accountType: string | null | undefined
): StorefrontEntityType {
  const normalized = accountType?.trim().toLowerCase()

  if (normalized === 'venue') return 'venue'
  if (normalized === 'artist' || normalized === 'service') return 'artist'
  if (normalized === 'organization' || normalized === 'organizer' || normalized === 'admin') {
    return 'organization'
  }

  return 'user'
}

/** Build the canonical owner key from server-verified acting context only. */
export function getCanonicalStorefrontOwner(
  context: StorefrontOwnerContext
): CanonicalStorefrontOwner {
  return {
    sellerEntityId: context.profileId,
    sellerEntityType: getStorefrontEntityType(context.accountType),
    sellerUserId: context.userId,
  }
}

/** Compare a requested owner key without trusting a client-supplied account type. */
export function isCanonicalStorefrontOwner(
  owner: CanonicalStorefrontOwner,
  context: StorefrontOwnerContext
): boolean {
  const expected = getCanonicalStorefrontOwner(context)
  return (
    owner.sellerEntityId === expected.sellerEntityId &&
    owner.sellerEntityType === expected.sellerEntityType &&
    owner.sellerUserId === expected.sellerUserId
  )
}
