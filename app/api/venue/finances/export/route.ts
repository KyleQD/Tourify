import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import { getVenueFinanceSnapshot } from "@/lib/venue/finance-snapshot"
import { buildFinanceCsv } from "@/lib/venue/finance-service"

export const dynamic = "force-dynamic"

/**
 * VEN-170 — permission-safe CSV export of the recorded Venue ledger and
 * summary. Gated on export_finances (VEN-169); estimates are clearly labeled
 * as estimate rows, never as received money.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  let venueId = searchParams.get("venue_id")
  if (!venueId) {
    const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
    venueId = venue?.id || null
  }
  if (!venueId) return NextResponse.json({ error: "venue_id is required" }, { status: 400 })

  // Export is a finance authority distinct from plain visibility.
  const exportAccess = await canManageVenue(auth.supabase, auth.user.id, venueId, "export_finances")
  if (!exportAccess.allowed) {
    // Owners implicitly hold every permission; explicit denial message for delegates.
    return NextResponse.json({ error: "Export finances permission required" }, { status: 403 })
  }

  const service = createServiceRoleClient()
  try {
    const snapshot = await getVenueFinanceSnapshot(service as any, venueId)
    const csvRows = snapshot.transactions.filter((row) => row.source === "manual")
    const csv = buildFinanceCsv(csvRows, snapshot.summary)
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="venue-finance-${venueId.slice(0, 8)}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[venue-finances-export] failed:", error)
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 })
  }
}
