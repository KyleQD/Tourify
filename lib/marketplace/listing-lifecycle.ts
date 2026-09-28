/**
 * Listing Lifecycle — optimistic-version state transitions
 *
 * Encodes the allowed status transition graph and performs the DB update
 * with an optimistic-version check to prevent lost updates.
 *
 * Valid transitions:
 *   draft       → published | archived
 *   published   → paused | sold_out | archived
 *   paused      → published | archived
 *   sold_out    → published | paused | archived
 *   suspended   → (none — only admin/moderation can lift; not exposed here)
 *   archived    → draft  (re-activate as draft)
 *
 * `suspended` listings can only be unsuspended via the moderation system.
 */

import "server-only"

export type ListingStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'sold_out'
  | 'suspended'
  | 'archived'

export interface LifecycleTransitionResult {
  success: true
  newStatus: ListingStatus
  newVersion: number
}

export interface LifecycleTransitionError {
  success: false
  code:
    | 'listing_not_found'
    | 'forbidden'
    | 'invalid_transition'
    | 'optimistic_conflict'
    | 'seller_agreement_required'
    | 'stripe_connect_required'
    | 'db_error'
  message: string
}

export type LifecycleResult = LifecycleTransitionResult | LifecycleTransitionError

// ---------------------------------------------------------------------------
// Allowed transition graph
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['published', 'archived'],
  published: ['paused', 'sold_out', 'archived'],
  paused: ['published', 'archived'],
  sold_out: ['published', 'paused', 'archived'],
  suspended: [],              // moderation-only lift
  archived: ['draft'],        // re-activate
}

export function isTransitionAllowed(from: ListingStatus, to: ListingStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

export function getAllowedNextStatuses(current: ListingStatus): ListingStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

// ---------------------------------------------------------------------------
// Transition executor
// ---------------------------------------------------------------------------

interface TransitionParams {
  supabase: any
  listingId: string
  userId: string
  targetStatus: ListingStatus
  /** Client-supplied optimistic version — must match DB */
  expectedVersion: number
  /** Pre-checked: seller agreement accepted? */
  sellerAgreementAccepted: boolean
  /** Pre-checked: payout ready for paid listings? */
  payoutReady: boolean
}

/**
 * Execute a listing status transition with optimistic-version protection.
 * Caller is responsible for fetching and supplying the pre-checks.
 */
export async function executeListingTransition({
  supabase,
  listingId,
  userId,
  targetStatus,
  expectedVersion,
  sellerAgreementAccepted,
  payoutReady,
}: TransitionParams): Promise<LifecycleResult> {
  // 1. Load the listing
  const { data: listing, error: fetchError } = await supabase
    .from('marketplace_listings')
    .select('id, seller_user_id, status, optimistic_version, base_price, moderation_status')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchError || !listing) {
    return { success: false, code: 'listing_not_found', message: 'Listing not found.' }
  }

  // 2. Ownership
  if (listing.seller_user_id !== userId) {
    return { success: false, code: 'forbidden', message: 'Forbidden.' }
  }

  // 3. Validate transition
  const current = listing.status as ListingStatus
  if (!isTransitionAllowed(current, targetStatus)) {
    return {
      success: false,
      code: 'invalid_transition',
      message: `Cannot transition from '${current}' to '${targetStatus}'.`,
    }
  }

  // 4. Publish-specific guards
  if (targetStatus === 'published') {
    if (!sellerAgreementAccepted) {
      return {
        success: false,
        code: 'seller_agreement_required',
        message: 'Accept the Seller Agreement before publishing.',
      }
    }
    if ((listing.base_price ?? 0) > 0 && !payoutReady) {
      return {
        success: false,
        code: 'stripe_connect_required',
        message: 'Complete Stripe Connect before publishing paid listings.',
      }
    }
  }

  // 5. Optimistic version check + atomic update
  const nextVersion = expectedVersion + 1
  const { data: updated, error: updateError } = await supabase
    .from('marketplace_listings')
    .update({ status: targetStatus, optimistic_version: nextVersion })
    .eq('id', listingId)
    .eq('optimistic_version', expectedVersion)   // optimistic lock
    .select('id, status, optimistic_version')
    .maybeSingle()

  if (updateError) {
    return { success: false, code: 'db_error', message: 'Database error during transition.' }
  }

  if (!updated) {
    // Row existed but version didn't match — concurrent update
    return {
      success: false,
      code: 'optimistic_conflict',
      message: 'The listing was modified by another request. Please reload and retry.',
    }
  }

  return {
    success: true,
    newStatus: updated.status as ListingStatus,
    newVersion: updated.optimistic_version as number,
  }
}
