#!/usr/bin/env npx tsx
/**
 * Read-only checklist for integration-related env vars.
 * Exit 0 always; use before manual Stripe / Printful / social smoke runs.
 */
import 'dotenv/config'

function flag(name: string, ok: boolean) {
  const icon = ok ? 'ok' : 'missing'
  console.log(`[${icon}] ${name}`)
}

const stripe =
  Boolean(process.env.STRIPE_SECRET_KEY) &&
  !process.env.STRIPE_SECRET_KEY?.includes('your_')
flag('STRIPE_SECRET_KEY', stripe)

const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET)
flag('STRIPE_WEBHOOK_SECRET', stripeWebhook)

const supabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
flag('Supabase (NEXT_PUBLIC_*)', supabase)

const serviceRole =
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('your_')
flag('SUPABASE_SERVICE_ROLE_KEY (for server admin checks)', serviceRole)

console.log('\nDone. Fix missing rows before live integration smoke tests.')
