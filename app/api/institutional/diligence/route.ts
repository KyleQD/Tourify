import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  requester_organization_id: z.string().uuid(),
  request_text: z.string().min(1).max(5000),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  due_at: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_diligence_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional diligence is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_institutional_diligence_requests")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        requester_organization_id: payload.requester_organization_id,
        request_text: payload.request_text,
        severity: payload.severity,
        due_at: payload.due_at || null,
        status: "open",
      })
      .select("id, transaction_case_id, status, severity, request_text, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "diligence_create_failed", message: "Unable to create diligence request.", retryable: true })

    void user
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid diligence payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "diligence_create_failed", message: "Unable to create diligence request.", retryable: true })
  }
}
