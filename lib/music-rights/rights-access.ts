import type { SupabaseClient } from "@supabase/supabase-js"

export async function assertOwnedTrack(params: {
  supabase: SupabaseClient
  userId: string
  trackId: string
}) {
  const { data, error } = await params.supabase
    .from("artist_music")
    .select("id, user_id, title, release_date, type, duration, metadata")
    .eq("id", params.trackId)
    .eq("user_id", params.userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function assertOwnedProject(params: {
  supabase: SupabaseClient
  userId: string
  projectId: string
}) {
  const { data, error } = await params.supabase
    .from("music_rights_projects")
    .select("*")
    .eq("id", params.projectId)
    .eq("owner_user_id", params.userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function bumpProjectVersion(params: {
  supabase: SupabaseClient
  projectId: string
  expectedVersion: number
}) {
  const { data, error } = await params.supabase
    .from("music_rights_projects")
    .update({
      version: params.expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.projectId)
    .eq("version", params.expectedVersion)
    .select("id, version")
    .maybeSingle()

  if (error) throw error
  return data
}

export async function writeRightsAuditEvent(params: {
  supabase: SupabaseClient
  projectId: string
  actorUserId: string | null
  actorType?: "artist" | "contributor" | "reviewer" | "system"
  eventType: string
  entityType?: string
  entityId?: string
  eventData?: Record<string, unknown>
}) {
  const { error } = await params.supabase.from("music_rights_audit_events").insert({
    project_id: params.projectId,
    actor_user_id: params.actorUserId,
    actor_type: params.actorType || "artist",
    event_type: params.eventType,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    event_data: params.eventData || {},
  })
  if (error) throw error
}

export async function enqueueRightsOutboxEvent(params: {
  supabase: SupabaseClient
  projectId?: string | null
  eventType: string
  dedupeKey: string
  payload?: Record<string, unknown>
}) {
  const { error } = await params.supabase.from("music_rights_outbox_events").upsert({
    project_id: params.projectId || null,
    event_type: params.eventType,
    dedupe_key: params.dedupeKey,
    payload: params.payload || {},
    status: "pending",
    updated_at: new Date().toISOString(),
  }, { onConflict: "event_type,dedupe_key" })
  if (error) throw error
}
