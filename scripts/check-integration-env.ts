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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnon) &&
  supabaseAnon.length > 50 &&
  !supabaseAnon.includes('your_anon_key') &&
  !supabaseAnon.includes('your_supabase_anon_key')
flag('Supabase (NEXT_PUBLIC_*)', supabase)

const supabaseUrlLooksValid =
  /^https:\/\/.+\.supabase\.co\/?$/i.test(supabaseUrl.trim()) ||
  /^https:\/\/127\.0\.0\.1:\d+/.test(supabaseUrl.trim()) ||
  /^https:\/\/localhost:\d+/.test(supabaseUrl.trim())
flag('NEXT_PUBLIC_SUPABASE_URL (host shape)', supabaseUrlLooksValid)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
flag('NEXT_PUBLIC_SITE_URL (set for demo/prod callbacks)', Boolean(siteUrl && siteUrl.startsWith('http')))

const serviceRole =
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('your_')
flag('SUPABASE_SERVICE_ROLE_KEY (for server admin checks)', serviceRole)

console.log('\nDone. Fix missing rows before live integration smoke tests.')
