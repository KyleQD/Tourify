import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { userCanAdminRoyaltiesOps } from "@/lib/music/royalties/royalties-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  if (!(await userCanAdminRoyaltiesOps(supabase, user.id)))
    return jsonError({
      status: 403,
      code: "admin_permission_required",
      message: "Music royalties admin permission is required.",
      retryable: false,
    })

  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_royalties_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty admin ops are not available.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const status = request.nextUrl.searchParams.get("status")
  let query = trusted
    .from("music_royalties_import_batches")
    .select("id, public_id, owner_user_id, provider, status, currency, period_start, period_end, source_total_minor, normalized_total_minor, dead_letter_reason, original_filename, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error)
    return jsonError({ status: 500, code: "admin_imports_query_failed", message: "Unable to load royalty imports.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
}
