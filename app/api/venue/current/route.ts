import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, venueId)

  if (!venue) {
    return NextResponse.json(
      { success: false, error: "No manageable venue found for this account." },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true, venue })
}
