#!/usr/bin/env npx tsx
/**
 * Smoke-test auth email delivery after custom SMTP is configured.
 *
 * Creates a throwaway signup, checks confirmation_sent_at, then deletes the user.
 * Does NOT click the email link — check the inbox (or Resend dashboard) for delivery.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   NEXT_PUBLIC_SITE_URL (default https://demo.tourify.live)
 *   TEST_INBOX — if set, uses this address instead of a disposable @gmail.com
 *
 * Run:
 *   npx tsx scripts/test-auth-email-delivery.ts
 *   TEST_INBOX=you@example.com npx tsx scripts/test-auth-email-delivery.ts
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"

loadEnv({ path: resolve(process.cwd(), ".env") })
if (existsSync(resolve(process.cwd(), ".env.local"))) {
  loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://demo.tourify.live").replace(/\/$/, "")
const testInbox = (process.env.TEST_INBOX || "").trim()
const password = "AuthEmailDelivery!9a"

async function main() {
  console.log("\nAuth email delivery smoke test\n")

  if (!url || !anonKey || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const email =
    testInbox ||
    `tourify.smtp.test.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@gmail.com`
  const emailRedirectTo = `${siteUrl}/auth/callback?type=signup&redirectTo=%2Flogin`

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Email: ${email}`)
  console.log(`Redirect: ${emailRedirectTo}`)

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: "SMTP Delivery Test",
        username: `smtp_test_${Date.now().toString(36)}`,
        account_type: "general",
      },
    },
  })

  if (error) {
    console.error(`✗ signUp failed: ${error.message}`)
    process.exit(1)
  }

  const userId = data.user?.id
  if (!userId) {
    console.error("✗ signUp returned no user id")
    process.exit(1)
  }

  console.log(`✓ user created: ${userId}`)

  const { data: listed, error: getError } = await admin.auth.admin.getUserById(userId)
  if (getError) {
    console.error(`✗ getUserById failed: ${getError.message}`)
  } else {
    const sentAt = listed.user.confirmation_sent_at
    const confirmedAt = listed.user.email_confirmed_at
    console.log(`  confirmation_sent_at: ${sentAt || "(null)"}`)
    console.log(`  email_confirmed_at: ${confirmedAt || "(null)"}`)
    if (sentAt) console.log("✓ Auth queued a confirmation email")
    else console.error("✗ Auth did not set confirmation_sent_at")
  }

  if (!testInbox) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) console.error(`✗ cleanup deleteUser failed: ${deleteError.message}`)
    else console.log("✓ cleaned up test user")
  } else {
    console.log("\nTEST_INBOX set — left user in place so you can click the email link.")
    console.log("After confirming, delete the user from the Supabase Auth dashboard if needed.")
  }

  console.log("\nAlso verify delivery in the Resend dashboard (Emails).")
  console.log("If nothing arrives, custom SMTP is not configured or the domain is unverified.")
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err)
  process.exit(1)
})
