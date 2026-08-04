/**
 * Marketplace fee calculator — reads live fee rules from the database.
 *
 * Falls back to the hardcoded 10% default when no active rule exists.
 * Every order snapshots the applied rule at checkout time so historical
 * accounting is never affected by future rule changes.
 */

import 'server-only'

export interface FeeSnapshot {
  ruleId: string | null
  ruleVersion: number | null
  percentageFee: number
  fixedFeeCents: number
  minimumFeeCents: number | null
  maximumFeeCents: number | null
  description: string
}

export interface FeeBreakdown {
  subtotalCents: number
  platformFeeCents: number
  taxCents: number
  totalCents: number
  /** Snapshot stored on the order row */
  snapshot: FeeSnapshot
}

const FALLBACK_SNAPSHOT: FeeSnapshot = {
  ruleId: null,
  ruleVersion: null,
  percentageFee: 0.10,
  fixedFeeCents: 0,
  minimumFeeCents: null,
  maximumFeeCents: null,
  description: 'Default platform fee (10%)',
}

/**
 * Load the currently active fee rule for a given account type and listing kind.
 * Returns FALLBACK_SNAPSHOT when no active rule is found.
 */
export async function loadActiveFeeSnapshot(
  supabase: any,
  opts: { accountType?: string; listingKind?: string } = {}
): Promise<FeeSnapshot> {
  try {
    // Match most-specific rule first: account+kind > account-only > kind-only > 'all'
    const now = new Date().toISOString()
    const { data: rules } = await supabase
      .from('marketplace_fee_rules')
      .select('id, version, percentage_fee, fixed_fee_cents, minimum_fee_cents, maximum_fee_cents, scope, listing_kind_scope, description')
      .eq('is_active', true)
      .lte('effective_from', now)
      .or('effective_until.is.null,effective_until.gte.' + now)
      .order('effective_from', { ascending: false })

    if (!rules?.length) return FALLBACK_SNAPSHOT

    // Score rules: exact account+kind match wins
    const scored = (rules as any[]).map((r: any) => {
      let score = 0
      if (r.scope === opts.accountType || r.scope === 'all') score += r.scope !== 'all' ? 2 : 0
      if (r.listing_kind_scope === opts.listingKind || !r.listing_kind_scope) score += r.listing_kind_scope ? 2 : 0
      return { r, score }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0].r
    return {
      ruleId: best.id,
      ruleVersion: best.version,
      percentageFee: Number(best.percentage_fee ?? 0),
      fixedFeeCents: Number(best.fixed_fee_cents ?? 0),
      minimumFeeCents: best.minimum_fee_cents != null ? Number(best.minimum_fee_cents) : null,
      maximumFeeCents: best.maximum_fee_cents != null ? Number(best.maximum_fee_cents) : null,
      description: best.description ?? 'Platform fee',
    }
  } catch {
    return FALLBACK_SNAPSHOT
  }
}

/**
 * Calculate the full fee breakdown for a checkout.
 * All amounts are in minor units (cents) to avoid floating-point drift.
 */
export function calculateFeeBreakdown(
  subtotalCents: number,
  snapshot: FeeSnapshot,
  taxCents = 0
): FeeBreakdown {
  const safe = Math.max(0, Math.round(subtotalCents))

  // Apply percentage
  let feeCents = Math.round(safe * snapshot.percentageFee)
  // Add fixed amount
  feeCents += snapshot.fixedFeeCents

  // Apply min/max
  if (snapshot.minimumFeeCents != null) feeCents = Math.max(feeCents, snapshot.minimumFeeCents)
  if (snapshot.maximumFeeCents != null) feeCents = Math.min(feeCents, snapshot.maximumFeeCents)

  const safeTax = Math.max(0, Math.round(taxCents))
  const totalCents = safe + feeCents + safeTax

  return {
    subtotalCents: safe,
    platformFeeCents: feeCents,
    taxCents: safeTax,
    totalCents,
    snapshot,
  }
}

/** Convert cent-based breakdown to decimal amounts for Stripe (Stripe uses cents natively but our DB stores decimals) */
export function feeBreakdownToDecimal(b: FeeBreakdown) {
  return {
    subtotal: b.subtotalCents / 100,
    platformFee: b.platformFeeCents / 100,
    tax: b.taxCents / 100,
    total: b.totalCents / 100,
  }
}
