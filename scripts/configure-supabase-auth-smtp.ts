#!/usr/bin/env npx tsx
/**
 * Configure Supabase Auth custom SMTP (Resend) + raise email rate limits.
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *                            (or logged-in Supabase CLI keychain token)
 *   RESEND_API_KEY         — Resend API key (re_...)
 *   RESEND_FROM_EMAIL      — verified sender, e.g. noreply@tourify.live
 *
 * Optional:
 *   SUPABASE_PROJECT_REF   — default: auqddrodjezjlypkzfpi (Tourify Demo)
 *   SMTP_SENDER_NAME       — default: Tourify
 *   RATE_LIMIT_EMAIL_SENT  — default: 30
 *
 * Run:
 *   RESEND_API_KEY=re_xxx RESEND_FROM_EMAIL=noreply@tourify.live \
 *     npx tsx scripts/configure-supabase-auth-smtp.ts
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"
import { config as loadEnv } from "dotenv"

loadEnv({ path: resolve(process.cwd(), ".env") })
if (existsSync(resolve(process.cwd(), ".env.local"))) {
  loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const PROJECT_REF = (process.env.SUPABASE_PROJECT_REF || "auqddrodjezjlypkzfpi").trim()
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim()
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || process.env.SMTP_ADMIN_EMAIL || "").trim()
const SMTP_SENDER_NAME = (process.env.SMTP_SENDER_NAME || "Tourify").trim()
const RATE_LIMIT_EMAIL_SENT = Number(process.env.RATE_LIMIT_EMAIL_SENT || "30")
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://demo.tourify.live").replace(/\/$/, "")

function resolveAccessToken(): string {
  const fromEnv = (process.env.SUPABASE_ACCESS_TOKEN || "").trim()
  if (fromEnv) return fromEnv

  try {
    const raw = execSync('security find-generic-password -s "Supabase CLI" -w', {
      encoding: "utf8",
    }).trim()
    if (raw.startsWith("go-keyring-base64:")) {
      return Buffer.from(raw.slice("go-keyring-base64:".length), "base64").toString("utf8")
    }
    return raw
  } catch {
    return ""
  }
}

async function managementFetch(path: string, init?: RequestInit) {
  const token = resolveAccessToken()
  if (!token) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens or run `supabase login`."
    )
  }

  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!response.ok) {
    throw new Error(
      `Management API ${response.status}: ${typeof body === "object" ? JSON.stringify(body) : text}`
    )
  }

  return body as Record<string, unknown>
}

function buildAllowList(existing: string | null | undefined): string {
  const current = new Set(
    (existing || "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
  )

  const needed = [
    SITE_URL,
    `${SITE_URL}/**`,
    `${SITE_URL}/auth/callback`,
    `${SITE_URL}/auth/callback/**`,
    `${SITE_URL}/auth/confirm`,
    `${SITE_URL}/auth/confirm/**`,
    `${SITE_URL}/reset-password`,
    `${SITE_URL}/reset-password/**`,
    "http://localhost:3000",
    "http://localhost:3000/**",
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/auth/callback/**",
    "http://localhost:3000/auth/confirm",
    "http://localhost:3000/auth/confirm/**",
    "http://localhost:3000/reset-password",
    "http://localhost:3000/reset-password/**",
  ]

  for (const url of needed) current.add(url)
  return Array.from(current).sort().join(",")
}

async function main() {
  console.log("\nConfigure Supabase Auth SMTP (Resend)\n")

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY (Resend API key starting with re_).")
    console.error("Create one at https://resend.com/api-keys")
    process.exit(1)
  }

  if (!RESEND_FROM_EMAIL) {
    console.error("Missing RESEND_FROM_EMAIL (verified sender, e.g. noreply@tourify.live).")
    console.error("Verify your domain at https://resend.com/domains first.")
    process.exit(1)
  }

  console.log(`Project: ${PROJECT_REF}`)
  console.log(`Site URL: ${SITE_URL}`)
  console.log(`Sender: ${SMTP_SENDER_NAME} <${RESEND_FROM_EMAIL}>`)
  console.log(`Rate limit: ${RATE_LIMIT_EMAIL_SENT} emails/hour`)

  const current = await managementFetch(`/projects/${PROJECT_REF}/config/auth`)
  const uriAllowList = buildAllowList(
    typeof current.uri_allow_list === "string" ? current.uri_allow_list : ""
  )

  const payload = {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    site_url: SITE_URL,
    uri_allow_list: uriAllowList,
    smtp_admin_email: RESEND_FROM_EMAIL,
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND_API_KEY,
    smtp_sender_name: SMTP_SENDER_NAME,
    rate_limit_email_sent: RATE_LIMIT_EMAIL_SENT,
  }

  const updated = await managementFetch(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

  console.log("\n✓ SMTP configured")
  console.log(`  smtp_host: ${updated.smtp_host}`)
  console.log(`  smtp_admin_email: ${updated.smtp_admin_email}`)
  console.log(`  smtp_sender_name: ${updated.smtp_sender_name}`)
  console.log(`  rate_limit_email_sent: ${updated.rate_limit_email_sent}`)
  console.log(`  site_url: ${updated.site_url}`)
  console.log("\nNext:")
  console.log("  1. Confirm tourify.live (or your sender domain) is verified in Resend")
  console.log("  2. Sign up a test user and confirm the email arrives")
  console.log("  3. Run: npx tsx scripts/resend-stuck-verifications.ts")
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err)
  process.exit(1)
})
