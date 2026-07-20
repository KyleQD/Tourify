import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { evaluateIdentifierPolicy } from "@/lib/music/creator-public-infrastructure/identifier-policy"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  participation_id: z.string().uuid(),
  method: z.enum(["sandbox_did", "opaque_handle", "controlled_reference"]).default("sandbox_did"),
  public_fields_contain_pii: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_identifier_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Sandbox identifiers are not available.", retryable: false })

  const { data: participations } = await supabase
    .from("creator_public_infrastructure_participations")
    .select("id")
    .eq("user_id", user.id)

  const ids = (participations || []).map((row: { id: string }) => row.id)
  if (ids.length === 0)
    return NextResponse.json({ data: [], disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER, enabled: true })

  const { data, error } = await supabase
    .from("creator_public_identifiers")
    .select("id, participation_id, public_identifier, method, status, controller_version, created_at, deactivated_at")
    .in("participation_id", ids)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "identifiers_query_failed", message: "Unable to load identifiers.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Identifiers are references only and do not prove copyright ownership.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
    if (!flags.creator_public_infrastructure_identifier_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Sandbox identifiers are not available.", retryable: false })

    if (flags.creator_public_infrastructure_universal_identifier_enabled)
      return jsonError({ status: 403, code: "universal_identifier_blocked", message: "Universal identifiers remain hard-disabled.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: participation } = await supabase
      .from("creator_public_infrastructure_participations")
      .select("id, status")
      .eq("id", payload.participation_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!participation || participation.status !== "active")
      return jsonError({ status: 403, code: "participation_required", message: "Active explicit participation is required.", retryable: false })

    const policy = evaluateIdentifierPolicy({
      explicitParticipation: true,
      controllerVerified: true,
      publicFieldsContainPii: payload.public_fields_contain_pii,
      methodApproved: true,
      jurisdictionApproved: true,
    })
    if (!policy.allowed)
      return jsonError({ status: 403, code: policy.reason, message: "Identifier policy denied issuance.", retryable: false })

    const publicIdentifier = `did:tourify-sandbox:${crypto.randomUUID()}`
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_public_identifiers")
      .insert({
        participation_id: payload.participation_id,
        public_identifier: publicIdentifier,
        method: payload.method,
        status: "active",
        document_json: { controller: user.id, pii: false, ownership_claim: false },
      })
      .select("id, public_identifier, method, status, controller_version")
      .single()

    if (error)
      return jsonError({ status: 500, code: "identifier_create_failed", message: "Unable to create sandbox identifier.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
      note: "Sandbox identifier only — not ownership, licensing, or universal identity.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid identifier payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "identifier_create_failed", message: "Unable to create sandbox identifier.", retryable: true })
  }
}
