import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { epkService } from "@/lib/services/epk.service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const profileId = request.nextUrl.searchParams.get("profileId")

    const data = await epkService.loadEPKData(
      user.id,
      profileId && profileId.length > 0 ? profileId : null,
      supabase
    )

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected artist EPK GET error", error)
    return jsonError({
      status: 500,
      code: "artist_epk_load_failed",
      message: "Failed to load EPK data",
      retryable: true,
    })
  }
}
