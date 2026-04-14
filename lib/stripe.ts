import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error('STRIPE_SECRET_KEY is not set')

  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
    })
  }
  return _stripe
}

/**
 * Returns a Stripe instance or null when the key is missing.
 * Useful for routes that degrade gracefully without payments.
 */
export function getStripeOrNull(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return getStripe()
}
