/**
 * Feature flags for marketplace consolidation.
 * Keep defaults off/safe so legacy surfaces remain unchanged until explicitly enabled.
 */
export function isMarketplaceMerchAnalyticsEnabled() {
  return process.env.NEXT_PUBLIC_MARKETPLACE_MERCH_ANALYTICS === "1"
}
