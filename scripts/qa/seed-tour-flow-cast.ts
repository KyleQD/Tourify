#!/usr/bin/env npx tsx
/**
 * Idempotent seed for the West Coast tour / hiring flow cast (7 accounts).
 *
 * - Artists 1–3: general + artist; Artist1 also creates Pacific Signal band
 * - Org: general + organization (West Coast Touring Co)
 * - Workers 1–3: general only
 *
 * Run: npm run qa:seed:flow
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"
import {
  getFlowCastCredentials,
  loadQaEnv,
  printFlowEnvBlock,
  type FlowCastMember,
} from "./load-qa-env"

loadQaEnv()

interface CastPersonaIds {
  generalId: string
  artistId?: string
  organizerId?: string
  opsOrgId?: string
}

interface CastUserRecord {
  key: string
  role: string
  email: string
  userId: string
  personas: CastPersonaIds
  accountTypes: string[]
  mode: "created" | "reused"
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
  member: FlowCastMember,
) {
  const existing = await findUserByEmail(admin, member.email)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: member.password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: member.fullName,
        username: member.username,
        qa_flow_role: member.role,
      },
    })
    if (error) throw error
    console.log(`✓ Auth ready ${member.email} (${existing.id})`)
    return { userId: existing.id, reused: true }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: member.email,
    password: member.password,
    email_confirm: true,
    user_metadata: {
      full_name: member.fullName,
      username: member.username,
      qa_flow_role: member.role,
    },
  })
  if (error) throw error
  if (!data.user?.id) throw new Error(`createUser returned no id for ${member.email}`)
  console.log(`✓ Created auth user ${member.email} (${data.user.id})`)
  return { userId: data.user.id, reused: false }
}

async function signIn(anon: SupabaseClient, email: string, password: string) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token)
    throw new Error(`signIn failed for ${email}: ${error?.message || "no session"}`)
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
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  return { ok: res.ok, status: res.status, body: body as Record<string, unknown> | null }
}

async function listAccounts(baseUrl: string, token: string) {
  const result = await apiJson(baseUrl, "/api/accounts", token, { method: "GET" })
  if (!result.ok)
    throw new Error(`GET /api/accounts failed (${result.status}): ${JSON.stringify(result.body)}`)
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
  if (type === "organization")
    return accounts.find((a) => ["organization", "admin", "organizer"].includes(a.account_type))
  return accounts.find((a) => a.account_type === type)
}

async function ensureArtistPersona(opts: {
  baseUrl: string
  token: string
  artistName: string
}) {
  const accounts = await listAccounts(opts.baseUrl, opts.token)
  const existing = findAccount(accounts, "artist")
  if (existing) return existing.profile_id

  const result = await apiJson(opts.baseUrl, "/api/accounts", opts.token, {
    method: "POST",
    body: JSON.stringify({
      action: "create_artist",
      artist_name: opts.artistName,
      bio: "West Coast tour flow QA artist",
      genres: ["indie", "rock"],
    }),
  })
  if (!result.ok || !result.body?.artistId)
    throw new Error(`create_artist failed (${result.status}): ${JSON.stringify(result.body)}`)
  return String(result.body.artistId)
}

async function ensureOrganizerPersona(opts: {
  baseUrl: string
  token: string
  organizationName: string
  organizationType: string
  subtype?: string
  urlSlug: string
  description: string
}) {
  const accounts = await listAccounts(opts.baseUrl, opts.token)
  const existing = findAccount(accounts, "organization")
  if (existing) return existing.profile_id

  const result = await apiJson(opts.baseUrl, "/api/accounts", opts.token, {
    method: "POST",
    body: JSON.stringify({
      action: "create_organizer",
      organization_name: opts.organizationName,
      organization_type: opts.organizationType,
      subtype: opts.subtype,
      description: opts.description,
      url_slug: opts.urlSlug,
      is_public: true,
    }),
  })
  if (!result.ok || !result.body?.organizerId)
    throw new Error(`create_organizer failed (${result.status}): ${JSON.stringify(result.body)}`)
  return String(result.body.organizerId)
}

async function linkBandRoster(opts: {
  admin: SupabaseClient
  organizerAccountId: string
  artistProfileId: string
  invitedBy: string
  role?: string
}) {
  const { error } = await opts.admin.from("organization_artist_members").upsert(
    {
      organizer_account_id: opts.organizerAccountId,
      artist_profile_id: opts.artistProfileId,
      role: opts.role || "member",
      status: "accepted",
      invited_by: opts.invitedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organizer_account_id,artist_profile_id" },
  )
  if (error) throw new Error(`roster upsert failed: ${error.message}`)
}

async function resolveOpsOrgId(admin: SupabaseClient, organizerAccountId: string) {
  const { data } = await admin
    .from("organizer_accounts")
    .select("id, organization_id, ops_organization_id")
    .eq("id", organizerAccountId)
    .maybeSingle()

  return (
    (data as { organization_id?: string; ops_organization_id?: string } | null)?.organization_id ||
    (data as { organization_id?: string; ops_organization_id?: string } | null)?.ops_organization_id ||
    null
  )
}

async function seedMember(opts: {
  admin: SupabaseClient
  anon: SupabaseClient
  baseUrl: string
  member: FlowCastMember
  cast: ReturnType<typeof getFlowCastCredentials>
  bandOrganizerId?: string
  bandOwnerUserId?: string
}): Promise<CastUserRecord> {
  console.log(`\n→ Seeding ${opts.member.key} (${opts.member.email})`)
  const { userId, reused } = await ensureAuthUser(opts.admin, opts.member)
  const token = await signIn(opts.anon, opts.member.email, opts.member.password)

  const personas: CastPersonaIds = { generalId: userId }
  const notes: string[] = []

  if (opts.member.role === "artist_band_owner" || opts.member.role === "artist_member") {
    personas.artistId = await ensureArtistPersona({
      baseUrl: opts.baseUrl,
      token,
      artistName: opts.member.fullName,
    })
    notes.push(`artist=${personas.artistId}`)
  }

  if (opts.member.role === "artist_band_owner") {
    personas.organizerId = await ensureOrganizerPersona({
      baseUrl: opts.baseUrl,
      token,
      organizationName: opts.cast.band.name,
      organizationType: "band",
      subtype: "band",
      urlSlug: opts.cast.band.slug,
      description: "Shared band for West Coast tour flow QA",
    })
    personas.opsOrgId = (await resolveOpsOrgId(opts.admin, personas.organizerId)) || undefined
    notes.push(`band=${personas.organizerId}`)

    // Owner on roster
    await linkBandRoster({
      admin: opts.admin,
      organizerAccountId: personas.organizerId,
      artistProfileId: personas.artistId!,
      invitedBy: userId,
      role: "founder",
    })
  }

  if (opts.member.role === "artist_member" && opts.bandOrganizerId && personas.artistId) {
    await linkBandRoster({
      admin: opts.admin,
      organizerAccountId: opts.bandOrganizerId,
      artistProfileId: personas.artistId,
      invitedBy: opts.bandOwnerUserId || userId,
      role: "member",
    })
    notes.push(`roster→${opts.bandOrganizerId}`)
  }

  if (opts.member.role === "org_admin") {
    personas.organizerId = await ensureOrganizerPersona({
      baseUrl: opts.baseUrl,
      token,
      organizationName: opts.cast.org.name,
      organizationType: opts.cast.org.type,
      subtype: "promoter",
      urlSlug: opts.cast.org.slug,
      description: "Management / touring company for West Coast flow QA",
    })
    personas.opsOrgId = (await resolveOpsOrgId(opts.admin, personas.organizerId)) || undefined
    notes.push(`org=${personas.organizerId}`)
  }

  const accounts = await listAccounts(opts.baseUrl, token)
  return {
    key: opts.member.key,
    role: opts.member.role,
    email: opts.member.email,
    userId,
    mode: reused ? "reused" : "created",
    personas,
    accountTypes: accounts.map((a) => a.account_type),
    notes: notes.join("; ") || undefined,
  }
}

async function main() {
  const cast = getFlowCastCredentials()
  printFlowEnvBlock(cast)

  if (!cast.supabaseUrl || !cast.anonKey || !cast.serviceRoleKey)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SUPABASE_SERVICE_ROLE_KEY")

  try {
    const health = await fetch(`${cast.baseUrl}/api/health`)
    if (!health.ok) console.warn(`⚠ ${cast.baseUrl}/api/health returned ${health.status}`)
    else console.log(`✓ App reachable at ${cast.baseUrl}`)
  } catch (error) {
    throw new Error(
      `App not reachable at ${cast.baseUrl}. Start with npm run dev. (${error instanceof Error ? error.message : error})`,
    )
  }

  const admin = createClient(cast.supabaseUrl, cast.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anon = createClient(cast.supabaseUrl, cast.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const byKey: Record<string, CastUserRecord> = {}

  const artist1Member = cast.members.find((m) => m.key === "artist1")!
  byKey.artist1 = await seedMember({
    admin,
    anon,
    baseUrl: cast.baseUrl,
    member: artist1Member,
    cast,
  })

  for (const key of ["artist2", "artist3"] as const) {
    const member = cast.members.find((m) => m.key === key)!
    byKey[key] = await seedMember({
      admin,
      anon,
      baseUrl: cast.baseUrl,
      member,
      cast,
      bandOrganizerId: byKey.artist1.personas.organizerId,
      bandOwnerUserId: byKey.artist1.userId,
    })
  }

  const orgMember = cast.members.find((m) => m.key === "org")!
  byKey.org = await seedMember({
    admin,
    anon,
    baseUrl: cast.baseUrl,
    member: orgMember,
    cast,
  })

  for (const key of ["worker1", "worker2", "worker3"] as const) {
    const member = cast.members.find((m) => m.key === key)!
    byKey[key] = await seedMember({
      admin,
      anon,
      baseUrl: cast.baseUrl,
      member,
      cast,
    })
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: cast.baseUrl,
    note: "Passwords are not stored here — see .env.local QA_FLOW_* vars",
    band: {
      name: cast.band.name,
      slug: cast.band.slug,
      organizerAccountId: byKey.artist1.personas.organizerId,
      opsOrgId: byKey.artist1.personas.opsOrgId,
    },
    organization: {
      name: cast.org.name,
      slug: cast.org.slug,
      organizerAccountId: byKey.org.personas.organizerId,
      opsOrgId: byKey.org.personas.opsOrgId,
    },
    tour: { name: cast.tour.name },
    users: byKey,
  }

  const outDir = resolve(process.cwd(), "docs/audits")
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, "qa-flow-accounts.json")
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n✓ Wrote ${outPath}`)
  console.log("Flow cast seed complete.")
  for (const key of Object.keys(byKey)) {
    const u = byKey[key]
    console.log(`  ${key}: ${u.email} (${u.mode}) types=${u.accountTypes.join(",") || "general"}`)
  }
}

main().catch((error) => {
  console.error("\n✗ Flow cast seed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
