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

export interface StorefrontStorageCompatibilityIssue {
  code: 'persona_storefront_schema_not_ready'
  message: string
  owner: CanonicalStorefrontOwner
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

/**
 * Active storage can only represent general-user storefronts because it stores
 * `seller_user_id` without the canonical persona entity key. Non-user personas
 * must fail closed until the additive seller_entity_* schema lands.
 */
export function getStorefrontStorageCompatibilityIssue(
  context: StorefrontOwnerContext
): StorefrontStorageCompatibilityIssue | null {
  const owner = getCanonicalStorefrontOwner(context)
  if (owner.sellerEntityType === 'user' && owner.sellerEntityId === owner.sellerUserId) {
    return null
  }

  return {
    code: 'persona_storefront_schema_not_ready',
    message:
      'Per-persona marketplace storefront storage is not ready for this account type. Switch to a general account or wait for persona storefront schema reconciliation.',
    owner,
  }
}
