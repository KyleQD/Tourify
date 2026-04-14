import { getStripe } from '@/lib/stripe'

/**
 * @deprecated Use `getStripe()` from `@/lib/stripe` directly.
 * Kept for backward compatibility with existing marketplace imports.
 */
export function getMarketplaceStripe() {
  return getStripe()
}
