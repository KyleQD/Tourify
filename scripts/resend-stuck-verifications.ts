#!/usr/bin/env npx tsx
/**
 * Re-send signup confirmation emails to all unconfirmed auth users.
 *
 * Requires (from .env / .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   NEXT_PUBLIC_SITE_URL — default https://demo.tourify.live
 *   RESEND_DELAY_MS — delay between sends (default 1200)
 *   DRY_RUN=1 — list targets without sending
 *   LIMIT — max users to process
 *
 * Run AFTER custom SMTP is configured:
 *   npx tsx scripts/resend-stuck-verifications.ts
 *   DRY_RUN=1 npx tsx scripts/resend-stuck-verifications.ts
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
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://demo.tourify.live").replace(/\/$/, "")
const delayMs = Math.max(250, Number(process.env.RESEND_DELAY_MS || "1200"))
const isDryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"
const limit = process.env.LIMIT ? Number(process.env.LIMIT) : undefined

const emailRedirectTo = `${siteUrl}/auth/callback?type=signup&redirectTo=%2Flogin`

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function main() {
  console.log("\nRe-send stuck signup verification emails\n")

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const unconfirmed: Array<{ id: string; email: string; created_at: string }> = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)

    const users = data.users || []
    for (const user of users) {
      if (user.email_confirmed_at) continue
      if (!user.email) continue
      unconfirmed.push({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      })
    }

    if (users.length < perPage) break
    page += 1
  }

  unconfirmed.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const targets = typeof limit === "number" && Number.isFinite(limit)
    ? unconfirmed.slice(0, limit)
    : unconfirmed

  console.log(`Found ${unconfirmed.length} unconfirmed users`)
  console.log(`Processing ${targets.length}${isDryRun ? " (dry run)" : ""}`)
  console.log(`emailRedirectTo: ${emailRedirectTo}`)
  console.log(`delay: ${delayMs}ms\n`)

  let successCount = 0
  let failCount = 0

  for (const [index, user] of targets.entries()) {
    const label = `[${index + 1}/${targets.length}] ${user.email}`

    if (isDryRun) {
      console.log(`DRY  ${label}`)
      continue
    }

    const { error } = await admin.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo },
    })

    if (error) {
      failCount += 1
      console.error(`FAIL ${label}: ${error.message}`)
    } else {
      successCount += 1
      console.log(`OK   ${label}`)
    }

    if (index < targets.length - 1) await sleep(delayMs)
  }

  console.log("\nDone")
  if (!isDryRun) {
    console.log(`  success: ${successCount}`)
    console.log(`  failed:  ${failCount}`)
  }
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err)
  process.exit(1)
})
