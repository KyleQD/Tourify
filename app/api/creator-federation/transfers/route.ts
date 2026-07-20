import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { authorizeCrossBorderTransfer } from "@/lib/music/creator-federation/cross-border-transfer-gate"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  source_organization_id: z.string().uuid(),
  destination_organization_id: z.string().uuid(),
  purpose_key: z.string().min(1),
  jurisdictions: z.array(z.string()).default([]),
  transfer_mechanism: z.string().optional(),
  purpose_authorized: z.boolean().default(false),
  contribution_authorized: z.boolean().default(false),
  transfer_mechanism_approved: z.boolean().default(false),
  localization_satisfied: z.boolean().default(false),
  onward_transfer_controlled: z.boolean().default(false),
  retention_defined: z.boolean().default(false),
  legal_hold_allows_transfer: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_cross_border_data_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cross-border transfer assessments are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_federation_transfer_manifests")
    .select("id, source_organization_id, destination_organization_id, purpose_key, status, pools_data, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "transfers_query_failed", message: "Unable to load transfer manifests.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Assessments only — no automatic cross-entity pooling.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_cross_border_data_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Cross-border transfer assessments are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const gate = authorizeCrossBorderTransfer({
      purposeAuthorized: payload.purpose_authorized,
      contributionAuthorized: payload.contribution_authorized,
      transferMechanismApproved: payload.transfer_mechanism_approved,
      localizationSatisfied: payload.localization_satisfied,
      onwardTransferControlled: payload.onward_transfer_controlled,
      retentionDefined: payload.retention_defined,
      legalHoldAllowsTransfer: payload.legal_hold_allows_transfer,
    })

    const lineageHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
    const { data, error } = await supabase
      .from("creator_federation_transfer_manifests")
      .insert({
        source_organization_id: payload.source_organization_id,
        destination_organization_id: payload.destination_organization_id,
        purpose_key: payload.purpose_key,
        jurisdictions: payload.jurisdictions,
        transfer_mechanism: payload.transfer_mechanism || null,
        lineage_manifest_hash: lineageHash,
        pools_data: false,
        status: gate.allowed ? "assessment" : "denied",
        created_by: user.id,
      })
      .select("id, status, pools_data, purpose_key")
      .single()

    if (error)
      return jsonError({ status: 500, code: "transfer_create_failed", message: "Unable to create transfer assessment.", retryable: true })

    return NextResponse.json({
      data,
      gate,
      disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    }, { status: gate.allowed ? 201 : 403 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid transfer payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "transfer_create_failed", message: "Unable to create transfer assessment.", retryable: true })
  }
}
