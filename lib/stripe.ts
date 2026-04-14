import Stripe from 'stripe'

let _stripe: Stripe | null = null

const MISSING_KEY_MESSAGE =
  'STRIPE_SECRET_KEY is not set. Add it to .env / .env.local (local) or your host env (e.g. Vercel). Use the secret key from the same Stripe mode (test vs live) as your Dashboard and webhooks.'

/**
 * Preferred entry: single Stripe client for all API calls (V1 + V2 resources live on the same instance).
 * API version follows the SDK default (do not pin apiVersion here).
 */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY?.trim())
    throw new Error(MISSING_KEY_MESSAGE)

  if (!_stripe)
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  return _stripe
}

/** @deprecated Use `getStripeClient()` — kept for existing imports. */
export function getStripe(): Stripe {
  return getStripeClient()
}

/**
 * Returns a Stripe instance or null when the key is missing.
 * Useful for routes that degrade gracefully without payments.
 */
export function getStripeOrNull(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null
  return getStripeClient()
}
