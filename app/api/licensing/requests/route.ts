import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { classifyLicenseRequest } from "@/lib/music/licensing/license-classification"
import { canTransitionLicenseRequest } from "@/lib/music/licensing/license-request-state-machine"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { resolveWorkflowModule } from "@/lib/music/licensing/workflow-modules"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  brief_id: z.string().uuid(),
  artist_music_id: z.string().uuid().optional().nullable(),
  classification_facts: z.object({
    hasMovingImages: z.boolean().default(false),
    usesExistingRecording: z.boolean().default(false),
    createsPhonorecords: z.boolean().default(false),
    samplesExistingAudio: z.boolean().default(false),
    replaysComposition: z.boolean().default(false),
    changesLyricsOrFundamentalCharacter: z.boolean().default(false),
    isLiveEvent: z.boolean().default(false),
    isUserGeneratedContent: z.boolean().default(false),
    isAiTraining: z.boolean().default(false),
    isSyntheticVoice: z.boolean().default(false),
  }),
  submit: z.boolean().default(false),
})

const transitionSchema = z.object({
  request_id: z.string().uuid(),
  to_status: z.enum([
    "draft", "submitted", "needs_information", "under_clearance", "quote_pending", "quoted",
    "approval_pending", "approved", "rejected", "expired", "withdrawn", "contracting", "licensed", "cancelled",
  ]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_requests_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing requests are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_license_requests")
    .select("id, public_id, project_id, brief_id, status, classification_status, license_class, workflow_module, artist_music_id, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "requests_query_failed", message: "Unable to load requests.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_requests_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing requests are not available.", retryable: false })

    const body = await request.json()
    if (body?.request_id && body?.to_status) {
      const transition = transitionSchema.parse(body)
      const { data: existing, error: loadError } = await supabase
        .from("music_license_requests")
        .select("id, status")
        .eq("id", transition.request_id)
        .eq("created_by", user.id)
        .single()
      if (loadError || !existing)
        return jsonError({ status: 404, code: "not_found", message: "Request not found.", retryable: false })

      const fromStatus = existing.status === "quoting" ? "quote_pending"
        : existing.status === "negotiating" ? "quoted"
        : existing.status === "pending_approvals" ? "approval_pending"
        : existing.status === "effective" ? "licensed"
        : existing.status

      if (!canTransitionLicenseRequest(fromStatus as any, transition.to_status))
        return jsonError({ status: 409, code: "invalid_transition", message: "Invalid request status transition.", retryable: false })

      const dbStatus =
        transition.to_status === "quote_pending" ? "quoting"
          : transition.to_status === "quoted" ? "negotiating"
          : transition.to_status === "approval_pending" ? "pending_approvals"
          : transition.to_status === "licensed" ? "effective"
          : transition.to_status

      const { data, error } = await supabase
        .from("music_license_requests")
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq("id", transition.request_id)
        .select("id, status")
        .single()
      if (error)
        return jsonError({ status: 500, code: "request_transition_failed", message: "Unable to update request.", retryable: true })
      return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER })
    }

    const payload = createSchema.parse(body)
    const classification = classifyLicenseRequest(payload.classification_facts)
    if (payload.classification_facts.isAiTraining && !flags.music_licensing_ai_enabled)
      return jsonError({ status: 403, code: "ai_licensing_disabled", message: "AI licensing requires separate opt-in flag.", retryable: false })

    const workflow = resolveWorkflowModule({
      families: classification.families,
      aiFlagEnabled: flags.music_licensing_ai_enabled,
    })
    if (workflow.blocked)
      return jsonError({ status: 403, code: "workflow_blocked", message: workflow.reason || "Workflow blocked.", retryable: false })

    const { data, error } = await supabase
      .from("music_license_requests")
      .insert({
        project_id: payload.project_id,
        brief_id: payload.brief_id,
        artist_music_id: payload.artist_music_id || null,
        classification: {
          facts: payload.classification_facts,
          families: classification.families,
          requiresManualReview: classification.requiresManualReview,
          reasons: classification.reasons,
        },
        classification_status: classification.requiresManualReview ? "counsel_review" : "classified",
        license_class: classification.families[0] || null,
        workflow_module: workflow.module,
        status: payload.submit ? "submitted" : "draft",
        created_by: user.id,
      })
      .select("id, public_id, status, classification_status, license_class, workflow_module")
      .single()

    if (error)
      return jsonError({ status: 500, code: "request_create_failed", message: "Unable to create request.", retryable: true })

    return NextResponse.json({
      data,
      classification,
      disclaimer: LICENSING_DISCLAIMER,
      note: "Classification required before quote/approval rules. A quote is not a licence.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid request payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "request_create_failed", message: "Unable to create request.", retryable: true })
  }
}
