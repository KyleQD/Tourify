import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import { getProviderCatalog, isKnownProvider, STRIPE_SEPARATION_NOTE } from "@/lib/integrations/provider-catalog"
import {
  deleteVenueIntegrationSecrets,
  logIntegrationEvent,
  readVenueIntegrationSecrets,
  writeVenueIntegrationSecrets,
} from "@/lib/integrations/token-vault"

export const dynamic = "force-dynamic"

/**
 * VEN-264/267/269/270/271 — venue acting-account integrations surface.
 *
 *  GET   → provider capability catalog (env-gated) + this Venue's connections
 *          as SAFE DTOs: token columns are never selected; health derives from
 *          expiry/last_sync metadata.
 *  POST  → disconnect (secret deletion first) or refresh (advisory-locked,
 *          generic token grant) — both require manage_integrations.
 */

const PROVIDER_TOKEN_URLS: Record<string, string> = {
  facebook: "https://graph.facebook.com/v19.0/oauth/access_token",
  instagram: "https://graph.facebook.com/v19.0/oauth/access_token",
  youtube: "https://oauth2.googleapis.com/token",
  tiktok: "https://open.tiktokapis.com/v2/oauth/token/",
  twitter: "https://api.twitter.com/2/oauth2/token",
}

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const venueId = new URL(request.url).searchParams.get("venue_id")
  if (venueId) return venueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_integrations")
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  // VEN-267 — explicit column list; token fields are structurally unreachable.
  const { data: rows } = await service
    .from("venue_social_integrations")
    .select("id, platform, account_handle, is_connected, last_sync")
    .eq("venue_id", venueId)

  const connections = []
  for (const row of rows || []) {
    const secrets = await readVenueIntegrationSecrets(String(row.id))
    connections.push({
      id: String(row.id),
      platform: String(row.platform),
      account_handle: row.account_handle,
      is_connected: Boolean(row.is_connected && (secrets.accessToken !== null || true)),
      has_token: secrets.accessToken !== null,
      last_sync: row.last_sync,
      health: !row.is_connected
        ? ("disconnected" as const)
        : secrets.accessToken === null
          ? ("needs_reauth" as const)
          : ("connected" as const),
    })
  }

  return NextResponse.json(
    {
      success: true,
      catalog: getProviderCatalog(),
      connections,
      stripe_note: STRIPE_SEPARATION_NOTE,
      capabilities_note:
        "Capability booleans reflect what the platform adapter actually implements today; unsupported features are marked false, never simulated.",
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("disconnect"),
    venue_id: z.string().uuid(),
    connection_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("refresh"),
    venue_id: z.string().uuid(),
    connection_id: z.string().uuid(),
  }),
])

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let parsedAction
  try {
    parsedAction = actionSchema.safeParse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!parsedAction.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const body = parsedAction.data

  const access = await canManageVenue(auth.supabase, auth.user.id, body.venue_id, "manage_integrations")
  if (!access.allowed) return NextResponse.json({ error: "Integrations manage permission required" }, { status: 403 })

  const service = createServiceRoleClient()
  const { data: row } = await service
    .from("venue_social_integrations")
    .select("id, venue_id, platform, refresh_token")
    .eq("id", body.connection_id)
    .maybeSingle()

  if (!row || row.venue_id !== body.venue_id)
    return NextResponse.json({ error: "Connection not found for this venue" }, { status: 404 })

  if (!isKnownProvider(String(row.platform)))
    return NextResponse.json({ error: "Unknown platform on record" }, { status: 400 })

  if (body.action === "disconnect") {
    // VEN-271 — secret deletion precedes any state change.
    await deleteVenueIntegrationSecrets(body.connection_id)
    await service
      .from("venue_social_integrations")
      .update({
        access_token: null,
        refresh_token: null,
        is_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.connection_id)

    await logIntegrationEvent({
      venueId: body.venue_id,
      actorId: auth.user.id,
      action: "disconnect",
      platform: String(row.platform),
      metadata: { connection_id: body.connection_id },
    })
    return NextResponse.json({ success: true })
  }

  // ── refresh (VEN-276 minimal): advisory lock prevents concurrent grants ────
  const lockKey = Math.abs(hashLockKey(`integr-refresh:${body.connection_id}`))
  let acquired = false
  try {
    const rpc = service.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
    const { data: locked } = await rpc("pg_try_advisory_lock", { key: lockKey })
    acquired = Boolean(locked)
  } catch {
    acquired = true // environments without advisory locks proceed single-caller
  }
  if (!acquired) {
    return NextResponse.json({ error: "A refresh is already in progress for this connection" }, { status: 409 })
  }

  const secrets = await readVenueIntegrationSecrets(body.connection_id)
  const refreshToken =
    secrets.refreshToken ||
    (typeof row.refresh_token === "string" ? row.refresh_token : null)

  const tokenUrl = PROVIDER_TOKEN_URLS[String(row.platform)]
  if (!tokenUrl || !refreshToken) {
    await logIntegrationEvent({
      venueId: body.venue_id,
      actorId: auth.user.id,
      action: "sync_failed",
      platform: String(row.platform),
      metadata: { reason: "refresh unsupported for platform or missing refresh token" },
    })
    return NextResponse.json({ error: "Refresh not supported for this connection" }, { status: 400 })
  }

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env[`${String(row.platform).toUpperCase()}_CLIENT_ID`] || "",
        client_secret:
          process.env.FACEBOOK_APP_SECRET && ["facebook", "instagram"].includes(String(row.platform))
            ? process.env.FACEBOOK_APP_SECRET
            : process.env.GOOGLE_CLIENT_SECRET && String(row.platform) === "youtube"
              ? process.env.GOOGLE_CLIENT_SECRET
              : process.env.TIKTOK_CLIENT_SECRET && String(row.platform) === "tiktok"
                ? process.env.TIKTOK_CLIENT_SECRET
                : process.env.TWITTER_CLIENT_SECRET && String(row.platform) === "twitter"
                  ? process.env.TWITTER_CLIENT_SECRET
                  : "",
      }),
    })
    const payload = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!res.ok || !payload.access_token) throw new Error(`provider rejected refresh (${res.status})`)

    await writeVenueIntegrationSecrets(body.connection_id, {
      accessToken: payload.access_token,
      ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
    })
    await service
      .from("venue_social_integrations")
      .update({ is_connected: true, last_sync: new Date().toISOString() })
      .eq("id", body.connection_id)
    await logIntegrationEvent({
      venueId: body.venue_id,
      actorId: auth.user.id,
      action: "refresh",
      platform: String(row.platform),
      metadata: { expires_in: payload.expires_in ?? null },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    await logIntegrationEvent({
      venueId: body.venue_id,
      actorId: auth.user.id,
      action: "sync_failed",
      platform: String(row.platform),
      metadata: { reason: err?.message?.slice(0, 300), next_retry_at: new Date(Date.now() + 60_000).toISOString() },
    })
    return NextResponse.json({ error: err?.message || "Refresh failed" }, { status: 502 })
  }
}

/** Stable numeric key for pg advisory locks from a string id. */
function hashLockKey(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
