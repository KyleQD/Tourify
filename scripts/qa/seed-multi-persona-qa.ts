#!/usr/bin/env npx tsx
/**
 * Idempotent seed for multi-persona QA users A and B.
 *
 * Primary path: create auth users + personas via /api/accounts or service-role inserts.
 * Fallback: adopt existing multi-persona users (artist+venue[+org]) and set QA emails/passwords
 * when persona inserts fail (known remote bug: artist_profiles trigger references missing owner_user_id).
 *
 * Run: npm run qa:seed
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"
import { getQaCredentials, loadQaEnv, printEnvBlock } from "./load-qa-env"

loadQaEnv()

interface PersonaIds {
  generalId: string
  artistId?: string
  venueId?: string
  organizerId?: string
}

interface QaUserRecord {
  email: string
  userId: string
  personas: PersonaIds
  accountTypes: string[]
  mode: "created" | "adopted"
  notes?: string
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalized = email.toLowerCase()
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match
    if (data.users.length < perPage) return null
    page += 1
    if (page > 50) return null
  }
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  fullName: string,
  username: string,
) {
  const existing = await findUserByEmail(admin, email)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: fullName,
        username,
      },
    })
    if (error) throw error
    console.log(`✓ Auth ready ${email} (${existing.id})`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  })
  if (error) throw error
  if (!data.user?.id) throw new Error(`createUser returned no id for ${email}`)
  console.log(`✓ Created auth user ${email} (${data.user.id})`)
  return data.user.id
}

async function signIn(anon: SupabaseClient, email: string, password: string) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    throw new Error(`signIn failed for ${email}: ${error?.message || "no session"}`)
  }
  return data.session.access_token
}

async function apiJson(
  baseUrl: string,
  path: string,
  token: string,
  init?: RequestInit,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const text = await res.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  return { ok: res.ok, status: res.status, body }
}

async function listAccounts(baseUrl: string, token: string) {
  const result = await apiJson(baseUrl, "/api/accounts", token, { method: "GET" })
  if (!result.ok) {
    throw new Error(`GET /api/accounts failed (${result.status}): ${JSON.stringify(result.body)}`)
  }
  return (result.body?.accounts || []) as Array<{
    profile_id: string
    account_type: string
    display_name?: string
  }>
}

function findAccount(
  accounts: Array<{ profile_id: string; account_type: string }>,
  type: string,
) {
  if (type === "organization") {
    return accounts.find((a) => ["organization", "admin", "organizer"].includes(a.account_type))
  }
  return accounts.find((a) => a.account_type === type)
}

async function tryCreatePersonasViaApi(opts: {
  baseUrl: string
  token: string
  artistName: string
  venueName: string
  bandName?: string
  bandSlug?: string
}) {
  const accounts = await listAccounts(opts.baseUrl, opts.token)
  let artistId = findAccount(accounts, "artist")?.profile_id
  let venueId = findAccount(accounts, "venue")?.profile_id
  let organizerId = findAccount(accounts, "organization")?.profile_id

  if (!artistId) {
    const result = await apiJson(opts.baseUrl, "/api/accounts", opts.token, {
      method: "POST",
      body: JSON.stringify({
        action: "create_artist",
        artist_name: opts.artistName,
        bio: "QA multi-persona audit artist",
        genres: ["indie"],
      }),
    })
    if (!result.ok || !result.body?.artistId) {
      return {
        ok: false as const,
        error: `create_artist failed (${result.status}): ${JSON.stringify(result.body)}`,
      }
    }
    artistId = result.body.artistId
  }

  if (!venueId) {
    const result = await apiJson(opts.baseUrl, "/api/accounts", opts.token, {
      method: "POST",
      body: JSON.stringify({
        action: "create_venue",
        venue_name: opts.venueName,
        description: "QA multi-persona audit venue",
        capacity: 500,
      }),
    })
    if (!result.ok || !result.body?.venueId) {
      return {
        ok: false as const,
        error: `create_venue failed (${result.status}): ${JSON.stringify(result.body)}`,
      }
    }
    venueId = result.body.venueId
  }

  if (opts.bandName && opts.bandSlug && !organizerId) {
    const result = await apiJson(opts.baseUrl, "/api/accounts", opts.token, {
      method: "POST",
      body: JSON.stringify({
        action: "create_organizer",
        organization_name: opts.bandName,
        organization_type: "band",
        subtype: "band",
        description: "QA multi-persona audit band",
        url_slug: opts.bandSlug,
        is_public: true,
      }),
    })
    if (!result.ok || !result.body?.organizerId) {
      return {
        ok: false as const,
        error: `create_organizer failed (${result.status}): ${JSON.stringify(result.body)}`,
      }
    }
    organizerId = result.body.organizerId
  }

  return { ok: true as const, artistId, venueId, organizerId }
}

async function loadPersonaMap(admin: SupabaseClient) {
  const [{ data: artists }, { data: venues }, { data: orgs }] = await Promise.all([
    admin.from("artist_profiles").select("id, user_id, artist_name").limit(500),
    admin.from("venue_profiles").select("id, user_id, venue_name").limit(500),
    admin.from("organizer_accounts").select("id, user_id, organization_name, organization_type, subtype").limit(500),
  ])

  const byUser: Record<
    string,
    {
      userId: string
      artists: Array<{ id: string; artist_name: string }>
      venues: Array<{ id: string; venue_name: string }>
      orgs: Array<{ id: string; organization_name: string; organization_type: string | null; subtype: string | null }>
    }
  > = {}

  for (const a of artists || []) {
    byUser[a.user_id] ||= { userId: a.user_id, artists: [], venues: [], orgs: [] }
    byUser[a.user_id].artists.push(a)
  }
  for (const v of venues || []) {
    byUser[v.user_id] ||= { userId: v.user_id, artists: [], venues: [], orgs: [] }
    byUser[v.user_id].venues.push(v)
  }
  for (const o of orgs || []) {
    byUser[o.user_id] ||= { userId: o.user_id, artists: [], venues: [], orgs: [] }
    byUser[o.user_id].orgs.push(o)
  }

  return Object.values(byUser)
}

async function deleteAuthUserIfOrphan(admin: SupabaseClient, email: string) {
  const user = await findUserByEmail(admin, email)
  if (!user) return
  const map = await loadPersonaMap(admin)
  const personas = map.find((m) => m.userId === user.id)
  const hasPersonas = Boolean(personas && (personas.artists.length || personas.venues.length || personas.orgs.length))
  if (hasPersonas) {
    console.log(`  · keeping ${email} — already has personas`)
    return
  }
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) console.warn(`  · could not delete orphan ${email}: ${error.message}`)
  else console.log(`  · deleted orphan auth user ${email}`)
}

async function adoptUser(opts: {
  admin: SupabaseClient
  anon: SupabaseClient
  baseUrl: string
  targetUserId: string
  email: string
  password: string
  requireOrg: boolean
}): Promise<QaUserRecord> {
  const map = await loadPersonaMap(opts.admin)
  const personas = map.find((m) => m.userId === opts.targetUserId)
  if (!personas?.artists.length || !personas.venues.length) {
    throw new Error(`Adopt target ${opts.targetUserId} missing artist/venue personas`)
  }
  if (opts.requireOrg && !personas.orgs.length) {
    throw new Error(`Adopt target ${opts.targetUserId} missing organization persona`)
  }

  // Free the QA email if held by an orphan
  await deleteAuthUserIfOrphan(opts.admin, opts.email)

  const { data: userData, error: getErr } = await opts.admin.auth.admin.getUserById(opts.targetUserId)
  if (getErr || !userData.user) throw getErr || new Error("adopt target not found")

  const previousEmail = userData.user.email || ""
  const isAlreadyQaEmail = /@tourify\.test$/i.test(previousEmail)
  if (!isAlreadyQaEmail) {
    throw new Error(
      `Refusing to adopt non-QA account ${opts.targetUserId} (email ${previousEmail || "unknown"}). ` +
        "Create-path seeding must succeed, or adopt only existing @tourify.test users.",
    )
  }

  const { error: updErr } = await opts.admin.auth.admin.updateUserById(opts.targetUserId, {
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      ...(userData.user.user_metadata || {}),
      qa_adopted: true,
      qa_previous_email: previousEmail,
    },
  })
  if (updErr) throw updErr
  console.log(`✓ Adopted user ${opts.targetUserId} as ${opts.email} (was ${previousEmail})`)

  const token = await signIn(opts.anon, opts.email, opts.password)
  const accounts = await listAccounts(opts.baseUrl, token)
  const band =
    personas.orgs.find((o) => o.subtype === "band" || o.organization_type === "band") ||
    personas.orgs[0]

  return {
    email: opts.email,
    userId: opts.targetUserId,
    mode: "adopted",
    notes: `Adopted existing multi-persona user (previous email ${previousEmail}). Remote artist_profiles inserts currently fail: trigger references missing owner_user_id.`,
    personas: {
      generalId: opts.targetUserId,
      artistId: personas.artists[0].id,
      venueId: personas.venues[0].id,
      organizerId: band?.id,
    },
    accountTypes: accounts.map((a) => a.account_type),
  }
}

async function seedCreatedPath(opts: {
  admin: SupabaseClient
  anon: SupabaseClient
  baseUrl: string
  email: string
  password: string
  label: string
  artistName: string
  venueName: string
  bandName?: string
  bandSlug?: string
}): Promise<QaUserRecord | { failed: true; error: string; userId: string }> {
  console.log(`\n→ Seeding ${opts.label} (${opts.email}) via create path`)
  const userId = await ensureAuthUser(
    opts.admin,
    opts.email,
    opts.password,
    opts.label,
    opts.email.split("@")[0],
  )
  const token = await signIn(opts.anon, opts.email, opts.password)
  const created = await tryCreatePersonasViaApi({
    baseUrl: opts.baseUrl,
    token,
    artistName: opts.artistName,
    venueName: opts.venueName,
    bandName: opts.bandName,
    bandSlug: opts.bandSlug,
  })
  if (!created.ok) {
    return { failed: true, error: created.error, userId }
  }

  const accounts = await listAccounts(opts.baseUrl, token)
  return {
    email: opts.email,
    userId,
    mode: "created",
    personas: {
      generalId: userId,
      artistId: created.artistId,
      venueId: created.venueId,
      organizerId: created.organizerId,
    },
    accountTypes: accounts.map((a) => a.account_type),
  }
}

async function main() {
  const creds = getQaCredentials()
  printEnvBlock(creds)

  if (!creds.supabaseUrl || !creds.anonKey || !creds.serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SUPABASE_SERVICE_ROLE_KEY")
  }

  try {
    const health = await fetch(`${creds.baseUrl}/api/health`)
    if (!health.ok) console.warn(`⚠ ${creds.baseUrl}/api/health returned ${health.status}`)
    else console.log(`✓ App reachable at ${creds.baseUrl}`)
  } catch (error) {
    throw new Error(
      `App not reachable at ${creds.baseUrl}. Start with npm run dev. (${error instanceof Error ? error.message : error})`,
    )
  }

  const admin = createClient(creds.supabaseUrl, creds.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anon = createClient(creds.supabaseUrl, creds.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userA: QaUserRecord
  let userB: QaUserRecord

  const createdA = await seedCreatedPath({
    admin,
    anon,
    baseUrl: creds.baseUrl,
    email: creds.userA.email,
    password: creds.userA.password,
    label: "QA Multi A",
    artistName: "QA Artist A",
    venueName: "QA Venue A",
    bandName: "QA Band A",
    bandSlug: "qa-band-a",
  })

  if ("failed" in createdA) {
    console.warn(`⚠ Create path failed for A: ${createdA.error}`)
    console.warn("→ Falling back to adopt existing multi-persona users")
    const map = await loadPersonaMap(admin)
    const withOrg = map.find((m) => m.artists.length && m.venues.length && m.orgs.length)
    const withArtistVenue = map
      .filter((m) => m.artists.length && m.venues.length && m.userId !== withOrg?.userId)
      .sort((a, b) => b.venues.length - a.venues.length)[0]

    if (!withOrg || !withArtistVenue) {
      throw new Error(
        "Create path failed and no adopt candidates found (need one user with artist+venue+org and another with artist+venue).",
      )
    }

    userA = await adoptUser({
      admin,
      anon,
      baseUrl: creds.baseUrl,
      targetUserId: withOrg.userId,
      email: creds.userA.email,
      password: creds.userA.password,
      requireOrg: true,
    })
    userB = await adoptUser({
      admin,
      anon,
      baseUrl: creds.baseUrl,
      targetUserId: withArtistVenue.userId,
      email: creds.userB.email,
      password: creds.userB.password,
      requireOrg: false,
    })
  } else {
    userA = createdA
    const createdB = await seedCreatedPath({
      admin,
      anon,
      baseUrl: creds.baseUrl,
      email: creds.userB.email,
      password: creds.userB.password,
      label: "QA Multi B",
      artistName: "QA Artist B",
      venueName: "QA Venue B",
    })
    if ("failed" in createdB) {
      console.warn(`⚠ Create path failed for B: ${createdB.error}`)
      const map = await loadPersonaMap(admin)
      const candidate = map
        .filter((m) => m.artists.length && m.venues.length && m.userId !== userA.userId)
        .sort((a, b) => b.venues.length - a.venues.length)[0]
      if (!candidate) throw new Error("No adopt candidate for B")
      userB = await adoptUser({
        admin,
        anon,
        baseUrl: creds.baseUrl,
        targetUserId: candidate.userId,
        email: creds.userB.email,
        password: creds.userB.password,
        requireOrg: false,
      })
    } else {
      userB = createdB
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: creds.baseUrl,
    note: "Passwords are not stored here — see .env.local QA_USER_* vars",
    knownIssue:
      "If mode=adopted: remote artist_profiles INSERT fails with trigger error referencing missing owner_user_id. Fix that trigger before create-path seeding works.",
    users: { A: userA, B: userB },
  }

  const outDir = resolve(process.cwd(), "docs/audits")
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, "qa-accounts.json")
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n✓ Wrote ${outPath}`)
  console.log("Seed complete.")
  console.log(`  A: ${userA.email} (${userA.mode}) personas=${userA.accountTypes.join(",")}`)
  console.log(`  B: ${userB.email} (${userB.mode}) personas=${userB.accountTypes.join(",")}`)
}

main().catch((error) => {
  console.error("\n✗ Seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
