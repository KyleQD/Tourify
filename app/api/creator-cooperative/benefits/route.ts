import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.member_benefit_allocation_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Member benefit allocation is not available.",
      retryable: false,
    })

  return NextResponse.json({
    data: [],
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Benefit distribution remains blocked until tax/securities and entity approvals even when the readiness flag is on.",
  })
}


export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "benefits_blocked",
    message: "Benefit distributions remain blocked without tax/securities and entity approvals.",
    retryable: false,
  })
}
