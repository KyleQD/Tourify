import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getTrustedMusicWriteClient, recordMusicEvent } from "@/lib/music/music-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

const reportLimiter = createRateLimiter({ namespace: "music:reports", limit: 5, windowSec: 3600 })

const reportSchema = z.object({
  musicId: z.string().uuid(),
  reason: z.enum([
    "copyright_infringement",
    "not_original_content",
    "inappropriate",
    "other",
    "ownership",
    "impersonation",
    "likeness",
    "ai_disclosure",
    "certification_dispute",
  ]),
  details: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!(await reportLimiter.check(user.id)).success)
      return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 })

    const payload = reportSchema.parse(await request.json())

    const { data: track } = await supabase
      .from("artist_music")
      .select("id, user_id")
      .eq("id", payload.musicId)
      .single()

    if (!track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    if (track.user_id === user.id)
      return NextResponse.json({ error: "You cannot report your own content" }, { status: 400 })

    const { data: existingReport } = await supabase
      .from("content_reports")
      .select("id")
      .eq("reporter_user_id", user.id)
      .eq("content_id", payload.musicId)
      .eq("content_type", "music")
      .eq("status", "pending")
      .maybeSingle()

    if (existingReport)
      return NextResponse.json({ error: "You have already reported this content" }, { status: 409 })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: report, error: insertError } = await trusted.from("content_reports").insert({
      reporter_user_id: user.id,
      content_type: "music",
      content_id: payload.musicId,
      content_owner_user_id: track.user_id,
      reason: payload.reason,
      details: payload.details || null,
      status: "pending",
    }).select("id").single()

    if (insertError) {
      console.error("Failed to create content report:", insertError)
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
    }

    await trusted.from("content_report_events").insert({
      report_id: report.id,
      actor_user_id: user.id,
      event_type: "report_submitted",
      from_status: null,
      to_status: "pending",
      event_data: { reason: payload.reason },
    })

    await recordMusicEvent({
      supabase,
      musicId: payload.musicId,
      artistUserId: track.user_id,
      actorUserId: user.id,
      eventType: "report",
      source: "api_music_report",
      metadata: { reason: payload.reason },
    })

    return NextResponse.json({
      success: true,
      message: "Report submitted. Our team will review it within 48 hours.",
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid report payload", issues: error.issues }, { status: 400 })
    console.error("Report API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
