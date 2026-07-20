import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { validateCertificationTransition } from "@/lib/music/music-certification"
import type { MusicCertificationStatus } from "@/lib/music/music-trust"
import { resolveMusicTrustFlags } from "@/lib/music/music-trust-flags"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:certification:transition", limit: 20, windowSec: 60 })
const schema = z.object({
  status: z.enum(["draft", "submitted", "withdrawn"]),
  disclosures: z.record(z.string(), z.unknown()).optional(),
  contributor_confirmation: z.boolean().optional(),
  request_id: z.string().min(8).max(200),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many certification changes.", retryable: true })
    const flags = await resolveMusicTrustFlags(supabase, user.id)
    if (!flags.music_certification_requests_enabled) return jsonError({ status: 404, code: "feature_disabled", message: "Certification requests are not available." })
    const { caseId } = await context.params
    const payload = schema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: certificationCase } = await trusted.from("music_certification_cases").select("*")
      .eq("id", caseId).eq("user_id", user.id).maybeSingle()
    if (!certificationCase) return jsonError({ status: 404, code: "case_not_found", message: "Certification case not found." })
    const transition = validateCertificationTransition(certificationCase.status as MusicCertificationStatus, payload.status as MusicCertificationStatus)
    if (!transition.allowed) return jsonError({ status: 409, code: "invalid_transition", message: transition.reason || "Invalid certification transition." })

    if (payload.status === "submitted") {
      const { count } = await trusted.from("music_certification_evidence").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("status", "registered")
      if (!count) return jsonError({ status: 400, code: "evidence_required", message: "Register at least one evidence item before submitting." })
      if (!(payload.contributor_confirmation ?? certificationCase.contributor_confirmation)) {
        return jsonError({ status: 400, code: "contributor_confirmation_required", message: "Contributor confirmation is required." })
      }
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      status: payload.status, updated_at: now,
      ...(payload.disclosures ? { disclosures: payload.disclosures } : {}),
      ...(payload.contributor_confirmation !== undefined ? { contributor_confirmation: payload.contributor_confirmation } : {}),
      ...(payload.status === "submitted" ? { submitted_at: now } : {}),
      ...(payload.status === "withdrawn" ? { withdrawn_at: now } : {}),
    }
    const { data, error } = await trusted.from("music_certification_cases").update(update).eq("id", caseId).select("*").single()
    if (error || !data) return jsonError({ status: 500, code: "case_update_failed", message: "Unable to update certification case.", retryable: true })
    if (payload.status === "submitted") await trusted.from("music_certification_evidence").update({ locked_at: now }).eq("case_id", caseId).is("locked_at", null)
    await Promise.all([
      trusted.from("music_certification_events").upsert({
        case_id: caseId, actor_user_id: user.id, actor_type: "artist", event_type: `case_${payload.status}`,
        from_status: certificationCase.status, to_status: payload.status, request_id: payload.request_id,
      }, { onConflict: "case_id,event_type,request_id", ignoreDuplicates: true }),
      trusted.from("artist_music").update({ certification_status: payload.status, certification_updated_at: now }).eq("id", certificationCase.track_id),
    ])
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError({ status: 400, code: "invalid_request", message: "Invalid certification change.", issues: error.issues })
    return jsonError({ status: 500, code: "certification_internal_error", message: "Unexpected certification error.", retryable: true })
  }
}
