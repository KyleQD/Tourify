import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  documents: z.array(z.object({
    storage_path: z.string().min(1).max(500),
    sha256: z.string().length(64),
    classification: z.enum(["public_summary", "confidential", "mnpi", "counsel_only"]),
    document_version: z.number().int().positive().default(1),
  })).default([]),
  artist_music_ids: z.array(z.string().uuid()).default([]),
  rights_snapshot_ids: z.array(z.string()).default([]),
  royalty_snapshot_ids: z.array(z.string()).default([]),
  valuation_snapshot_ids: z.array(z.string()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_dataroom_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional data rooms are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: caseRow } = await supabase
      .from("music_institutional_transaction_cases")
      .select("id")
      .eq("id", payload.transaction_case_id)
      .eq("artist_user_id", user.id)
      .maybeSingle()
    if (!caseRow)
      return jsonError({ status: 404, code: "case_not_found", message: "Transaction case not found.", retryable: false })

    const catalogScopeHash = createHash("sha256")
      .update(JSON.stringify({
        artist_music_ids: payload.artist_music_ids,
        rights_snapshot_ids: payload.rights_snapshot_ids,
        royalty_snapshot_ids: payload.royalty_snapshot_ids,
        valuation_snapshot_ids: payload.valuation_snapshot_ids,
      }))
      .digest("hex")

    const deficiencyCodes: string[] = []
    if (!payload.rights_snapshot_ids.length) deficiencyCodes.push("rights_snapshot_missing")
    if (!payload.royalty_snapshot_ids.length) deficiencyCodes.push("royalty_snapshot_missing")
    if (!payload.valuation_snapshot_ids.length) deficiencyCodes.push("valuation_snapshot_missing")

    const { data: snapshot, error: snapError } = await supabase
      .from("music_institutional_catalog_snapshots")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        catalog_scope_hash: catalogScopeHash,
        artist_music_ids: payload.artist_music_ids,
        rights_snapshot_ids: payload.rights_snapshot_ids,
        royalty_snapshot_ids: payload.royalty_snapshot_ids,
        valuation_snapshot_ids: payload.valuation_snapshot_ids,
        deficiency_codes: deficiencyCodes,
      })
      .select("id, catalog_scope_hash, deficiency_codes")
      .single()
    if (snapError)
      return jsonError({ status: 500, code: "snapshot_create_failed", message: "Unable to create catalog snapshot.", retryable: true })

    const { data: room, error: roomError } = await supabase
      .from("music_institutional_data_rooms")
      .insert({ transaction_case_id: payload.transaction_case_id, status: "open" })
      .select("id, status")
      .single()
    if (roomError)
      return jsonError({ status: 500, code: "dataroom_create_failed", message: "Unable to create data room.", retryable: true })

    if (payload.documents.length) {
      await supabase.from("music_institutional_data_room_documents").insert(
        payload.documents.map((doc) => ({
          data_room_id: room.id,
          document_version: doc.document_version,
          storage_path: doc.storage_path,
          sha256: doc.sha256,
          classification: doc.classification,
        })),
      )
    }

    await supabase
      .from("music_institutional_transaction_cases")
      .update({ current_snapshot_id: snapshot.id, updated_at: new Date().toISOString() })
      .eq("id", payload.transaction_case_id)

    return NextResponse.json({ data: { room, snapshot } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid data room payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "dataroom_create_failed", message: "Unable to create data room.", retryable: true })
  }
}
