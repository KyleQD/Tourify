/**
 * Test fixtures: seed a test org, users, and a minimal event.
 * Run via: npx ts-node tests/fixtures/seed.ts
 */
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001"

export async function seedTestData() {
  // Upsert test organizer user via auth admin API (service role)
  const { data: adminUser } = await supabase.auth.admin.createUser({
    email: "test-organizer@tourify.test",
    password: "TestPass123!",
    email_confirm: true,
  })

  const { data: artistUser } = await supabase.auth.admin.createUser({
    email: "test-artist@tourify.test",
    password: "TestPass123!",
    email_confirm: true,
  })

  return {
    adminUserId: adminUser?.user?.id,
    artistUserId: artistUser?.user?.id,
  }
}

export async function cleanupTestData() {
  await supabase.from("events_v2").delete().like("title", "E2E Test%")
  await supabase.from("tours").delete().like("name", "E2E Test%")
}
