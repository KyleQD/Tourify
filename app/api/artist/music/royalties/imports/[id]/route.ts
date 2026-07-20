import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_royalties_ingestion_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty imports are not available.", retryable: false })

  const { id } = await context.params
  const { data: batch, error } = await supabase
    .from("music_royalties_import_batches")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (error)
    return jsonError({ status: 500, code: "royalty_import_query_failed", message: "Unable to load import.", retryable: true })
  if (!batch)
    return jsonError({ status: 404, code: "import_not_found", message: "Import batch not found.", retryable: false })

  const { data: lines } = await supabase
    .from("music_royalties_normalized_lines")
    .select("id, match_status, currency, net_royalty_minor, isrc, usage_start, usage_end, matched_artist_music_id")
    .eq("import_batch_id", batch.id)
    .order("source_row_number", { ascending: true })
    .limit(500)

  const summary = {
    total_lines: lines?.length || 0,
    by_match_status: (lines || []).reduce((acc: Record<string, number>, line: any) => {
      acc[line.match_status] = (acc[line.match_status] || 0) + 1
      return acc
    }, {}),
  }

  return NextResponse.json({ data: { batch, lines: lines || [], summary }, enabled: true })
}
