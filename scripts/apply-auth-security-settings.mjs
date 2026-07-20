#!/usr/bin/env node
/**
 * Apply hosted Auth security settings for Tourify Demo.
 *
 * Requires a Supabase personal access token (CLI keyring or
 * SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-auth-security-settings.mjs
 *
 * Notes:
 * - OTP expiry is always set to 1800s (< 1 hour advisor threshold).
 * - Leaked-password protection (HIBP) requires Pro+ and is attempted best-effort.
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'auqddrodjezjlypkzfpi'

async function resolveAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN

  try {
    const { execFileSync } = await import('node:child_process')
    const { Buffer } = await import('node:buffer')
    const raw = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], {
      encoding: 'utf8',
    }).trim()
    const prefix = 'go-keyring-base64:'
    if (raw.startsWith(prefix)) return Buffer.from(raw.slice(prefix.length), 'base64').toString('utf8')
    return raw
  } catch {
    return null
  }
}

async function patchAuth(accessToken, payload) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { ok: response.ok, status: response.status, data }
}

async function main() {
  const accessToken = await resolveAccessToken()
  if (!accessToken) {
    console.error('Missing SUPABASE_ACCESS_TOKEN (and no Supabase CLI keyring token found).')
    process.exit(1)
  }

  const otpResult = await patchAuth(accessToken, { mailer_otp_exp: 1800 })
  if (!otpResult.ok) {
    console.error(`OTP expiry update failed (${otpResult.status}):`, otpResult.data)
    process.exit(1)
  }

  const hibpResult = await patchAuth(accessToken, { password_hibp_enabled: true })
  console.log(JSON.stringify({
    mailer_otp_exp: otpResult.data?.mailer_otp_exp,
    password_hibp_enabled: hibpResult.ok ? hibpResult.data?.password_hibp_enabled : false,
    hibp_status: hibpResult.status,
    hibp_message: hibpResult.data?.message || null,
  }, null, 2))

  if (!hibpResult.ok) {
    console.error('HIBP enable skipped (likely plan entitlement). Enable in Dashboard when on Pro+.')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
