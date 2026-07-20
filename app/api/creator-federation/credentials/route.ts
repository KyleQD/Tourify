import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { verifyFederationCredential } from "@/lib/music/creator-federation/credential-trust-policy"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const issueSchema = z.object({
  issuer_id: z.string().uuid(),
  subject_ref: z.string().min(1),
  credential_type: z.enum(["organization_membership", "delegate", "service"]),
  source_record_type: z.string().min(1),
  source_record_id: z.string().uuid(),
  expires_at: z.string().datetime().optional().nullable(),
})

const verifySchema = z.object({
  credential_id: z.string().uuid(),
  high_risk_action: z.boolean().default(false),
  source_record_current: z.boolean().default(false),
  proof_valid: z.boolean().default(true),
  holder_binding_valid: z.boolean().default(true),
  jurisdiction_allowed: z.boolean().default(true),
  scope_allowed: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_credentials_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation credentials are not available.", retryable: false })

  const { data, error } = await supabase

    .from("creator_federation_credentials")
    .select("id, subject_ref, credential_type, schema_version, status, issued_at, expires_at, source_record_type")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "credentials_query_failed", message: "Unable to load credentials.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Private sandbox listing only — credentials never expand source authority.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_credentials_enabled || !flags.creator_federation_trust_registry_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Federation credentials are not available.", retryable: false })

    const body = await request.json()
    if (body.action === "verify") {
      const payload = verifySchema.parse(body)
      const { data: cred } = await supabase
        .from("creator_federation_credentials")
        .select("id, status, issuer_id")
        .eq("id", payload.credential_id)
        .maybeSingle()

      if (!cred)
        return jsonError({ status: 404, code: "not_found", message: "Credential not found.", retryable: false })

      const { data: issuer } = await supabase
        .from("creator_federation_trusted_issuers")
        .select("status")
        .eq("id", cred.issuer_id)
        .maybeSingle()

      const result = verifyFederationCredential({
        issuerTrusted: issuer?.status === "sandbox_approved" || issuer?.status === "approved",
        schemaApproved: true,
        proofValid: payload.proof_valid,
        holderBindingValid: payload.holder_binding_valid,
        status: cred.status as any,
        jurisdictionAllowed: payload.jurisdiction_allowed,
        scopeAllowed: payload.scope_allowed,
        sourceRecordCurrent: payload.source_record_current,
        highRiskAction: payload.high_risk_action,
      })

      return NextResponse.json({ data: { result }, disclaimer: CREATOR_FEDERATION_DISCLAIMER, privateVerify: true })
    }

    const payload = issueSchema.parse(body)
    const trusted = await getTrustedMusicWriteClient(supabase)
    const credentialHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
    const { data, error } = await trusted
      .from("creator_federation_credentials")
      .insert({
        issuer_id: payload.issuer_id,
        subject_ref: payload.subject_ref,
        credential_type: payload.credential_type,
        status: "active",
        source_record_type: payload.source_record_type,
        source_record_id: payload.source_record_id,
        credential_hash: credentialHash,
        expires_at: payload.expires_at || null,
      })
      .select("id, credential_type, status, schema_version, credential_hash")
      .single()

    if (error)
      return jsonError({ status: 500, code: "credential_issue_failed", message: "Unable to issue sandbox credential.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: CREATOR_FEDERATION_DISCLAIMER,
      note: "Sandbox credential issued as evidence only.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid credential payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "credential_failed", message: "Unable to process credential request.", retryable: true })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_credentials_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation credentials are not available.", retryable: false })

  const credentialId = request.nextUrl.searchParams.get("id")
  if (!credentialId)
    return jsonError({ status: 400, code: "validation_error", message: "Credential id is required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await trusted
    .from("creator_federation_credentials")
    .update({ status: "revoked" })
    .eq("id", credentialId)
    .select("id, status")
    .single()

  if (error)
    return jsonError({ status: 500, code: "credential_revoke_failed", message: "Unable to revoke credential.", retryable: true })

  await trusted.from("creator_federation_outbox_events").insert({
    event_type: "credential.revoked",
    aggregate_type: "creator_federation_credentials",
    aggregate_id: data.id,
    payload: { actor_id: user.id },
    idempotency_key: `fed-credential-revoke:${data.id}:${Date.now()}`,
  })

  return NextResponse.json({ data, disclaimer: CREATOR_FEDERATION_DISCLAIMER })
}
