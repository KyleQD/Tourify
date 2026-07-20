import { createHash } from "node:crypto"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export function minorUnitsToDb(value: bigint): string {
  return value.toString()
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex")
}

export async function userCanAdminRoyaltiesOps(supabase: any, userId: string): Promise<boolean> {
  const trusted = await getTrustedMusicWriteClient(supabase)
  const { data: profile } = await trusted
    .from("profiles")
    .select("is_admin, admin_level")
    .eq("id", userId)
    .maybeSingle()

  if (profile?.is_admin === true && ["moderator", "super"].includes(profile.admin_level || ""))
    return true

  const { data: overrides } = await trusted
    .from("rbac_user_permission_overrides")
    .select("allow, rbac_permissions!inner(name)")
    .eq("user_id", userId)
    .eq("rbac_permissions.name", "music.rights.review")
  if (overrides?.some((row: any) => row.allow === true)) return true
  if (overrides?.some((row: any) => row.allow === false)) return false

  const { data: assignments } = await trusted
    .from("rbac_user_entity_roles")
    .select("role_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .or(`end_at.is.null,end_at.gt.${new Date().toISOString()}`)
  const roleIds = (assignments || []).map((row: any) => row.role_id)
  if (!roleIds.length) return false

  const { data: grants } = await trusted
    .from("rbac_role_permissions")
    .select("rbac_permissions!inner(name)")
    .in("role_id", roleIds)
    .eq("rbac_permissions.name", "music.rights.review")
    .limit(1)
  return Boolean(grants?.length)
}

export async function enqueueRoyaltyOutboxEvent(params: {
  supabase: any
  ownerUserId?: string | null
  eventType: string
  dedupeKey: string
  payload?: Record<string, unknown>
}) {
  await params.supabase.from("music_royalties_outbox_events").upsert({
    owner_user_id: params.ownerUserId || null,
    event_type: params.eventType,
    dedupe_key: params.dedupeKey,
    payload: params.payload || {},
    status: "pending",
  }, { onConflict: "event_type,dedupe_key", ignoreDuplicates: true })
}
