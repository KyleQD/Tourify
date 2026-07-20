import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  offering_version_id: z.string().uuid(),
  document_type: z.string().min(1).max(80),
  storage_path: z.string().min(1).max(500),
  sha256: z.string().length(64),
  visibility: z.enum(["data_room", "investor", "public_summary", "admin"]).default("data_room"),
  redaction_notes: z.string().max(2000).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_offerings_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Marketplace documents are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_marketplace_disclosure_documents")
      .insert({
        offering_version_id: payload.offering_version_id,
        document_type: payload.document_type,
        storage_path: payload.storage_path,
        sha256: payload.sha256,
        visibility: payload.visibility,
        redaction_notes: payload.redaction_notes || null,
      })
      .select("id, offering_version_id, document_type, sha256, visibility, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "document_create_failed", message: "Unable to register document.", retryable: true })

    await supabase.from("music_marketplace_document_access_logs").insert({
      document_id: data.id,
      actor_user_id: user.id,
      action: "register",
      metadata: { visibility: payload.visibility },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid document payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "document_create_failed", message: "Unable to register document.", retryable: true })
  }
}
