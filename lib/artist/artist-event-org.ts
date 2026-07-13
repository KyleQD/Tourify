import "server-only"

import { createClient } from "@supabase/supabase-js"

import { resolveAdminOrgIdForUser } from "@/app/api/events/_lib/admin-event-persistence"

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase service configuration")
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Resolve or create a personal org for artist-scoped events (events.org_id is NOT NULL). */
export async function ensureArtistEventOrgId(userId: string): Promise<string> {
  const service = createServiceClient()
  const existing = await resolveAdminOrgIdForUser(service as any, userId)
  if (existing) return existing

  const { data: profile } = await service
    .from("profiles")
    .select("display_name, username, full_name")
    .eq("id", userId)
    .maybeSingle()

  const name =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    "Artist"

  const slugBase = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "artist"

  const orgPayload: Record<string, unknown> = {
    name: `${name} Events`,
    slug: `${slugBase}-events-${Math.random().toString(36).slice(2, 6)}`,
    created_by: userId,
  }

  let { data: org, error } = await service.from("organizations").insert(orgPayload).select("id").single()
  if (error && /slug/i.test(error.message || "")) {
    delete orgPayload.slug
    const retry = await service.from("organizations").insert(orgPayload).select("id").single()
    org = retry.data
    error = retry.error
  }
  if (error || !org?.id) throw new Error(error?.message || "Failed to create artist organization")

  await service.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    invited_by: userId,
  })

  return org.id as string
}

export function combineArtistEventTimestamp(
  eventDate?: string | null,
  time?: string | null,
  fallbackIso?: string,
) {
  if (!eventDate) return fallbackIso || new Date().toISOString()
  const normalizedTime = (time || "19:00").slice(0, 5)
  const parsed = Date.parse(`${eventDate}T${normalizedTime}:00`)
  return Number.isNaN(parsed) ? fallbackIso || new Date().toISOString() : new Date(parsed).toISOString()
}
