import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { createConsentText } from "@/lib/music-rights/agreements"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:signatures", limit: 40, windowSec: 60 })

const createSchema = z.object({
  agreement_id: z.string().uuid(),
  agreement_party_id: z.string().uuid(),
  signer_user_id: z.string().uuid().optional(),
  expires_in_days: z.number().int().min(1).max(60).default(14),
})

const signSchema = z.object({
  signature_request_id: z.string().uuid(),
  action: z.enum(["reauth_completed", "consent_accepted", "document_viewed", "sign", "decline"]),
  consent_text_version: z.string().min(1).max(40).default("v1"),
  reauth_confirmed: z.boolean().optional(),
})

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const agreementId = request.nextUrl.searchParams.get("agreementId")
  let query = supabase
    .from("music_rights_signature_requests")
    .select("id, public_id, agreement_id, agreement_version_id, agreement_party_id, signer_user_id, status, consent_text_version, expires_at, created_at, updated_at")
    .or(`owner_user_id.eq.${user.id},signer_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
  if (agreementId) query = query.eq("agreement_id", agreementId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "signatures_query_failed", message: "Unable to load signature requests.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_agreements_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many signature requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_agreements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Agreements are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: agreement } = await trusted
      .from("music_rights_agreements")
      .select("id, project_id, owner_user_id, current_version, status")
      .eq("id", payload.agreement_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!agreement) return jsonError({ status: 404, code: "agreement_not_found", message: "Agreement not found.", retryable: false })

    const { data: version } = await trusted
      .from("music_rights_agreement_versions")
      .select("id, version, rendered_hash, claim_snapshot_hash")
      .eq("agreement_id", agreement.id)
      .eq("version", agreement.current_version)
      .maybeSingle()
    if (!version) return jsonError({ status: 404, code: "agreement_version_not_found", message: "Agreement version not found.", retryable: false })

    const { data: agreementParty } = await trusted
      .from("music_rights_agreement_parties")
      .select("id, party_id, status")
      .eq("id", payload.agreement_party_id)
      .eq("agreement_id", agreement.id)
      .maybeSingle()
    if (!agreementParty) return jsonError({ status: 404, code: "agreement_party_not_found", message: "Agreement party not found.", retryable: false })

    const expiresAt = new Date(Date.now() + payload.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    const { data: requestRow, error } = await trusted
      .from("music_rights_signature_requests")
      .insert({
        agreement_id: agreement.id,
        agreement_version_id: version.id,
        agreement_party_id: agreementParty.id,
        owner_user_id: user.id,
        signer_user_id: payload.signer_user_id || null,
        status: "reauth_required",
        consent_text_version: "v1",
        expires_at: expiresAt,
      })
      .select("*")
      .single()
    if (error || !requestRow)
      return jsonError({ status: 500, code: "signature_request_create_failed", message: "Unable to create signature request.", retryable: true })

    await trusted.from("music_rights_signature_events").insert({
      signature_request_id: requestRow.id,
      agreement_id: agreement.id,
      agreement_version_id: version.id,
      actor_user_id: user.id,
      event_type: "created",
      document_hash: version.rendered_hash,
      claim_snapshot_hash: version.claim_snapshot_hash,
      event_data: { consent_preview: createConsentText("v1") },
    })

    return NextResponse.json({ data: requestRow }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid signature request.", issues: error.issues })
    console.error("Signature request create failed", error)
    return jsonError({ status: 500, code: "signature_request_internal_error", message: "Unexpected signature request error.", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many signature actions.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_agreements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Agreements are not available.", retryable: false })

    const payload = signSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: signatureRequest } = await trusted
      .from("music_rights_signature_requests")
      .select("*, music_rights_agreements!inner(id, project_id, owner_user_id, status), music_rights_agreement_versions!inner(id, rendered_hash, claim_snapshot_hash)")
      .eq("id", payload.signature_request_id)
      .maybeSingle()
    if (!signatureRequest)
      return jsonError({ status: 404, code: "signature_request_not_found", message: "Signature request not found.", retryable: false })

    const canAct = signatureRequest.owner_user_id === user.id || signatureRequest.signer_user_id === user.id
    if (!canAct) return jsonError({ status: 403, code: "signer_required", message: "Not authorized for this signature request." })

    if (signatureRequest.expires_at && new Date(signatureRequest.expires_at).getTime() < Date.now()) {
      await trusted.from("music_rights_signature_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", signatureRequest.id)
      return jsonError({ status: 409, code: "signature_expired", message: "Signature request has expired." })
    }

    if (payload.action === "sign" && !payload.reauth_confirmed)
      return jsonError({ status: 400, code: "reauth_required", message: "Reauthentication confirmation is required before signing." })

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    const version = Array.isArray(signatureRequest.music_rights_agreement_versions)
      ? signatureRequest.music_rights_agreement_versions[0]
      : signatureRequest.music_rights_agreement_versions
    const agreement = Array.isArray(signatureRequest.music_rights_agreements)
      ? signatureRequest.music_rights_agreements[0]
      : signatureRequest.music_rights_agreements

    const eventType = payload.action === "sign" ? "signed" : payload.action === "decline" ? "declined" : payload.action
    const nextStatus =
      payload.action === "sign" ? "signed"
        : payload.action === "decline" ? "declined"
          : payload.action === "reauth_completed" ? "ready"
            : signatureRequest.status

    const { data: updated, error } = await trusted
      .from("music_rights_signature_requests")
      .update({
        status: nextStatus,
        signer_user_id: signatureRequest.signer_user_id || user.id,
        consent_text_version: payload.consent_text_version,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signatureRequest.id)
      .select("*")
      .single()
    if (error || !updated)
      return jsonError({ status: 500, code: "signature_update_failed", message: "Unable to update signature request.", retryable: true })

    await trusted.from("music_rights_signature_events").insert({
      signature_request_id: signatureRequest.id,
      agreement_id: signatureRequest.agreement_id,
      agreement_version_id: signatureRequest.agreement_version_id,
      actor_user_id: user.id,
      event_type: eventType,
      document_hash: version?.rendered_hash || null,
      claim_snapshot_hash: version?.claim_snapshot_hash || null,
      authentication_method: payload.action === "sign" ? "session_reauth_clickwrap" : null,
      ip_hash: hashValue(ip),
      user_agent_hash: hashValue(userAgent),
      event_data: {
        consent_text_version: payload.consent_text_version,
        consent_text: payload.action === "consent_accepted" || payload.action === "sign"
          ? createConsentText(payload.consent_text_version)
          : undefined,
      },
    })

    if (payload.action === "sign") {
      await trusted.from("music_rights_agreement_parties").update({
        status: "signed",
        signed_at: new Date().toISOString(),
      }).eq("id", signatureRequest.agreement_party_id)

      const { data: parties } = await trusted
        .from("music_rights_agreement_parties")
        .select("status")
        .eq("agreement_id", signatureRequest.agreement_id)
      const allSigned = (parties || []).every((party: any) => party.status === "signed" || party.status === "waived")
      await trusted.from("music_rights_agreements").update({
        status: allSigned ? "fully_signed" : "partially_signed",
        updated_at: new Date().toISOString(),
      }).eq("id", signatureRequest.agreement_id)

      await Promise.all([
        writeRightsAuditEvent({
          supabase: trusted,
          projectId: agreement.project_id,
          actorUserId: user.id,
          actorType: "contributor",
          eventType: "music.rights.agreement.signed",
          entityType: "signature_request",
          entityId: signatureRequest.id,
        }),
        enqueueRightsOutboxEvent({
          supabase: trusted,
          projectId: agreement.project_id,
          eventType: "music.rights.agreement.signed",
          dedupeKey: `signature:${signatureRequest.id}:signed`,
          payload: { agreementId: signatureRequest.agreement_id, signatureRequestId: signatureRequest.id },
        }),
      ])
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid signature action.", issues: error.issues })
    console.error("Signature action failed", error)
    return jsonError({ status: 500, code: "signature_action_internal_error", message: "Unexpected signature action error.", retryable: true })
  }
}
