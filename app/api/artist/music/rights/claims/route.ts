import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { assertOwnedProject, enqueueRightsOutboxEvent, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"
import { detectClaimConflicts, normalizeShare } from "@/lib/music-rights/rights-validation"
import type { ExistingRightsClaim } from "@/lib/music-rights/rights-types"
import { producerPointsDefaultClaimType } from "@/lib/music-rights/asset-relationships"

export const dynamic = "force-dynamic"

const shareSchema = z.object({
  numerator: z.string().regex(/^\d+$/),
  denominator: z.string().regex(/^[1-9]\d*$/),
  unknown: z.boolean().default(false),
  originalText: z.string().max(80).optional(),
  originalScale: z.string().max(40).optional(),
})

const createSchema = z.object({
  project_id: z.string().uuid(),
  subject_type: z.enum(["musical_work", "sound_recording", "release", "income_stream"]),
  subject_id: z.string().uuid(),
  claimant_party_id: z.string().uuid(),
  claim_type: z.enum([
    "ownership", "administration", "collection", "exclusive_license", "nonexclusive_license",
    "income_participation", "approval_right", "recoupment", "security_interest", "unknown_pending",
  ]),
  rights_category: z.string().min(1).max(80),
  share: shareSchema,
  territory_codes: z.array(z.string().min(2).max(16)).min(1),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  perpetual: z.boolean().default(true),
  exclusive: z.boolean().optional(),
  producer_points: z.boolean().default(false),
  income_participation: z.object({
    basis: z.string().max(80).default("net_receipts"),
    deductions: z.array(z.unknown()).default([]),
    revenue_scope: z.array(z.string()).default([]),
    audit_rights: z.boolean().default(false),
    payment_obligation: z.string().max(500).optional().nullable(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_claims")
    .select("*, music_rights_claim_territories(*), music_rights_income_participations(*)")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_claims_query_failed", message: "Unable to load claims.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_rights_workspace_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_workspace_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights workspace is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    const claimType = payload.producer_points ? producerPointsDefaultClaimType() : payload.claim_type
    const share = normalizeShare({
      numerator: payload.share.numerator,
      denominator: payload.share.denominator,
      unknown: payload.share.unknown,
      originalText: payload.share.originalText,
      originalScale: payload.share.originalScale,
    })

    const { data: existingRows } = await trusted
      .from("music_rights_claims")
      .select("id, subject_type, subject_id, claim_type, rights_category, share_numerator, share_denominator, share_unknown, valid_from, valid_until, perpetual, status, music_rights_claim_territories(territory_code)")
      .eq("project_id", project.id)

    const existing: ExistingRightsClaim[] = (existingRows || []).map((row: any) => ({
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      claimType: row.claim_type,
      rightsCategory: row.rights_category,
      share: {
        numerator: row.share_numerator,
        denominator: row.share_denominator,
        unknown: row.share_unknown,
      },
      territoryCodes: (row.music_rights_claim_territories || []).map((territory: any) => territory.territory_code),
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      perpetual: row.perpetual,
      status: row.status,
    }))

    const candidate = {
      subjectType: payload.subject_type,
      subjectId: payload.subject_id,
      claimantPartyId: payload.claimant_party_id,
      claimType,
      rightsCategory: payload.rights_category,
      share,
      territoryCodes: payload.territory_codes,
      validFrom: payload.valid_from || undefined,
      validUntil: payload.valid_until || undefined,
      perpetual: payload.perpetual,
      exclusive: payload.exclusive,
    }

    const issues = detectClaimConflicts({ candidate, existing })
    const blocking = issues.filter((issue) =>
      ["invalid_share", "share_overflow", "category_mismatch", "scope_conflict", "date_overlap"].includes(issue.code)
    )
    if (blocking.length > 0)
      return jsonError({
        status: 409,
        code: "claim_validation_failed",
        message: "Claim conflicts with existing rights claims.",
        issues: blocking,
      })

    const status = issues.some((issue) => issue.code === "territory_overlap") ? "disputed" : "proposed"
    const { data: claim, error } = await trusted
      .from("music_rights_claims")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        subject_type: payload.subject_type,
        subject_id: payload.subject_id,
        claimant_party_id: payload.claimant_party_id,
        claim_type: claimType,
        rights_category: payload.rights_category,
        share_numerator: share.numerator,
        share_denominator: share.denominator,
        share_unknown: share.unknown,
        original_share_text: share.originalText || null,
        original_share_scale: share.originalScale || null,
        valid_from: payload.valid_from || null,
        valid_until: payload.valid_until || null,
        perpetual: payload.perpetual,
        exclusive: payload.exclusive ?? null,
        status,
        evidence: issues.length ? { validation_issues: issues } : {},
      })
      .select("*")
      .single()
    if (error || !claim)
      return jsonError({ status: 500, code: "rights_claim_create_failed", message: "Unable to create claim.", retryable: true })

    await trusted.from("music_rights_claim_territories").insert(
      payload.territory_codes.map((territory_code) => ({
        claim_id: claim.id,
        territory_code,
      })),
    )

    if (claimType === "income_participation" || payload.income_participation) {
      await trusted.from("music_rights_income_participations").insert({
        claim_id: claim.id,
        basis: payload.income_participation?.basis || "net_receipts",
        deductions: payload.income_participation?.deductions || [],
        revenue_scope: payload.income_participation?.revenue_scope || [],
        audit_rights: payload.income_participation?.audit_rights || false,
        payment_obligation: payload.income_participation?.payment_obligation || null,
      })
    }

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.claim.proposed",
        entityType: "claim",
        entityId: claim.id,
        eventData: { status, issues },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.claim.proposed",
        dedupeKey: `claim:${claim.id}:proposed`,
        payload: { claimId: claim.id, status },
      }),
    ])

    return NextResponse.json({ data: claim, warnings: issues }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid claim request.", issues: error.issues })
    if (error instanceof Error && error.message.includes("Invalid rational share"))
      return jsonError({ status: 400, code: "invalid_share", message: error.message, retryable: false })
    console.error("Rights claim create failed", error)
    return jsonError({ status: 500, code: "rights_claim_internal_error", message: "Unexpected claim error.", retryable: true })
  }
}
