#!/usr/bin/env npx tsx
/**
 * Integration: Supabase signUp → DB rows (profiles, user_active_profiles, onboarding)
 * → admin email_confirm (simulates clicking the verification link) → signInWithPassword
 * → assert is_verified + RLS basics → delete test user (service role).
 *
 * Requires (from .env / .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npx tsx scripts/test-signup-verify-login-db.ts
 *
 * Optional env:
 *   SUPABASE_FETCH_TIMEOUT_MS — outbound fetch timeout (default 60000). Node’s default ~10s often fails on slow/VPN networks.
 *   SIGNUP_TEST_RETRY_WAIT_SEC — seconds to wait before retry when signup is rate limited.
 */
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadEnv } from "dotenv"
import chalk from "chalk"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

loadEnv({ path: resolve(process.cwd(), ".env") })
if (existsSync(resolve(process.cwd(), ".env.local"))) {
  loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

const password = "TestSignupDbFlow!9a"
/** RFC-valid; inbox not required because we confirm via admin API. */
const testEmail = `tourify.e2e.signup.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@gmail.com`

function logPass(msg: string) {
  console.log(chalk.green("✓"), msg)
}

function logFail(msg: string) {
  console.log(chalk.red("✗"), msg)
}

function logInfo(msg: string) {
  console.log(chalk.cyan("ℹ"), msg)
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

/** Longer than Node/undici’s default connect timeout so flaky Wi‑Fi / VPN can still reach Supabase. */
function createSupabaseFetch(): typeof fetch {
  const timeoutMs = Math.max(15_000, Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || "60000"))
  return (input, init) => {
    const deadline = AbortSignal.timeout(timeoutMs)
    const userSignal = init?.signal
    const signal =
      userSignal && typeof AbortSignal !== "undefined" && "any" in AbortSignal
        ? AbortSignal.any([deadline, userSignal])
        : userSignal ?? deadline
    return fetch(input, { ...init, signal })
  }
}

function explainFetchFailure(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const cause = err instanceof Error && "cause" in err ? (err as Error & { cause?: { code?: string } }).cause : undefined
  const code = cause && typeof cause === "object" && "code" in cause ? String((cause as { code?: string }).code) : ""
  if (
    msg.includes("fetch failed") ||
    code.includes("UND_ERR_CONNECT_TIMEOUT") ||
    msg.toLowerCase().includes("timeout")
  ) {
    return (
      `${msg}\n` +
      "  → Network: could not reach Supabase within the timeout. Try: different network/VPN off, DNS, firewall, or set SUPABASE_FETCH_TIMEOUT_MS=120000.\n" +
      "  → Confirm NEXT_PUBLIC_SUPABASE_URL matches your project (e.g. https://xxxxx.supabase.co)."
    )
  }
  return msg
}

async function waitForProfileVerified(
  admin: SupabaseClient,
  userId: string,
  maxMs: number,
): Promise<boolean> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const { data, error } = await admin.from("profiles").select("is_verified").eq("id", userId).maybeSingle()
    if (!error && data?.is_verified === true) return true
    await sleep(400)
  }
  return false
}

async function main() {
  console.log(chalk.bold("\nSignup → verify (admin) → login + DB checks\n"))

  if (!url || !anonKey || !serviceKey) {
    logInfo("Skip: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env or .env.local")
    process.exit(0)
  }

  const globalFetch = createSupabaseFetch()
  const clientOptions = {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: globalFetch },
  } as const

  const anon = createClient(url, anonKey, clientOptions)
  const admin = createClient(url, serviceKey, clientOptions)

  logInfo(`Test user: ${testEmail}`)

  // --- Sign up (public anon key) ---
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
  const emailRedirectTo = `${site}/auth/callback?type=signup&redirectTo=%2Flogin`

  let signUpData: Awaited<ReturnType<typeof anon.auth.signUp>>["data"]
  let signUpError: Awaited<ReturnType<typeof anon.auth.signUp>>["error"]

  const signUpOnce = () =>
    anon.auth.signUp({
      email: testEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: "E2E Signup User",
          username: `e2e_${Date.now().toString(36)}`,
          account_type: "general",
        },
      },
    })

  ;({ data: signUpData, error: signUpError } = await signUpOnce())
  const rateLimited =
    signUpError?.message?.toLowerCase().includes("rate limit") ||
    signUpError?.message?.toLowerCase().includes("too many")
  const retryWaitSec = Number(process.env.SIGNUP_TEST_RETRY_WAIT_SEC || "0")
  if (rateLimited && retryWaitSec > 0) {
    logInfo(`SignUp rate limited — waiting ${retryWaitSec}s (SIGNUP_TEST_RETRY_WAIT_SEC) then retry once…`)
    await sleep(retryWaitSec * 1000)
    ;({ data: signUpData, error: signUpError } = await signUpOnce())
  }
  if (
    signUpError?.message?.toLowerCase().includes("rate limit") ||
    signUpError?.message?.toLowerCase().includes("too many")
  ) {
    console.warn(
      chalk.yellow(
        "\nSKIP (exit 2): Supabase signup/email rate limit. Wait a few minutes or set SIGNUP_TEST_RETRY_WAIT_SEC=70 and rerun.\n",
      ),
    )
    process.exit(2)
  }

  if (signUpError) {
    const cause =
      "cause" in signUpError ? (signUpError as { cause?: unknown }).cause : undefined
    const detail =
      signUpError.message === "fetch failed" && cause != null
        ? `${signUpError.message}\n${explainFetchFailure(cause)}`
        : signUpError.message
    assert.fail(`signUp error: ${detail}`)
  }
  assert.ok(signUpData.user?.id, "signUp returned no user id")
  const userId = signUpData.user.id
  logPass(`signUp created auth user ${userId}`)

  const hadSessionImmediately = Boolean(signUpData.session)
  if (hadSessionImmediately) {
    logInfo("Project returned a session at signUp (email confirmations may be disabled).")
  } else {
    logInfo("No session at signUp (email confirmations enabled). Simulating verify via admin API.")
  }

  // --- DB: trigger-created rows (service role bypasses RLS) ---
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id,email,username,full_name,account_type,is_verified,tos_accepted_at")
    .eq("id", userId)
    .maybeSingle()

  assert.ok(!profileErr, `profiles select: ${profileErr?.message}`)
  assert.ok(profile, "profiles row missing after signUp (check on_auth_user_created trigger)")
  assert.equal(profile.email?.toLowerCase(), testEmail.toLowerCase())
  assert.ok(profile.username, "profiles.username should be set")
  if (!hadSessionImmediately)
    assert.equal(
      profile.is_verified,
      false,
      "is_verified should be false before email confirmation when confirmations are enabled",
    )
  else logInfo(`is_verified immediately after signUp: ${profile.is_verified} (confirmations may be off)`)
  logPass("profiles row exists with expected fields")

  const { data: activeRow, error: activeErr } = await admin
    .from("user_active_profiles")
    .select("user_id,active_profile_type")
    .eq("user_id", userId)
    .maybeSingle()

  assert.ok(!activeErr, `user_active_profiles: ${activeErr?.message}`)
  assert.ok(activeRow, "user_active_profiles row missing")
  assert.equal(activeRow.active_profile_type, "general")
  logPass("user_active_profiles row OK")

  const { data: onboardRow, error: onboardErr } = await admin
    .from("onboarding")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  assert.ok(!onboardErr, `onboarding: ${onboardErr?.message}`)
  assert.ok(
    onboardRow,
    "onboarding row missing — apply latest supabase migrations (see reconcile_onboarding_columns_for_signup_trigger) and verify handle_new_user trigger",
  )
  logPass("onboarding row OK")

  // --- Simulate email verification (service role only), when needed ---
  if (!hadSessionImmediately) {
    const { data: updated, error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    assert.ok(!confirmErr, `admin email_confirm: ${confirmErr?.message}`)
    assert.ok(updated.user?.email_confirmed_at, "email_confirmed_at should be set after email_confirm")

    const verified = await waitForProfileVerified(admin, userId, 8000)
    assert.ok(
      verified,
      "profiles.is_verified did not become true after confirmation (check on_auth_user_email_confirmed trigger)",
    )
    logPass("email_confirm → profiles.is_verified true (trigger)")
  } else {
    const verifiedNow = await waitForProfileVerified(admin, userId, 6000)
    if (!verifiedNow) {
      const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
      assert.ok(!confirmErr, `admin email_confirm (fallback): ${confirmErr?.message}`)
      assert.ok(await waitForProfileVerified(admin, userId, 6000), "is_verified should flip after confirm")
    }
    const { data: p2 } = await admin.from("profiles").select("is_verified").eq("id", userId).single()
    assert.equal(p2?.is_verified, true, "profiles.is_verified must be true before password sign-in")
    logPass("profiles.is_verified true (session-at-signup project)")
  }

  await anon.auth.signOut()

  // --- Sign in with password ---
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email: testEmail,
    password,
  })

  assert.ok(!signInErr, `signIn: ${signInErr?.message}`)
  assert.ok(signInData.session?.access_token, "no access_token on session")
  assert.ok(signInData.user?.id === userId, "signIn user id mismatch")
  logPass("signInWithPassword succeeded")

  // --- RLS: authenticated user can read own profile ---
  const { data: ownProfile, error: ownErr } = await anon.from("profiles").select("id,is_verified").eq("id", userId).maybeSingle()

  assert.ok(!ownErr, `own profile read: ${ownErr?.message}`)
  assert.ok(ownProfile?.id === userId, "RLS should allow reading own profile")
  logPass("RLS: session can read own profiles row")

  // --- RLS: should not read arbitrary other profile by id guess ---
  const fakeOtherId = "00000000-0000-4000-8000-000000000001"
  const { data: otherProfile, error: otherErr } = await anon
    .from("profiles")
    .select("id")
    .eq("id", fakeOtherId)
    .maybeSingle()

  assert.ok(!otherErr, `other profile query error: ${otherErr?.message}`)
  assert.equal(otherProfile, null, "RLS should not expose non-owned profile by random UUID")
  logPass("RLS: no access to unrelated profile id")

  await anon.auth.signOut()

  // --- Cleanup ---
  const { error: delErr } = await admin.auth.admin.deleteUser(userId)
  assert.ok(!delErr, `deleteUser: ${delErr?.message}`)
  logPass("cleanup: auth user deleted (cascades should remove public rows)")

  const { data: gone } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle()
  assert.equal(gone, null, "profiles row should be gone after auth user delete")
  logPass("cleanup: profiles row removed")

  console.log(chalk.green.bold("\nAll signup / verify / login / DB checks passed.\n"))
}

main().catch((e) => {
  const raw = e instanceof Error ? e.message : String(e)
  const extra = e instanceof Error && e.cause ? `\n${explainFetchFailure(e.cause)}` : ""
  console.error(chalk.red("\nFAILED:"), raw + extra)
  process.exit(1)
})
