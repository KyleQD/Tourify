import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { resolveMandate } from "@/lib/music/creator-federation/mandate-delegation"

export const dynamic = "force-dynamic"

const ALLOWED_SERVICES = ["service_directory_admin"] as const

const createSchema = z.object({
  federation_entity_id: z.string().uuid(),
  principal_organization_id: z.string().uuid(),
  service_key: z.enum(ALLOWED_SERVICES).default("service_directory_admin"),
  territories: z.array(z.string()).default(["SANDBOX"]),
  scope: z.record(z.unknown()).default({}),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_mandates_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation mandates are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_mandates")
    .select("id, federation_entity_id, principal_organization_id, service_key, status, territories, allow_subdelegation, starts_at, ends_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "mandates_query_failed", message: "Unable to load mandates.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Sandbox mandates limited to service_directory_admin; no representation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_mandates_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Federation mandates are not available.", retryable: false })

    if (flags.creator_federation_representation_network_enabled)
      return jsonError({ status: 403, code: "representation_blocked", message: "Representation network remains separately gated.", retryable: false })

    const payload = createSchema.parse(await request.json())
    if (!ALLOWED_SERVICES.includes(payload.service_key as any))
      return jsonError({ status: 403, code: "service_out_of_scope", message: "Only service_directory_admin mandates are allowed in the sandbox.", retryable: false })

    const startsAt = payload.starts_at || new Date().toISOString()
    const endsAt = payload.ends_at || new Date(Date.now() + 90 * 86400000).toISOString()

    const { data, error } = await supabase
      .from("creator_federation_mandates")
      .insert({
        federation_entity_id: payload.federation_entity_id,
        principal_organization_id: payload.principal_organization_id,
        service_key: payload.service_key,
        scope: payload.scope,
        territories: payload.territories,
        allow_subdelegation: false,
        status: "active",
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: user.id,
      })
      .select("id, service_key, status, territories, allow_subdelegation")
      .single()

    if (error)
      return jsonError({ status: 500, code: "mandate_create_failed", message: "Unable to create mandate.", retryable: true })

    const check = resolveMandate({
      mandate: {
        principalOrganizationId: payload.principal_organization_id,
        delegateFederationId: payload.federation_entity_id,
        service: payload.service_key,
        territories: payload.territories,
        startsAt,
        endsAt,
        allowSubdelegation: false,
        status: "active",
      },
      service: payload.service_key,
      territory: payload.territories[0] || "SANDBOX",
      at: new Date(),
    })

    return NextResponse.json({ data, mandateCheck: check, disclaimer: CREATOR_FEDERATION_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid mandate payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "mandate_create_failed", message: "Unable to create mandate.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_mandates_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation mandates are not available.", retryable: false })

  const mandateId = request.nextUrl.searchParams.get("id")
  if (!mandateId)
    return jsonError({ status: 400, code: "validation_error", message: "Mandate id is required.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_mandates")
    .update({ status: "revoked" })
    .eq("id", mandateId)
    .select("id, status")
    .single()

  if (error)
    return jsonError({ status: 500, code: "mandate_revoke_failed", message: "Unable to revoke mandate.", retryable: true })

  await supabase.from("creator_federation_outbox_events").insert({
    event_type: "mandate.revoked",
    aggregate_type: "creator_federation_mandates",
    aggregate_id: data.id,
    payload: { actor_id: user.id },
    idempotency_key: `fed-mandate-revoke:${data.id}:${Date.now()}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_FEDERATION_DISCLAIMER })
}
