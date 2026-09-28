import { NextRequest, NextResponse } from "next/server"

import { parseLogisticsOverviewQuery } from "@/lib/admin/logistics-overview"
import { loadAdminLogisticsOverview } from "@/lib/admin/logistics-overview.service"
import { authorizedOrgScopeErrorResponse } from "@/lib/admin/resolve-authorized-org"
import { withAdminCapability } from "@/lib/auth/api-auth"

export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { user, admin }) => {
    try {
      const query = parseLogisticsOverviewQuery(request.nextUrl.searchParams)
      const overview = await loadAdminLogisticsOverview({
        userId: user.id,
        orgId: admin.orgId,
        allowedTourIds: admin.scope === "tour_collaborator" ? admin.allowedTourIds : undefined,
        query,
      })
      return NextResponse.json({ success: true, data: overview })
    } catch (error) {
      const scopeResponse = authorizedOrgScopeErrorResponse(error)
      if (scopeResponse) return scopeResponse

      const status = error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : error instanceof Error && /not available to this admin account/i.test(error.message)
          ? 403
          : 500
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "logistics_overview_unavailable"
      const message = status >= 500
        ? "Unable to load the logistics overview."
        : error instanceof Error
          ? error.message
          : "Invalid logistics overview request."
      if (status >= 500) console.error("[Admin Logistics Overview]", error)
      return NextResponse.json({ success: false, error: message, code }, { status })
    }
  },
)

