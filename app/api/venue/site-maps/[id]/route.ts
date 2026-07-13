import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

function getSiteMapId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const siteMapId = getSiteMapId(request)
  const { data, error } = await auth.supabase
    .from("site_maps")
    .select(`
      *,
      zones:site_map_zones(*),
      tents:glamping_tents(*),
      elements:site_map_elements(*),
      layers:site_map_layers(*),
      measurements:site_map_measurements(*)
    `)
    .eq("id", siteMapId)
    .maybeSingle()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ success: false, error: "Site map not found" }, { status: 404 })

  return NextResponse.json({ success: true, data })
}
