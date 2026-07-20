import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_finance_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation finance is not available.", retryable: false })

  return NextResponse.json({
    data: [],
    note: "Dues and benefit flows remain blocked pending counsel and entity approvals.",
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "finance_blocked",
    message: "Federation dues/grants/benefits remain blocked without separate approvals.",
    retryable: false,
  })
}
