import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import {
  buildClaimSnapshot,
  buildPartySnapshot,
  renderAgreementMarkdown,
  type AgreementClaimSnapshotItem,
  type AgreementPartySnapshotItem,
} from "@/lib/music-rights/agreements"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  assertOwnedProject,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:agreements", limit: 30, windowSec: 60 })

const createSchema = z.object({
  project_id: z.string().uuid(),
  template_key: z.string().min(1).max(120).default("electronic_split_sheet"),
  title: z.string().min(1).max(300).optional(),
  claim_ids: z.array(z.string().uuid()).max(100).default([]),
  parties: z.array(z.object({
    party_id: z.string().uuid(),
    signer_role: z.string().min(1).max(80).default("claimant"),
    signing_order: z.number().int().min(1).max(50).default(1),
  })).min(1).max(50),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_agreements")
    .select("*, music_rights_agreement_versions(id, version, rendered_hash, claim_snapshot_hash, created_at), music_rights_agreement_parties(id, party_id, signer_role, status, signed_at)")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "agreements_query_failed", message: "Unable to load agreements.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_agreements_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many agreement requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_agreements_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Agreements are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    const { data: template } = await trusted
      .from("music_rights_agreement_templates")
      .select("*")
      .eq("template_key", payload.template_key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!template) return jsonError({ status: 404, code: "template_not_found", message: "Agreement template not found.", retryable: false })

    let claimsQuery = trusted
      .from("music_rights_claims")
      .select("id, subject_type, subject_id, claimant_party_id, claim_type, rights_category, share_numerator, share_denominator, share_unknown, status, perpetual, music_rights_claim_territories(territory_code)")
      .eq("project_id", project.id)
    if (payload.claim_ids.length) claimsQuery = claimsQuery.in("id", payload.claim_ids)
    const { data: claims } = await claimsQuery

    const partyIds = payload.parties.map((party) => party.party_id)
    const { data: parties } = await trusted
      .from("music_rights_parties")
      .select("id, display_name, legal_name, linked_user_id")
      .eq("project_id", project.id)
      .in("id", partyIds)
    if ((parties || []).length !== partyIds.length)
      return jsonError({ status: 400, code: "invalid_parties", message: "One or more parties are invalid for this project." })

    const claimSnapshotItems: AgreementClaimSnapshotItem[] = (claims || []).map((claim: any) => ({
      claimId: claim.id,
      subjectType: claim.subject_type,
      subjectId: claim.subject_id,
      claimantPartyId: claim.claimant_party_id,
      claimType: claim.claim_type,
      rightsCategory: claim.rights_category,
      share: {
        numerator: String(claim.share_numerator),
        denominator: String(claim.share_denominator),
        unknown: Boolean(claim.share_unknown),
      },
      territoryCodes: (claim.music_rights_claim_territories || []).map((row: any) => row.territory_code).filter(Boolean).length
        ? (claim.music_rights_claim_territories || []).map((row: any) => row.territory_code)
        : ["WORLDWIDE"],
      perpetual: Boolean(claim.perpetual),
      status: claim.status,
    }))
    const partySnapshotItems: AgreementPartySnapshotItem[] = payload.parties.map((party) => {
      const row = (parties || []).find((item: any) => item.id === party.party_id)
      return {
        partyId: party.party_id,
        displayName: row?.display_name || party.party_id,
        legalName: row?.legal_name || null,
        signerRole: party.signer_role,
        linkedUserId: row?.linked_user_id || null,
      }
    })

    const claimSnapshot = buildClaimSnapshot(claimSnapshotItems)
    const partySnapshot = buildPartySnapshot(partySnapshotItems)
    const rendered = renderAgreementMarkdown({
      templateMarkdown: template.body_markdown,
      projectTitle: project.title,
      claims: claimSnapshot.snapshot,
      parties: partySnapshot.snapshot,
    })

    const { data: agreement, error: agreementError } = await trusted
      .from("music_rights_agreements")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        template_id: template.id,
        title: payload.title || `${template.title} — ${project.title}`,
        status: "pending_signatures",
        current_version: 1,
      })
      .select("*")
      .single()
    if (agreementError || !agreement)
      return jsonError({ status: 500, code: "agreement_create_failed", message: "Unable to create agreement.", retryable: true })

    const { data: version, error: versionError } = await trusted
      .from("music_rights_agreement_versions")
      .insert({
        agreement_id: agreement.id,
        version: 1,
        template_id: template.id,
        rendered_markdown: rendered.renderedMarkdown,
        rendered_hash: rendered.renderedHash,
        claim_snapshot: claimSnapshot.snapshot,
        claim_snapshot_hash: claimSnapshot.hash,
        party_snapshot: partySnapshot.snapshot,
        party_snapshot_hash: partySnapshot.hash,
        governing_law: template.jurisdiction,
        created_by: user.id,
      })
      .select("*")
      .single()
    if (versionError || !version)
      return jsonError({ status: 500, code: "agreement_version_create_failed", message: "Unable to freeze agreement version.", retryable: true })

    const agreementParties = await Promise.all(payload.parties.map(async (party) => {
      const { data } = await trusted.from("music_rights_agreement_parties").insert({
        agreement_id: agreement.id,
        agreement_version_id: version.id,
        party_id: party.party_id,
        signer_role: party.signer_role,
        signing_order: party.signing_order,
        status: "pending",
      }).select("*").single()
      return data
    }))

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.agreement.generated",
        entityType: "agreement",
        entityId: agreement.id,
        eventData: { versionId: version.id, renderedHash: version.rendered_hash },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.agreement.generated",
        dedupeKey: `agreement:${agreement.id}:v1`,
        payload: { agreementId: agreement.id, versionId: version.id },
      }),
    ])

    return NextResponse.json({
      data: {
        ...agreement,
        version,
        parties: agreementParties.filter(Boolean),
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid agreement request.", issues: error.issues })
    console.error("Agreement create failed", error)
    return jsonError({ status: 500, code: "agreement_internal_error", message: "Unexpected agreement error.", retryable: true })
  }
}
