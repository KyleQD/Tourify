import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const { caseId } = await context.params
  const { data: certificationCase } = await supabase.from("music_certification_cases").select("id").eq("id", caseId).eq("user_id", user.id).maybeSingle()
  if (!certificationCase) return jsonError({ status: 404, code: "case_not_found", message: "Certification case not found." })
  const { data, error } = await supabase.from("music_certification_events").select("id, event_type, from_status, to_status, event_data, created_at")
    .eq("case_id", caseId).eq("artist_visible", true).order("created_at", { ascending: true })
  if (error) return jsonError({ status: 500, code: "events_query_failed", message: "Unable to load certification history.", retryable: true })
  return NextResponse.json({ data: data || [] })
}
