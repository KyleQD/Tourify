import { beforeAll, describe, expect, it } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { ADMIN_FEATURE_FIXTURE } from "@/lib/testing/admin-feature-factory"
import { isRlsDatabaseConfigured } from "@/lib/testing/rls-persona-matrix"

const configured = isRlsDatabaseConfigured()
const apiUrl = process.env.SUPABASE_RLS_TEST_URL || process.env.API_URL || ""
const anonKey = process.env.SUPABASE_RLS_TEST_ANON_KEY || process.env.ANON_KEY || ""
const serviceKey = process.env.SUPABASE_RLS_TEST_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || ""
const password = "RlsFixture-Only-2026!"

async function authenticatedClient(email: string): Promise<SupabaseClient> {
  const client = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

describe.skipIf(!configured)("REL-101 live direct-client RLS", () => {
  let ownerA: SupabaseClient
  let ownerB: SupabaseClient
  let viewerA: SupabaseClient
  let outsider: SupabaseClient
  let anonymous: SupabaseClient
  let service: SupabaseClient

  beforeAll(async () => {
    service = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const users = [
      ADMIN_FEATURE_FIXTURE.users.orgAOwner,
      ADMIN_FEATURE_FIXTURE.users.orgBOwner,
      ADMIN_FEATURE_FIXTURE.users.orgAViewer,
      { userId: "78787878-7878-4787-8787-787878787878", email: "outsider@fixture.tourify.test" },
    ]
    for (const user of users) {
      const { error } = await service.auth.admin.createUser({
        id: user.userId,
        email: user.email,
        password,
        email_confirm: true,
      })
      if (error && !/already|registered|exists/i.test(error.message)) throw error
    }

    const { error: orgError } = await service.from("organizations").upsert([
      {
        id: ADMIN_FEATURE_FIXTURE.orgs.a.orgId,
        name: ADMIN_FEATURE_FIXTURE.orgs.a.name,
        slug: "rls-fixture-org-a",
        created_by: ADMIN_FEATURE_FIXTURE.users.orgAOwner.userId,
      },
      {
        id: ADMIN_FEATURE_FIXTURE.orgs.b.orgId,
        name: ADMIN_FEATURE_FIXTURE.orgs.b.name,
        slug: "rls-fixture-org-b",
        created_by: ADMIN_FEATURE_FIXTURE.users.orgBOwner.userId,
      },
    ])
    if (orgError) throw orgError

    const { error: memberError } = await service.from("org_members").upsert([
      { org_id: ADMIN_FEATURE_FIXTURE.orgs.a.orgId, user_id: ADMIN_FEATURE_FIXTURE.users.orgAOwner.userId, role: "owner" },
      { org_id: ADMIN_FEATURE_FIXTURE.orgs.a.orgId, user_id: ADMIN_FEATURE_FIXTURE.users.orgAViewer.userId, role: "viewer" },
      { org_id: ADMIN_FEATURE_FIXTURE.orgs.b.orgId, user_id: ADMIN_FEATURE_FIXTURE.users.orgBOwner.userId, role: "owner" },
    ])
    if (memberError) throw memberError

    const { error: tourError } = await service.from("tours").upsert([
      {
        id: ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId,
        org_id: ADMIN_FEATURE_FIXTURE.orgs.a.orgId,
        name: ADMIN_FEATURE_FIXTURE.tours.aMultiStop.name,
        slug: "rls-fixture-tour-a",
        created_by: ADMIN_FEATURE_FIXTURE.users.orgAOwner.userId,
      },
      {
        id: ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId,
        org_id: ADMIN_FEATURE_FIXTURE.orgs.b.orgId,
        name: ADMIN_FEATURE_FIXTURE.tours.bCollision.name,
        slug: "rls-fixture-tour-b",
        created_by: ADMIN_FEATURE_FIXTURE.users.orgBOwner.userId,
      },
    ])
    if (tourError) throw tourError

    ownerA = await authenticatedClient(ADMIN_FEATURE_FIXTURE.users.orgAOwner.email)
    ownerB = await authenticatedClient(ADMIN_FEATURE_FIXTURE.users.orgBOwner.email)
    viewerA = await authenticatedClient(ADMIN_FEATURE_FIXTURE.users.orgAViewer.email)
    outsider = await authenticatedClient("outsider@fixture.tourify.test")
    anonymous = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  })

  it("isolates organization rows for owners, viewer, outsider, and anonymous clients", async () => {
    for (const [client, allowedId, deniedId] of [
      [ownerA, ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId, ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId],
      [ownerB, ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId, ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId],
      [viewerA, ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId, ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId],
    ] as const) {
      const allowed = await client.from("tours").select("id").eq("id", allowedId)
      const denied = await client.from("tours").select("id").eq("id", deniedId)
      expect(allowed.error).toBeNull()
      expect(allowed.data).toHaveLength(1)
      expect(denied.data).toHaveLength(0)
    }
    expect((await outsider.from("tours").select("id")).data).toHaveLength(0)
    expect((await anonymous.from("tours").select("id")).data).toHaveLength(0)
    expect((await service.from("tours").select("id").in("id", [
      ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId,
      ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId,
    ])).data).toHaveLength(2)
  })

  it("allows owner writes and denies viewer writes", async () => {
    const ownerWrite = await ownerA
      .from("tours")
      .update({ description: "owner evidence" })
      .eq("id", ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId)
      .select("id")
    expect(ownerWrite.error).toBeNull()
    expect(ownerWrite.data).toHaveLength(1)

    const viewerWrite = await viewerA
      .from("tours")
      .update({ description: "viewer must not write" })
      .eq("id", ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId)
      .select("id")
    expect(viewerWrite.data || []).toHaveLength(0)
  })
})
