import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:certificate:dispute", limit: 5, windowSec: 3600 })
const schema = z.object({
  reason: z.enum(["ownership", "impersonation", "likeness", "ai_disclosure", "certification_dispute"]),
  details: z.string().min(20).max(8000),
})

export async function POST(request: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success) return jsonError({ status: 429, code: "rate_limited", message: "Too many report submissions.", retryable: true })
    const payload = schema.parse(await request.json())
    const { publicId } = await context.params
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: certificate } = await trusted.from("music_certificates").select("id, track_id, user_id").eq("public_id", publicId).maybeSingle()
    if (!certificate) return jsonError({ status: 404, code: "certificate_not_found", message: "Certificate not found." })
    const { data: report, error } = await trusted.from("content_reports").insert({
      reporter_user_id: user.id, content_type: "music_certificate", content_id: certificate.id,
      content_owner_user_id: certificate.user_id, reason: payload.reason, details: payload.details, status: "pending",
    }).select("id, status, created_at").single()
    if (error || !report) return jsonError({ status: 500, code: "report_create_failed", message: "Unable to submit dispute.", retryable: true })
    await Promise.all([
      trusted.from("content_report_events").insert({ report_id: report.id, actor_user_id: user.id, event_type: "report_submitted", from_status: null, to_status: "pending", event_data: { reason: payload.reason } }),
      trusted.from("music_engagement_events").insert({ music_id: certificate.track_id, artist_user_id: certificate.user_id, actor_user_id: user.id, event_type: "report", source: "certificate_dispute", metadata: { report_id: report.id, reason: payload.reason } }),
    ])
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError({ status: 400, code: "invalid_request", message: "Invalid dispute.", issues: error.issues })
    return jsonError({ status: 500, code: "report_internal_error", message: "Unexpected report error.", retryable: true })
  }
}
