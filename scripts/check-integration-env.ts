#!/usr/bin/env npx tsx
/**
 * Read-only checklist for integration-related env vars.
 * Exit 0 always; use before manual Stripe / Printful / social smoke runs.
 *
 * Loads `.env` then `.env.local` (override), matching how Next.js merges env for local runs.
 */
import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env') })
if (existsSync(resolve(process.cwd(), '.env.local'))) {
  loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true })
}

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

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
const legacyAnon = (process.env.SUPABASE_ANON_KEY || '').trim()

const supabaseUrlPresent = Boolean(supabaseUrl)
const supabaseUrlLooksValid =
  /^https:\/\/.+\.supabase\.co\/?$/i.test(supabaseUrl) ||
  /^https:\/\/127\.0\.0\.1:\d+/.test(supabaseUrl) ||
  /^https:\/\/localhost:\d+/.test(supabaseUrl)

const supabaseAnonOk =
  Boolean(supabaseAnon) &&
  supabaseAnon.length > 50 &&
  !supabaseAnon.includes('your_anon_key') &&
  !supabaseAnon.includes('your_supabase_anon_key')

flag('NEXT_PUBLIC_SUPABASE_URL', supabaseUrlPresent)
if (supabaseUrlPresent)
  flag('NEXT_PUBLIC_SUPABASE_URL (host shape)', supabaseUrlLooksValid)

flag('NEXT_PUBLIC_SUPABASE_ANON_KEY (browser; JWT, not placeholder)', supabaseAnonOk)
if (!supabaseAnon && legacyAnon)
  console.log(
    '  note: SUPABASE_ANON_KEY is set but Next.js needs NEXT_PUBLIC_SUPABASE_ANON_KEY for the client (copy the same anon JWT).',
  )
else if (!supabaseAnon)
  console.log('  note: add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env or .env.local (Supabase → Project Settings → API → anon public).')
else if (!supabaseAnonOk && supabaseAnon.length > 0 && supabaseAnon.length <= 50)
  console.log('  note: anon key looks truncated — paste the full `anon` `eyJ...` JWT from Supabase Project Settings → API.')

const supabaseClientReady =
  supabaseUrlPresent && supabaseUrlLooksValid && supabaseAnonOk
flag('Supabase client bundle (URL + NEXT_PUBLIC anon)', supabaseClientReady)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
flag('NEXT_PUBLIC_SITE_URL (set for demo/prod callbacks)', Boolean(siteUrl && siteUrl.startsWith('http')))

const serviceRole =
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('your_')
flag('SUPABASE_SERVICE_ROLE_KEY (for server admin checks)', serviceRole)

console.log('\nDone. Fix missing rows before live integration smoke tests.')
