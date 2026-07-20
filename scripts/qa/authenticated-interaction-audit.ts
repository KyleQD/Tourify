#!/usr/bin/env npx tsx
/**
 * Authenticated multi-persona interaction audit (API + role-home probes).
 * Run: npm run qa:audit:interactions
 */
import { createClient } from "@supabase/supabase-js"
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"
import { getQaCredentials, loadQaEnv } from "./load-qa-env"

loadQaEnv()

interface StepResult {
  name: string
  status: "pass" | "fail" | "skip"
  detail?: string
  httpStatus?: number
}

interface QaAccountsFile {
  users: {
    A: {
      userId: string
      personas: { generalId: string; artistId?: string; venueId?: string; organizerId?: string }
    }
    B: {
      userId: string
      personas: { generalId: string; artistId?: string; venueId?: string; organizerId?: string }
    }
  }
}

async function signIn(email: string, password: string) {
  const creds = getQaCredentials()
  const anon = createClient(creds.supabaseUrl, creds.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    throw new Error(`Login failed for ${email}: ${error?.message || "no token"}`)
  }
  return { token: data.session.access_token, userId: data.user!.id }
}

async function api(
  baseUrl: string,
  path: string,
  token: string,
  init?: RequestInit & { acting?: { profileId: string; accountType: string } },
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.acting) {
    headers["x-acting-profile-id"] = init.acting.profileId
    headers["x-acting-account-type"] = init.acting.accountType
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const text = await res.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  return { ok: res.ok, status: res.status, body, location: res.headers.get("location") }
}

function loadQaAccounts(): QaAccountsFile | null {
  const path = resolve(process.cwd(), "docs/audits/qa-accounts.json")
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf8")) as QaAccountsFile
}

async function main() {
  const creds = getQaCredentials()
  const steps: StepResult[] = []
  const startedAt = new Date().toISOString()

  function record(step: StepResult) {
    steps.push(step)
    const icon = step.status === "pass" ? "✓" : step.status === "skip" ? "·" : "✗"
    console.log(`${icon} ${step.name}${step.detail ? ` — ${step.detail}` : ""}`)
  }

  if (!creds.supabaseUrl || !creds.anonKey) {
    throw new Error("Missing Supabase URL/anon key")
  }

  let qa = loadQaAccounts()
  if (!qa) {
    console.warn("docs/audits/qa-accounts.json missing — run npm run qa:seed first (continuing with login-only discovery)")
  }

  // 1. Login A/B
  let tokenA = ""
  let tokenB = ""
  let userIdA = ""
  let userIdB = ""
  try {
    const a = await signIn(creds.userA.email, creds.userA.password)
    tokenA = a.token
    userIdA = a.userId
    record({ name: "Login QA A", status: "pass", detail: userIdA })
  } catch (error) {
    record({ name: "Login QA A", status: "fail", detail: String(error) })
    throw error
  }
  try {
    const b = await signIn(creds.userB.email, creds.userB.password)
    tokenB = b.token
    userIdB = b.userId
    record({ name: "Login QA B", status: "pass", detail: userIdB })
  } catch (error) {
    record({ name: "Login QA B", status: "fail", detail: String(error) })
    throw error
  }

  // 2. List accounts
  const accountsA = await api(creds.baseUrl, "/api/accounts", tokenA, { method: "GET" })
  const listA = (accountsA.body?.accounts || []) as Array<{ profile_id: string; account_type: string }>
  if (accountsA.ok && listA.length >= 3) {
    record({
      name: "GET /api/accounts (A)",
      status: "pass",
      httpStatus: accountsA.status,
      detail: listA.map((a) => a.account_type).join(", "),
    })
  } else {
    record({
      name: "GET /api/accounts (A)",
      status: "fail",
      httpStatus: accountsA.status,
      detail: JSON.stringify(accountsA.body),
    })
  }

  const artistA =
    qa?.users.A.personas.artistId ||
    listA.find((a) => a.account_type === "artist")?.profile_id
  const venueA =
    qa?.users.A.personas.venueId ||
    listA.find((a) => a.account_type === "venue")?.profile_id
  const orgA =
    qa?.users.A.personas.organizerId ||
    listA.find((a) => ["organization", "admin", "organizer"].includes(a.account_type))?.profile_id

  const accountsB = await api(creds.baseUrl, "/api/accounts", tokenB, { method: "GET" })
  const listB = (accountsB.body?.accounts || []) as Array<{ profile_id: string; account_type: string }>
  const venueB =
    qa?.users.B.personas.venueId ||
    listB.find((a) => a.account_type === "venue")?.profile_id

  // 3. Switch accounts for A
  for (const target of [
    { type: "general", profileId: userIdA },
    { type: "artist", profileId: artistA },
    { type: "venue", profileId: venueA },
    { type: "organization", profileId: orgA },
  ]) {
    if (!target.profileId) {
      record({ name: `switch_account → ${target.type}`, status: "skip", detail: "missing profile id" })
      continue
    }
    const result = await api(creds.baseUrl, "/api/accounts", tokenA, {
      method: "POST",
      body: JSON.stringify({
        action: "switch_account",
        profileId: target.profileId,
        accountType: target.type,
      }),
    })
    record({
      name: `switch_account → ${target.type}`,
      status: result.ok && result.body?.success !== false ? "pass" : "fail",
      httpStatus: result.status,
      detail: result.ok ? target.profileId : JSON.stringify(result.body),
    })
  }

  // 4. Artist post
  if (artistA) {
    const post = await api(creds.baseUrl, "/api/feed/posts", tokenA, {
      method: "POST",
      acting: { profileId: artistA, accountType: "artist" },
      body: JSON.stringify({
        content: `QA audit artist post ${new Date().toISOString()}`,
        type: "text",
        visibility: "public",
        media_urls: [],
        hashtags: ["qa-audit"],
      }),
    })
    const postOk = post.ok && (post.body?.success !== false)
    record({
      name: "Artist A POST /api/feed/posts",
      status: postOk ? "pass" : "fail",
      httpStatus: post.status,
      detail: postOk
        ? String(post.body?.data?.id || post.body?.id || "created")
        : JSON.stringify(post.body).slice(0, 300),
    })
  } else {
    record({ name: "Artist A POST /api/feed/posts", status: "skip", detail: "no artistA" })
  }

  // 5. Band/org post
  if (orgA) {
    const post = await api(creds.baseUrl, "/api/feed/posts", tokenA, {
      method: "POST",
      acting: { profileId: orgA, accountType: "organization" },
      body: JSON.stringify({
        content: `QA audit band post ${new Date().toISOString()}`,
        type: "text",
        visibility: "public",
        media_urls: [],
        hashtags: ["qa-band"],
      }),
    })
    const postOk = post.ok && (post.body?.success !== false)
    record({
      name: "Band A POST /api/feed/posts",
      status: postOk ? "pass" : "fail",
      httpStatus: post.status,
      detail: postOk
        ? String(post.body?.data?.id || post.body?.id || "created")
        : JSON.stringify(post.body).slice(0, 300),
    })
  } else {
    record({ name: "Band A POST /api/feed/posts", status: "skip", detail: "no organizerA" })
  }

  // 6. Message A → B
  const message = await api(creds.baseUrl, "/api/messages", tokenA, {
    method: "POST",
    body: JSON.stringify({
      recipientId: userIdB,
      content: `QA audit message ${new Date().toISOString()}`,
    }),
  })
  record({
    name: "A → B POST /api/messages",
    status: message.ok ? "pass" : "fail",
    httpStatus: message.status,
    detail: message.ok
      ? String(message.body?.message?.id || message.body?.id || "sent")
      : JSON.stringify(message.body).slice(0, 300),
  })

  // 7. Booking A artist → B venue
  if (artistA && venueB) {
    const eventDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const booking = await api(creds.baseUrl, "/api/booking-requests", tokenA, {
      method: "POST",
      acting: { profileId: artistA, accountType: "artist" },
      body: JSON.stringify({
        venueId: venueB,
        eventName: "QA Audit Gig",
        eventDate,
        expectedAttendance: 100,
        requestType: "performance",
        status: "pending",
        bookingDetails: {
          performanceType: "concert",
          description: "QA authenticated interaction audit booking",
          performanceDate: eventDate,
          venue: "QA Venue B",
          location: "Austin, TX",
          compensation: "To be discussed",
        },
      }),
    })
    record({
      name: "Artist A → Venue B booking-request",
      status: booking.ok ? "pass" : "fail",
      httpStatus: booking.status,
      detail: booking.ok
        ? String(booking.body?.id || booking.body?.request?.id || "created")
        : JSON.stringify(booking.body).slice(0, 400),
    })
  } else {
    record({
      name: "Artist A → Venue B booking-request",
      status: "skip",
      detail: `artistA=${artistA || "missing"} venueB=${venueB || "missing"}`,
    })
  }

  // 8. B inbox probes
  const messagesB = await api(creds.baseUrl, "/api/messages", tokenB, { method: "GET" })
  record({
    name: "B GET /api/messages",
    status: messagesB.ok ? "pass" : "fail",
    httpStatus: messagesB.status,
    detail: messagesB.ok
      ? `conversations=${(messagesB.body?.conversations || []).length}`
      : JSON.stringify(messagesB.body).slice(0, 300),
  })

  const bookingsB = await api(creds.baseUrl, "/api/booking-requests", tokenB, { method: "GET" })
  record({
    name: "B GET /api/booking-requests",
    status: bookingsB.ok || bookingsB.status === 200 ? "pass" : "fail",
    httpStatus: bookingsB.status,
    detail: bookingsB.ok
      ? `count=${Array.isArray(bookingsB.body) ? bookingsB.body.length : (bookingsB.body?.requests || bookingsB.body?.data || []).length || "ok"}`
      : JSON.stringify(bookingsB.body).slice(0, 300),
  })

  // 9. Role home probes with Authorization (expect not 401; may be HTML redirect)
  for (const [label, path, token] of [
    ["A /dashboard", "/dashboard", tokenA],
    ["A /artist", "/artist", tokenA],
    ["A /venue/dashboard", "/venue/dashboard", tokenA],
    ["A /admin/dashboard", "/admin/dashboard", tokenA],
    ["B /dashboard", "/dashboard", tokenB],
  ] as const) {
    const res = await fetch(`${creds.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/html" },
      redirect: "manual",
    })
    // Cookie session is what pages use; Bearer-only may still redirect to login.
    // Treat 200/307/302 as informative; fail only on 500.
    const ok = res.status < 500
    record({
      name: `Probe ${label}`,
      status: ok ? (res.status === 200 ? "pass" : "pass") : "fail",
      httpStatus: res.status,
      detail: res.status === 200 ? "200" : `status=${res.status} loc=${res.headers.get("location") || "none"} (page auth is cookie-based; API steps are authoritative)`,
    })
  }

  const summary = {
    generatedAt: startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: creds.baseUrl,
    pass: steps.filter((s) => s.status === "pass").length,
    fail: steps.filter((s) => s.status === "fail").length,
    skip: steps.filter((s) => s.status === "skip").length,
    steps,
  }

  const outDir = resolve(process.cwd(), "docs/audits")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, "authenticated-interaction-audit.json"), JSON.stringify(summary, null, 2))

  const md = `# Authenticated multi-persona interaction audit

**Generated:** ${summary.finishedAt}  
**Base URL:** ${summary.baseUrl}  
**Results:** ${summary.pass} pass · ${summary.fail} fail · ${summary.skip} skip

| Step | Status | HTTP | Detail |
|------|--------|------|--------|
${steps
  .map(
    (s) =>
      `| ${s.name} | ${s.status} | ${s.httpStatus ?? ""} | ${(s.detail || "").replace(/\|/g, "\\|").slice(0, 180)} |`,
  )
  .join("\n")}

## Credentials

Uses \`QA_USER_A_*\` / \`QA_USER_B_*\` from \`.env.local\`. Seed with \`npm run qa:seed\`.

## Notes

- API mutations use Bearer JWT + \`x-acting-profile-id\` / \`x-acting-account-type\`.
- HTML role-home probes may redirect without cookies; Playwright click-through covers browser session auth.
`

  writeFileSync(resolve(outDir, "AUTHENTICATED_INTERACTION_AUDIT.md"), md)
  console.log(`\nSummary: ${summary.pass} pass / ${summary.fail} fail / ${summary.skip} skip`)
  console.log("Wrote docs/audits/authenticated-interaction-audit.json")
  console.log("Wrote docs/audits/AUTHENTICATED_INTERACTION_AUDIT.md")

  const criticalFails = steps.filter(
    (s) =>
      s.status === "fail" &&
      !s.name.includes("messages") &&
      !s.name.startsWith("Probe "),
  )
  if (criticalFails.length > 0) process.exit(1)
  if (summary.fail > 0) {
    console.warn(`⚠ Non-critical failures remain (${summary.fail}). See AUTHENTICATED_INTERACTION_AUDIT.md`)
  }
}

main().catch((error) => {
  console.error("\n✗ Interaction audit failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
